// searchConversation —— 在该分身的历史会话摘要里检索（向量 + 关键词 → RRF）
// 支持时间窗（after/before），用于「上次/那天我们聊过什么」之类的回忆类提问。
// 约定见 docs/技术/工具开发约定.md；样板见 searchKnowledge.ts。
import type { AgentTool } from '@earendil-works/pi-agent-core'
import { Type, type Static, okResult, fail, type ToolCtx } from './_shared'
import { embedOne } from '../../llm/embedding'
import {
  matchConversations,
  keywordConversations,
  rrfFuse,
  type ConversationHit,
} from '../../db/queries'

const Params = Type.Object({
  query: Type.String({ description: '检索关键词或问题' }),
  after: Type.Optional(Type.String({ description: '仅检索此时间之后的会话（ISO 8601）' })),
  before: Type.Optional(Type.String({ description: '仅检索此时间之前的会话（ISO 8601）' })),
  limit: Type.Optional(Type.Number({ description: '返回条数，默认 5', default: 5 })),
})

type ConvResult = Pick<ConversationHit, 'id' | 'summary' | 'created_at'>

export function makeSearchConversationTool(ctx: ToolCtx): AgentTool<typeof Params> {
  return {
    name: 'search_conversation',
    label: 'Search Conversation',
    description:
      '当对方提到、涉及之前聊过的内容或某次历史会话时，调用此工具检索你的过往对话摘要。' +
      '支持按时间窗（after/before）过滤，用于回忆「上次/那天我们聊了什么」。',
    parameters: Params,
    execute: async (_toolCallId, params: Static<typeof Params>) => {
      const query = params.query?.trim()
      if (!query) fail('BAD_INPUT', 'query 不能为空')

      const after = params.after?.trim() || undefined
      const before = params.before?.trim() || undefined
      // ISO 校验：非法时间直接拒绝，避免静默查空
      for (const [label, v] of [['after', after], ['before', before]] as const) {
        if (v && Number.isNaN(Date.parse(v))) fail('BAD_INPUT', `${label} 不是合法 ISO 时间：${v}`)
      }

      const limit = params.limit ?? 5

      try {
        const queryEmbedding = await embedOne(query)

        // 两路召回：向量（带时间窗）+ 关键词（summary）
        const [vConv, kConvRaw] = await Promise.all([
          matchConversations(ctx.replicaId, queryEmbedding, limit + 2, { after, before }),
          keywordConversations(ctx.replicaId, query, limit + 2),
        ])

        // 关键词路在 SQL 不带时间窗，这里手动按同一时间窗过滤，保持一致
        const kConv = kConvRaw.filter((c) => {
          const t = Date.parse(c.created_at)
          if (after && t < Date.parse(after)) return false
          if (before && t > Date.parse(before)) return false
          return true
        })

        const meta = new Map<string, ConvResult>()
        for (const c of vConv) meta.set(c.id, { id: c.id, summary: c.summary, created_at: c.created_at })
        for (const c of kConv) {
          if (!meta.has(c.id)) meta.set(c.id, { id: c.id, summary: c.summary, created_at: c.created_at })
        }

        const fused = rrfFuse([vConv.map((c) => c.id), kConv.map((c) => c.id)])
        const results = fused
          .map((f) => meta.get(f.id))
          .filter((r): r is ConvResult => r !== undefined)
          .slice(0, limit)

        if (results.length === 0) {
          return okResult('未检索到相关会话。', { count: 0, results: [] })
        }

        const text = results
          .map((r, i) => `【${i + 1}】(${r.created_at}) ${r.summary}\n[id: ${r.id}]`)
          .join('\n---\n')

        return okResult(text, { count: results.length, results })
      } catch (e) {
        if (e instanceof Error && /^\[[A-Z_]+\]/.test(e.message)) throw e // 已是约定错误，原样抛
        const msg = e instanceof Error ? e.message : String(e)
        fail('DB_ERROR', `会话检索失败：${msg}`)
      }
    },
  }
}
