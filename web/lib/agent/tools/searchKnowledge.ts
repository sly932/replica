// searchKnowledge —— 样板工具（后续 7 个工具照此写）
// 通用场景：向量+关键词同时召回「文档块 ∪ 知识条目」→ RRF → [type, 简介, 内容, id]
// 速查依据：开发文档 §2.2；约定见 docs/技术/工具开发约定.md
import type { AgentTool } from '@earendil-works/pi-agent-core'
import { Type, type Static, okResult, fail, type ToolCtx } from './_shared'
import { hybridSearch } from '../../rag'

const Params = Type.Object({
  query: Type.String({ description: '检索关键词或问题' }),
  topK: Type.Optional(Type.Number({ description: '返回条数，默认 6', default: 6 })),
})

export function makeSearchKnowledgeTool(ctx: ToolCtx): AgentTool<typeof Params> {
  return {
    name: 'search_knowledge',
    label: 'Search Knowledge',
    description: '在该分身的知识库（文档块 + 知识条目）中检索相关内容，用于回答问题前取证。',
    parameters: Params,
    execute: async (_toolCallId, params: Static<typeof Params>) => {
      const query = params.query?.trim()
      if (!query) fail('BAD_INPUT', 'query 不能为空')

      const results = await hybridSearch(ctx.replicaId, query, params.topK ?? 6)

      if (results.length === 0) {
        return okResult('未检索到相关内容。', { count: 0, results: [] })
      }

      // 给模型看的正文：分条列出 type / 简介 / 内容 / id
      const text = results
        .map(
          (r, i) =>
            `【${i + 1}】(${r.type}) ${r.summary}\n${r.content}\n[id: ${r.id}]`,
        )
        .join('\n---\n')

      return okResult(text, { count: results.length, results })
    },
  }
}
