// listKnowledge —— 列出该分身全部文档的 id 与 title（articles，status='enabled'）
// 场景：让分身先「看见」知识库里有哪些文档（清单），再决定用 read_document 读哪篇。
// 约定见 docs/技术/工具开发约定.md；结构照样板 searchKnowledge.ts。
import type { AgentTool } from '@earendil-works/pi-agent-core'
import { Type, type Static, okResult, fail, type ToolCtx } from './_shared'
import { supabaseAdmin } from '../../db/client'

const DEFAULT_LIMIT = 50

const Params = Type.Object({
  limit: Type.Optional(Type.Number({ description: `返回条数上限，默认 ${DEFAULT_LIMIT}` })),
})

export function makeListKnowledgeTool(ctx: ToolCtx): AgentTool<typeof Params> {
  return {
    name: 'list_knowledge',
    label: 'List Knowledge',
    description:
      '当你需要先了解自己有哪些文档（拿到清单和 id）再决定读哪篇时，调用此工具。' +
      '它列出你知识库里所有文档的 id 与标题（不含正文），随后用 read_document 按 id 读取需要的那篇。',
    parameters: Params,
    execute: async (_toolCallId, params: Static<typeof Params>) => {
      const limit = Math.min(200, Math.max(1, Math.floor(params.limit ?? DEFAULT_LIMIT)))

      const { data, error } = await supabaseAdmin
        .from('articles')
        .select('id, title')
        .eq('replica_id', ctx.replicaId)
        .eq('status', 'enabled')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) fail('DB_ERROR', `列出文档失败: ${error.message}`)

      const rows = (data ?? []) as { id: string; title: string | null }[]
      if (rows.length === 0) {
        return okResult('该分身暂无文档。', { count: 0, items: [] })
      }

      const text = rows
        .map((r, i) => `【${i + 1}】${r.title ?? '(无标题)'}\n[id: ${r.id}]`)
        .join('\n---\n')

      return okResult(text, { count: rows.length, items: rows })
    },
  }
}
