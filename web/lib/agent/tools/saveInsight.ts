// saveInsight —— 写入类工具：把分身推理得出的结论沉淀为待审知识条目
// 场景：分身在对话中推理出一个值得复用的结论，落库 knowledge_items（source=reasoning,
//       status=pending_review），等主人复核后转 approved 进入知识库。
// 约定见 docs/技术/工具开发约定.md（§2 工厂签名 / §3 返回错误 / §4 写入用 insertRow）
import type { AgentTool } from '@earendil-works/pi-agent-core'
import { Type, type Static, okResult, fail, type ToolCtx } from './_shared'
import { insertRow } from '../../db/queries'
import { embedOne } from '../../llm/embedding'

const Params = Type.Object({
  question: Type.String({ description: '这条洞见回答的问题 / 适用场景' }),
  conclusion: Type.String({ description: '推理得出的结论（将作为答案存入）' }),
})

export function makeSaveInsightTool(ctx: ToolCtx): AgentTool<typeof Params> {
  return {
    name: 'save_insight',
    label: 'Save Insight',
    description:
      '把推理得出的结论沉淀为待审知识条目（source=reasoning, status=pending_review），供主人复核后入库。',
    parameters: Params,
    execute: async (_toolCallId, params: Static<typeof Params>) => {
      const question = params.question?.trim()
      const conclusion = params.conclusion?.trim()
      if (!question) fail('BAD_INPUT', 'question 不能为空')
      if (!conclusion) fail('BAD_INPUT', 'conclusion 不能为空')

      // embed(question + conclusion)：与检索侧对齐，问题+结论一起向量化
      let embedding: number[]
      try {
        embedding = await embedOne(`${question}\n${conclusion}`)
      } catch (e) {
        fail('EMBED_ERROR', `生成向量失败：${(e as Error).message}`)
      }

      try {
        const row = await insertRow('knowledge_items', {
          replica_id: ctx.replicaId,
          question,
          answer: conclusion,
          embedding,
          source: 'reasoning',
          status: 'pending_review',
        })
        return okResult(`已记录待审洞见（id: ${row.id}）。`, {
          id: row.id,
          status: 'pending_review',
        })
      } catch (e) {
        const msg = (e as Error).message
        // 外键缺失：replica 不存在
        if (/foreign key|violates foreign/i.test(msg)) {
          fail('NOT_FOUND', `分身不存在：${ctx.replicaId}`)
        }
        fail('DB_ERROR', `写入知识条目失败：${msg}`)
      }
    },
  }
}
