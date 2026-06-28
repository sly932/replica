// readDocument —— 按 id 分页读取一篇文档原文（articles.content 切片）
// 用于 agent 在检索定位到某篇文档后，顺序翻阅其完整内容（单次 ≤ 2000 字）。
// 约定见 docs/技术/工具开发约定.md；结构照样板 searchKnowledge.ts。
import type { AgentTool } from '@earendil-works/pi-agent-core'
import { Type, type Static, okResult, fail, type ToolCtx } from './_shared'
import { getArticleById } from '../../db/queries'

const MAX_READ_LEN = 2000

const Params = Type.Object({
  docId: Type.String({ description: '文档 id（article_id，可由 search_knowledge 的 chunk 结果 id 得到）' }),
  curIdx: Type.Optional(Type.Number({ description: '起始字符偏移，默认 0' })),
  readLen: Type.Optional(Type.Number({ description: `本次读取字符数，默认 ${MAX_READ_LEN}，上限 ${MAX_READ_LEN}` })),
})

export function makeReadDocumentTool(ctx: ToolCtx): AgentTool<typeof Params> {
  return {
    name: 'read_document',
    label: 'Read Document',
    description:
      '当你通过 list_knowledge 或 search_knowledge 定位到某篇文档、需要读它的完整原文细节时，调用此工具分页读取。' +
      '单次最多 2000 字，配合 nextIdx/hasMore 翻页直到读完。',
    parameters: Params,
    execute: async (_toolCallId, params: Static<typeof Params>) => {
      try {
        const docId = params.docId?.trim()
        if (!docId) fail('BAD_INPUT', 'docId 不能为空')

        const curIdx = Math.max(0, Math.floor(params.curIdx ?? 0))
        const readLen = Math.min(MAX_READ_LEN, Math.max(1, Math.floor(params.readLen ?? MAX_READ_LEN)))

        const article = await getArticleById(docId)
        if (!article) fail('NOT_FOUND', `文档不存在：${docId}`)
        if (article.replica_id !== ctx.replicaId) fail('FORBIDDEN', '该文档不属于当前分身')

        const content = article.content ?? ''
        const total = content.length
        const text = content.slice(curIdx, curIdx + readLen)
        const nextIdx = curIdx + text.length
        const hasMore = nextIdx < total

        return okResult(text, { text, nextIdx, hasMore, total })
      } catch (e) {
        // fail() 抛出的已带 [CODE] 前缀，原样上抛；其余视为底层（多为 DB）异常。
        if (e instanceof Error && /^\[[A-Z_]+\]/.test(e.message)) throw e
        fail('DB_ERROR', `读取文档失败：${e instanceof Error ? e.message : String(e)}`)
      }
    },
  }
}
