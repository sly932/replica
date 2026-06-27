// searchMemory —— 在该分身的「记忆」中检索（向量 + 关键词 → RRF）
// 召回 memories（enabled=true 且未软删）→ RRF 融合 → [{id, kind, content, similarity}]
// 速查依据：开发文档 §2.2；约定见 docs/技术/工具开发约定.md
import type { AgentTool } from '@earendil-works/pi-agent-core'
import { Type, type Static, okResult, fail, type ToolCtx } from './_shared'
import { embedOne } from '../../llm/embedding'
import { matchMemories, keywordMemories, rrfFuse } from '../../db/queries'

const Params = Type.Object({
  query: Type.String({ description: '检索关键词或问题' }),
  topK: Type.Optional(Type.Number({ description: '返回条数，默认 6', default: 6 })),
})

export interface MemoryResult {
  id: string
  kind: string
  content: string
  similarity: number // 向量召回的相似度；仅关键词命中时为 0
}

export function makeSearchMemoryTool(ctx: ToolCtx): AgentTool<typeof Params> {
  return {
    name: 'search_memory',
    label: 'Search Memory',
    description: '在该分身的记忆（启用且未删除）中检索相关内容，用于结合过往记忆作答。',
    parameters: Params,
    execute: async (_toolCallId, params: Static<typeof Params>) => {
      const query = params.query?.trim()
      if (!query) fail('BAD_INPUT', 'query 不能为空')
      const topK = params.topK ?? 6

      let queryEmbedding: number[]
      try {
        queryEmbedding = await embedOne(query)
      } catch (e) {
        fail('EMBED_ERROR', `向量化失败：${(e as Error).message}`)
      }

      let vMem: Awaited<ReturnType<typeof matchMemories>>
      let kMem: Awaited<ReturnType<typeof keywordMemories>>
      try {
        ;[vMem, kMem] = await Promise.all([
          matchMemories(ctx.replicaId, queryEmbedding, topK + 2),
          keywordMemories(ctx.replicaId, query, topK + 2),
        ])
      } catch (e) {
        fail('DB_ERROR', `记忆检索失败：${(e as Error).message}`)
      }

      // 向量召回带 similarity；关键词召回无 similarity，缺省 0
      const meta = new Map<string, MemoryResult>()
      for (const m of vMem) {
        meta.set(m.id, { id: m.id, kind: m.kind, content: m.content, similarity: m.similarity })
      }
      for (const m of kMem) {
        if (!meta.has(m.id)) {
          meta.set(m.id, { id: m.id, kind: m.kind, content: m.content, similarity: 0 })
        }
      }

      const fused = rrfFuse([vMem.map((m) => m.id), kMem.map((m) => m.id)])
      const results = fused
        .map((f) => meta.get(f.id))
        .filter((r): r is MemoryResult => r !== undefined)
        .slice(0, topK)

      if (results.length === 0) {
        return okResult('未检索到相关记忆。', { count: 0, results: [] })
      }

      const text = results
        .map((r, i) => `【${i + 1}】(${r.kind}) ${r.content}\n[id: ${r.id}]`)
        .join('\n---\n')

      return okResult(text, { count: results.length, results })
    },
  }
}
