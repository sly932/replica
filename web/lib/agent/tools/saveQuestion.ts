// saveQuestion —— 把「人类提出但分身当下答不了」的问题记下来，留待主人回答
// 写入 knowledge_items(source=human, status=pending_answer, embedding=embed(question))
// 约定见 docs/技术/工具开发约定.md；写入类工具用 insertRow + embedOne
import type { AgentTool } from '@earendil-works/pi-agent-core'
import { Type, type Static, okResult, fail, type ToolCtx } from './_shared'
import { insertRow } from '../../db/queries'
import { embedOne } from '../../llm/embedding'

const Params = Type.Object({
  question: Type.String({ description: '需要主人补充回答的问题（分身当下无法作答）' }),
})

export function makeSaveQuestionTool(ctx: ToolCtx): AgentTool<typeof Params> {
  return {
    name: 'save_question',
    label: 'Save Question',
    description:
      '当你遇到答不上来、知识库和记忆都没有依据、需要转给主人本人确认的问题时，调用此工具把该问题登记为「待回答」，' +
      '沉淀进飞轮等主人补充（source=human, status=pending_answer）。',
    parameters: Params,
    execute: async (_toolCallId, params: Static<typeof Params>) => {
      const question = params.question?.trim()
      if (!question) fail('BAD_INPUT', 'question 不能为空')

      let embedding: number[]
      try {
        embedding = await embedOne(question)
      } catch (e) {
        fail('EMBED_ERROR', `生成向量失败：${(e as Error).message}`)
      }

      let row: { id: string }
      try {
        row = await insertRow('knowledge_items', {
          replica_id: ctx.replicaId,
          question,
          source: 'human',
          status: 'pending_answer',
          embedding,
        })
      } catch (e) {
        fail('DB_ERROR', `登记问题失败：${(e as Error).message}`)
      }

      return okResult(`已登记问题，待主人回答。[id: ${row.id}]`, { id: row.id })
    },
  }
}
