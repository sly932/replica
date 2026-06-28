// listKnowledgeItem —— 列出该分身全部知识条目的 id / question / status（knowledge_items，未软删）
// 场景：让分身先「看见」知识库里有哪些问答条目（清单），再决定用 read_knowledge_item 读哪条。
// 约定见 docs/技术/工具开发约定.md；结构照样板 searchKnowledge.ts。
import type { AgentTool } from '@earendil-works/pi-agent-core'
import { Type, type Static, okResult, fail, type ToolCtx } from './_shared'
import { supabaseAdmin } from '../../db/client'

const DEFAULT_LIMIT = 50

const Params = Type.Object({
  limit: Type.Optional(Type.Number({ description: `返回条数上限，默认 ${DEFAULT_LIMIT}` })),
})

export function makeListKnowledgeItemTool(ctx: ToolCtx): AgentTool<typeof Params> {
  return {
    name: 'list_knowledge_item',
    label: 'List Knowledge Item',
    description:
      '当你需要先了解有哪些已沉淀的知识条目时，调用此工具。' +
      '它列出你知识库里所有知识条目的 id、问题与状态（不含答案正文），随后用 read_knowledge_item 按 id 读取需要的那条。',
    parameters: Params,
    execute: async (_toolCallId, params: Static<typeof Params>) => {
      const limit = Math.min(200, Math.max(1, Math.floor(params.limit ?? DEFAULT_LIMIT)))

      const { data, error } = await supabaseAdmin
        .from('knowledge_items')
        .select('id, question, status')
        .eq('replica_id', ctx.replicaId)
        .eq('deleted', false)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) fail('DB_ERROR', `列出知识条目失败: ${error.message}`)

      const rows = (data ?? []) as { id: string; question: string | null; status: string }[]
      if (rows.length === 0) {
        return okResult('该分身暂无知识条目。', { count: 0, items: [] })
      }

      const text = rows
        .map((r, i) => `【${i + 1}】(${r.status}) ${r.question ?? '(空)'}\n[id: ${r.id}]`)
        .join('\n---\n')

      return okResult(text, { count: rows.length, items: rows })
    },
  }
}
