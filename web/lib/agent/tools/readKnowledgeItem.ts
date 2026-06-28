// readKnowledgeItem —— 按 id 读取单条知识条目全文
// 场景：search_knowledge 命中后拿到 id，再 read 取 {question,answer,status,source} 全文取证
// 约定见 docs/技术/工具开发约定.md
import type { AgentTool } from '@earendil-works/pi-agent-core'
import { Type, type Static, okResult, fail, type ToolCtx } from './_shared'
import { supabaseAdmin } from '../../db/client'

const Params = Type.Object({
  itemId: Type.String({ description: '知识条目 id（来自 search_knowledge 结果）' }),
})

export function makeReadKnowledgeItemTool(ctx: ToolCtx): AgentTool<typeof Params> {
  return {
    name: 'read_knowledge_item',
    label: 'Read Knowledge Item',
    description:
      '当你需要读取某条知识条目的完整问答内容时，按 id 调用此工具，' +
      '取回该条目的全文（问题/答案/状态/来源）作为作答依据。',
    parameters: Params,
    execute: async (_toolCallId, params: Static<typeof Params>) => {
      const itemId = params.itemId?.trim()
      if (!itemId) fail('BAD_INPUT', 'itemId 不能为空')

      const { data, error } = await supabaseAdmin
        .from('knowledge_items')
        .select('id, question, answer, status, source')
        .eq('id', itemId)
        .eq('replica_id', ctx.replicaId)
        .eq('deleted', false)
        .maybeSingle()

      if (error) fail('DB_ERROR', `读取知识条目失败: ${error.message}`)
      if (!data) fail('NOT_FOUND', `未找到知识条目: ${itemId}`)

      const text =
        `问题：${data.question ?? '(空)'}\n` +
        `答案：${data.answer ?? '(空)'}\n` +
        `状态：${data.status}　来源：${data.source ?? '(未知)'}\n` +
        `[id: ${data.id}]`

      return okResult(text, data)
    },
  }
}
