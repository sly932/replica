// 数据访问层 —— 向量检索(RPC) + 关键词检索(pg_trgm) + RRF 融合 + CRUD helpers
// 速查依据：lib/db/functions.sql（RPC match_*）、schema.sql（pg_trgm gin 索引）
// 设计：lib 不 import next/*，可拆独立服务（见开发文档 §5）。
import { supabaseAdmin } from './client'

// ============================================================
// 1. 向量检索（统一走 functions.sql 里的 RPC；supabase-js 不能直接做 pgvector 查询）
// ============================================================

export interface ChunkHit {
  id: string
  article_id: string
  chunk_text: string
  context: string
  similarity: number
}
export async function matchChunks(
  replicaId: string,
  queryEmbedding: number[],
  matchCount = 8,
): Promise<ChunkHit[]> {
  const { data, error } = await supabaseAdmin.rpc('match_chunks', {
    p_replica_id: replicaId,
    query_embedding: queryEmbedding,
    match_count: matchCount,
  })
  if (error) throw new Error(`match_chunks 失败: ${error.message}`)
  return (data ?? []) as ChunkHit[]
}

// 方案B 检索：只搜「分身引用的文档」(article_ids) 的 chunks；一篇文档全局只一份向量。
export async function matchChunksByArticles(
  articleIds: string[],
  queryEmbedding: number[],
  matchCount = 8,
): Promise<ChunkHit[]> {
  if (articleIds.length === 0) return []
  const { data, error } = await supabaseAdmin.rpc('match_chunks_by_articles', {
    p_article_ids: articleIds,
    query_embedding: queryEmbedding,
    match_count: matchCount,
  })
  if (error) throw new Error(`match_chunks_by_articles 失败: ${error.message}`)
  return (data ?? []) as ChunkHit[]
}

export interface KnowledgeHit {
  id: string
  question: string
  answer: string
  status: string
  similarity: number
}
export async function matchKnowledge(
  replicaId: string,
  queryEmbedding: number[],
  matchCount = 8,
): Promise<KnowledgeHit[]> {
  const { data, error } = await supabaseAdmin.rpc('match_knowledge', {
    p_replica_id: replicaId,
    query_embedding: queryEmbedding,
    match_count: matchCount,
  })
  if (error) throw new Error(`match_knowledge 失败: ${error.message}`)
  return (data ?? []) as KnowledgeHit[]
}

export interface MemoryHit {
  id: string
  kind: string
  content: string
  similarity: number
}
export async function matchMemories(
  replicaId: string,
  queryEmbedding: number[],
  matchCount = 8,
  kind?: 'semantic' | 'episodic',
): Promise<MemoryHit[]> {
  const { data, error } = await supabaseAdmin.rpc('match_memories', {
    p_replica_id: replicaId,
    query_embedding: queryEmbedding,
    match_count: matchCount,
    p_kind: kind ?? null,
  })
  if (error) throw new Error(`match_memories 失败: ${error.message}`)
  return (data ?? []) as MemoryHit[]
}

export interface ConversationHit {
  id: string
  summary: string
  created_at: string
  similarity: number
}
export async function matchConversations(
  replicaId: string,
  queryEmbedding: number[],
  matchCount = 5,
  opts?: { after?: string; before?: string },
): Promise<ConversationHit[]> {
  const { data, error } = await supabaseAdmin.rpc('match_conversations', {
    p_replica_id: replicaId,
    query_embedding: queryEmbedding,
    match_count: matchCount,
    p_after: opts?.after ?? null,
    p_before: opts?.before ?? null,
  })
  if (error) throw new Error(`match_conversations 失败: ${error.message}`)
  return (data ?? []) as ConversationHit[]
}

// ============================================================
// 2. 关键词检索（pg_trgm：对建了 gin_trgm 索引的列做 ilike）
//    query 按空白切词，多词之间 OR；中文单词组当作一个 term。
//    best-effort 召回，与向量结果在上层做 RRF 融合。
// ============================================================

function buildOrIlike(column: string, query: string): string | null {
  const terms = query.split(/\s+/).map((t) => t.trim()).filter(Boolean)
  if (terms.length === 0) return null
  // PostgREST .or 语法：col.ilike.*term*,col.ilike.*term2*
  return terms.map((t) => `${column}.ilike.*${t}*`).join(',')
}

// 方案B：chunks 全局，按「分身引用的文档」(article_ids) 过滤而非 replica_id。
export async function keywordChunks(
  articleIds: string[],
  query: string,
  limit = 8,
): Promise<Pick<ChunkHit, 'id' | 'article_id' | 'chunk_text' | 'context'>[]> {
  if (articleIds.length === 0) return []
  const or = buildOrIlike('context', query)
  if (!or) return []
  const { data, error } = await supabaseAdmin
    .from('chunks')
    .select('id, article_id, chunk_text, context')
    .in('article_id', articleIds)
    .or(or)
    .limit(limit)
  if (error) throw new Error(`keywordChunks 失败: ${error.message}`)
  return data ?? []
}

export async function keywordKnowledge(
  replicaId: string,
  query: string,
  limit = 8,
): Promise<Pick<KnowledgeHit, 'id' | 'question' | 'answer' | 'status'>[]> {
  const or = buildOrIlike('question', query)
  if (!or) return []
  const { data, error } = await supabaseAdmin
    .from('knowledge_items')
    .select('id, question, answer, status')
    .eq('replica_id', replicaId)
    .eq('deleted', false)
    .eq('status', 'approved')
    .eq('enabled', true) // 关闭(enabled=false)的条目不参与检索
    .or(or)
    .limit(limit)
  if (error) throw new Error(`keywordKnowledge 失败: ${error.message}`)
  return data ?? []
}

export async function keywordMemories(
  replicaId: string,
  query: string,
  limit = 8,
): Promise<Pick<MemoryHit, 'id' | 'kind' | 'content'>[]> {
  const or = buildOrIlike('content', query)
  if (!or) return []
  const { data, error } = await supabaseAdmin
    .from('memories')
    .select('id, kind, content')
    .eq('replica_id', replicaId)
    .eq('enabled', true)
    .eq('deleted', false)
    .or(or)
    .limit(limit)
  if (error) throw new Error(`keywordMemories 失败: ${error.message}`)
  return data ?? []
}

export async function keywordConversations(
  replicaId: string,
  query: string,
  limit = 5,
): Promise<Pick<ConversationHit, 'id' | 'summary' | 'created_at'>[]> {
  const or = buildOrIlike('summary', query)
  if (!or) return []
  const { data, error } = await supabaseAdmin
    .from('conversations')
    .select('id, summary, created_at')
    .eq('replica_id', replicaId)
    .or(or)
    .limit(limit)
  if (error) throw new Error(`keywordConversations 失败: ${error.message}`)
  return data ?? []
}

// ============================================================
// 3. RRF 融合（Reciprocal Rank Fusion）
//    多路有序结果按 id 合并：score(id) = Σ 1/(k + rank)，rank 从 1 起。
//    k 默认 60（经典取值）。返回按融合分降序的 id 列表。
// ============================================================

export function rrfFuse(rankedLists: string[][], k = 60): { id: string; score: number }[] {
  const scores = new Map<string, number>()
  for (const list of rankedLists) {
    list.forEach((id, i) => {
      const rank = i + 1
      scores.set(id, (scores.get(id) ?? 0) + 1 / (k + rank))
    })
  }
  return [...scores.entries()]
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score)
}

// ============================================================
// 4. CRUD helpers（insert / update / softDelete）
//    薄封装 supabase-js，统一抛错；soft delete 即 set deleted=true。
// ============================================================

export async function insertRow<T extends Record<string, unknown>>(
  table: string,
  row: T,
): Promise<{ id: string } & Record<string, unknown>> {
  const { data, error } = await supabaseAdmin.from(table).insert(row).select().single()
  if (error) throw new Error(`insert ${table} 失败: ${error.message}`)
  return data as { id: string } & Record<string, unknown>
}

// 按 id 取单篇 article（readDocument 用）；不存在返回 null，由调用方决定 NOT_FOUND。
export interface ArticleRow {
  id: string
  replica_id: string
  title: string | null
  content: string | null
  status: string
}
export async function getArticleById(id: string): Promise<ArticleRow | null> {
  const { data, error } = await supabaseAdmin
    .from('articles')
    .select('id, replica_id, title, content, status')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(`getArticleById 失败: ${error.message}`)
  return (data as ArticleRow) ?? null
}

// 批量按 id 取文档标题（search_knowledge 给 chunk 结果补标题用）→ { id: title }
export async function articleTitlesByIds(ids: string[]): Promise<Record<string, string>> {
  if (ids.length === 0) return {}
  const { data, error } = await supabaseAdmin
    .from('articles')
    .select('id, title')
    .in('id', ids)
  if (error) throw new Error(`articleTitlesByIds 失败: ${error.message}`)
  const map: Record<string, string> = {}
  for (const r of data ?? []) map[r.id as string] = (r.title as string) || ''
  return map
}

export async function updateRow(
  table: string,
  id: string,
  patch: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { data, error } = await supabaseAdmin.from(table).update(patch).eq('id', id).select().single()
  if (error) throw new Error(`update ${table} 失败: ${error.message}`)
  return data as Record<string, unknown>
}

// 软删除：set deleted=true（仅 memories / knowledge_items 有 deleted 列）。
export async function softDelete(table: string, id: string): Promise<void> {
  const { error } = await supabaseAdmin.from(table).update({ deleted: true }).eq('id', id)
  if (error) throw new Error(`softDelete ${table} 失败: ${error.message}`)
}

// ============================================================
// 5. memories helpers（manageMemory 用：按 id 取单条 / 列出全部 enabled）
// ============================================================
export interface MemoryRow {
  id: string
  replica_id: string
  kind: string
  content: string
  enabled: boolean
  deleted: boolean
}

// 按 id 取单条 memory（manageMemory update/delete 的归属与存在性校验用）；不存在返回 null。
export async function getMemoryById(id: string): Promise<MemoryRow | null> {
  const { data, error } = await supabaseAdmin
    .from('memories')
    .select('id, replica_id, kind, content, enabled, deleted')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(`getMemoryById 失败: ${error.message}`)
  return (data as MemoryRow) ?? null
}

// 列出该分身全部「enabled 且未软删」的 memory（manageMemory list 用），按创建时间倒序。
export async function listMemories(replicaId: string): Promise<MemoryRow[]> {
  const { data, error } = await supabaseAdmin
    .from('memories')
    .select('id, replica_id, kind, content, enabled, deleted')
    .eq('replica_id', replicaId)
    .eq('enabled', true)
    .eq('deleted', false)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`listMemories 失败: ${error.message}`)
  return (data ?? []) as MemoryRow[]
}
