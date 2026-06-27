// RAG 层 —— Contextual Retrieval（分块 → 上下文化 → contextual embedding → 混合检索）
// 速查依据：docs/技术/技术架构.md §6.2；schema.sql（chunks/articles）；functions.sql（match_*）
//
// 流程：ingestArticle: 入 articles → chunkText 切块 → 每块 genContext（基于整篇文档生成
//   50-100 字上下文说明）→ embed(context + chunk_text) → 入 chunks。
// 检索：hybridSearch: embed(query) → 向量(matchChunks/matchKnowledge) + 关键词 → RRF → 结果。
import { embed, embedOne } from '../llm/embedding'
import {
  insertRow,
  matchChunks,
  matchKnowledge,
  keywordChunks,
  keywordKnowledge,
  rrfFuse,
  type ChunkHit,
  type KnowledgeHit,
} from '../db/queries'

const CHAT_BASE = process.env.CHAT_BASE_URL // https://api.ofox.ai/anthropic（不含 /v1）
const CHAT_KEY = process.env.CHAT_API_KEY
const SUMMARY_MODEL = process.env.SUMMARY_MODEL || 'anthropic/claude-haiku-4.5'

// ============================================================
// 1. 分块：按段落聚合到 ~500 字一块（段落边界优先，避免切碎句子）
// ============================================================
const CHUNK_TARGET = 500

export function chunkText(content: string, target = CHUNK_TARGET): string[] {
  const paras = content
    .split(/\n\s*\n/) // 空行分段
    .map((p) => p.trim())
    .filter(Boolean)

  const chunks: string[] = []
  let buf = ''
  for (const para of paras) {
    if (buf && buf.length + para.length + 1 > target) {
      chunks.push(buf)
      buf = ''
    }
    // 单段就超长：先冲掉 buf，再把长段按 target 硬切
    if (para.length > target) {
      if (buf) {
        chunks.push(buf)
        buf = ''
      }
      for (let i = 0; i < para.length; i += target) {
        chunks.push(para.slice(i, i + target))
      }
      continue
    }
    buf = buf ? `${buf}\n${para}` : para
  }
  if (buf) chunks.push(buf)
  return chunks
}

// ============================================================
// 2. genContext：基于整篇文档为单块生成上下文说明（ofox anthropic 非流式 /v1/messages）
//    用便宜的 SUMMARY_MODEL（haiku），x-api-key + anthropic-version 认证。
// ============================================================
export async function genContext(wholeDoc: string, chunk: string): Promise<string> {
  if (!CHAT_BASE || !CHAT_KEY) throw new Error('缺少 CHAT_BASE_URL / CHAT_API_KEY')

  const system =
    '你是文档检索的上下文标注助手。给定整篇文档与其中一个片段，' +
    '请输出一段 50-100 字的中文上下文说明，点明该片段在整篇文档中的位置、所属主题与关键指代，' +
    '以便该片段被单独检索时仍能被准确理解。只输出说明本身，不要复述片段原文，不要任何前后缀。'
  const userText = `<整篇文档>\n${wholeDoc}\n</整篇文档>\n\n<片段>\n${chunk}\n</片段>\n\n请输出该片段的上下文说明：`

  const res = await fetch(`${CHAT_BASE}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CHAT_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: SUMMARY_MODEL,
      max_tokens: 300,
      system,
      messages: [{ role: 'user', content: userText }],
    }),
  })
  if (!res.ok) {
    throw new Error(`genContext HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`)
  }
  const json = (await res.json()) as { content?: Array<{ type: string; text?: string }> }
  const text = (json.content ?? [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('')
    .trim()
  if (!text) throw new Error('genContext 返回空 content text')
  return text
}

// ============================================================
// 3. ingestArticle：文章入库 → 分块 → 上下文化 → 向量化 → chunks 入库
// ============================================================
export interface IngestResult {
  articleId: string
  chunkCount: number
}

export async function ingestArticle(
  replicaId: string,
  title: string,
  content: string,
  sourceUrl?: string,
): Promise<IngestResult> {
  // 3.1 入 articles
  const article = await insertRow('articles', {
    replica_id: replicaId,
    title,
    content,
    source_url: sourceUrl ?? null,
  })
  const articleId = article.id

  // 3.2 切块
  const pieces = chunkText(content)

  // 3.3 每块生成上下文说明（串行，避免打爆中转限流）
  const contexts: string[] = []
  for (const piece of pieces) {
    contexts.push(await genContext(content, piece))
  }

  // 3.4 contextual embedding：embed(context + chunk_text) 一起
  const inputs = pieces.map((p, i) => `${contexts[i]}\n\n${p}`)
  const vectors = await embed(inputs)

  // 3.5 入 chunks
  for (let i = 0; i < pieces.length; i++) {
    await insertRow('chunks', {
      article_id: articleId,
      replica_id: replicaId,
      chunk_text: pieces[i],
      context: contexts[i],
      embedding: vectors[i],
      idx: i,
    })
  }

  return { articleId, chunkCount: pieces.length }
}

// ============================================================
// 4. hybridSearch：向量(chunks∪knowledge) + 关键词 → RRF → 统一结果
// ============================================================
export type HybridResultType = 'chunk' | 'knowledge'
export interface HybridResult {
  type: HybridResultType
  summary: string // 简介：chunk.context / 知识条目的 question
  content: string // 正文：chunk_text / 知识条目的 answer
  id: string // chunk → 所属文档 article_id；knowledge → 条目 id
}

export async function hybridSearch(
  replicaId: string,
  query: string,
  topK = 6,
): Promise<HybridResult[]> {
  const queryEmbedding = await embedOne(query)

  // 四路召回（向量 chunk / 关键词 chunk / 向量 knowledge / 关键词 knowledge）
  const [vChunks, kChunks, vKnow, kKnow] = await Promise.all([
    matchChunks(replicaId, queryEmbedding, topK + 2),
    keywordChunks(replicaId, query, topK + 2),
    matchKnowledge(replicaId, queryEmbedding, topK + 2),
    keywordKnowledge(replicaId, query, topK + 2),
  ])

  // 用 type:id 作为 RRF 的统一 key，避免 chunk/knowledge id 撞车
  const keyOf = (type: HybridResultType, id: string) => `${type}:${id}`
  const meta = new Map<string, HybridResult>()

  for (const c of vChunks as ChunkHit[]) {
    meta.set(keyOf('chunk', c.id), {
      type: 'chunk',
      summary: c.context,
      content: c.chunk_text,
      id: c.article_id,
    })
  }
  for (const c of kChunks) {
    if (!meta.has(keyOf('chunk', c.id))) {
      meta.set(keyOf('chunk', c.id), {
        type: 'chunk',
        summary: c.context,
        content: c.chunk_text,
        id: c.article_id,
      })
    }
  }
  for (const k of vKnow as KnowledgeHit[]) {
    meta.set(keyOf('knowledge', k.id), {
      type: 'knowledge',
      summary: k.question,
      content: k.answer,
      id: k.id,
    })
  }
  for (const k of kKnow) {
    if (!meta.has(keyOf('knowledge', k.id))) {
      meta.set(keyOf('knowledge', k.id), {
        type: 'knowledge',
        summary: k.question,
        content: k.answer,
        id: k.id,
      })
    }
  }

  const fused = rrfFuse([
    vChunks.map((c) => keyOf('chunk', c.id)),
    kChunks.map((c) => keyOf('chunk', c.id)),
    vKnow.map((k) => keyOf('knowledge', k.id)),
    kKnow.map((k) => keyOf('knowledge', k.id)),
  ])

  return fused
    .map((f) => meta.get(f.id))
    .filter((r): r is HybridResult => r !== undefined)
    .slice(0, topK)
}
