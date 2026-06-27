// manageMemory —— 主人管理该分身的语义记忆（add / update / delete / list）
// 仅 isOwner 可用（装配层据 ctx.isOwner 决定是否挂载，这里再兜一道 FORBIDDEN）。
// add 前先 embed → matchMemories 查重：最高相似 > 0.9 视为业务失败 CONFLICT（不 throw，
//   返回 {ok:false,code:'CONFLICT',conflicts} 让 agent 转告主人），否则入库。
// 约定见 docs/技术/工具开发约定.md
import type { AgentTool } from '@earendil-works/pi-agent-core'
import { Type, type Static, okResult, fail, type ToolCtx } from './_shared'
import { embedOne } from '../../llm/embedding'
import {
  matchMemories,
  insertRow,
  updateRow,
  softDelete,
  getMemoryById,
  listMemories,
} from '../../db/queries'

const DEDUP_THRESHOLD = 0.9 // 最高相似 > 此值视为重复

const Params = Type.Object({
  type: Type.Union(
    [
      Type.Literal('add'),
      Type.Literal('update'),
      Type.Literal('delete'),
      Type.Literal('list'),
    ],
    { description: '操作类型：add 新增 / update 修改 / delete 软删 / list 列出全部' },
  ),
  content: Type.Optional(Type.String({ description: 'add/update 时的记忆正文' })),
  id: Type.Optional(Type.String({ description: 'update/delete 目标记忆 id' })),
})

export function makeManageMemoryTool(ctx: ToolCtx): AgentTool<typeof Params> {
  return {
    name: 'manage_memory',
    label: 'Manage Memory',
    description:
      '管理该分身的长期记忆（仅主人可用）：add 新增（自动查重）、update 修改、delete 软删、list 列出全部。',
    parameters: Params,
    execute: async (_toolCallId, params: Static<typeof Params>) => {
      // 非主人一律拒绝
      if (!ctx.isOwner) fail('FORBIDDEN', '仅主人可管理记忆')

      try {
        switch (params.type) {
          case 'add': {
            const content = params.content?.trim()
            if (!content) fail('BAD_INPUT', 'add 需要 content')

            // 查重：embed → 向量召回，最高相似 > 阈值则业务失败（不 throw）
            const embedding = await embedOne(content)
            const hits = await matchMemories(ctx.replicaId, embedding, 5)
            const top = hits[0]
            if (top && top.similarity > DEDUP_THRESHOLD) {
              const conflicts = hits
                .filter((h) => h.similarity > DEDUP_THRESHOLD)
                .map((h) => ({ id: h.id, content: h.content }))
              return {
                content: [
                  {
                    type: 'text',
                    text: `已存在高度相似的记忆，未新增。冲突项：${conflicts
                      .map((c) => `「${c.content}」[id: ${c.id}]`)
                      .join('；')}`,
                  },
                ],
                details: { ok: false, code: 'CONFLICT', conflicts },
              }
            }

            const row = await insertRow('memories', {
              replica_id: ctx.replicaId,
              kind: 'semantic',
              content,
              embedding,
              enabled: true,
            })
            return okResult(`已新增记忆[id: ${row.id}]：${content}`, { id: row.id, content })
          }

          case 'update': {
            const content = params.content?.trim()
            if (!params.id) fail('BAD_INPUT', 'update 需要 id')
            if (!content) fail('BAD_INPUT', 'update 需要 content')

            const existing = await getMemoryById(params.id)
            if (!existing || existing.replica_id !== ctx.replicaId || existing.deleted) {
              fail('NOT_FOUND', `记忆不存在或不属于该分身：${params.id}`)
            }

            const embedding = await embedOne(content)
            await updateRow('memories', params.id, { content, embedding })
            return okResult(`已更新记忆[id: ${params.id}]：${content}`, { id: params.id, content })
          }

          case 'delete': {
            if (!params.id) fail('BAD_INPUT', 'delete 需要 id')

            const existing = await getMemoryById(params.id)
            if (!existing || existing.replica_id !== ctx.replicaId || existing.deleted) {
              fail('NOT_FOUND', `记忆不存在或不属于该分身：${params.id}`)
            }

            await softDelete('memories', params.id)
            return okResult(`已删除记忆[id: ${params.id}]`, { id: params.id })
          }

          case 'list': {
            const rows = await listMemories(ctx.replicaId)
            const memories = rows.map((r) => ({ id: r.id, content: r.content }))
            const text =
              memories.length === 0
                ? '暂无记忆。'
                : memories.map((m, i) => `【${i + 1}】${m.content} [id: ${m.id}]`).join('\n')
            return okResult(text, { count: memories.length, memories })
          }
        }
      } catch (err) {
        // fail() 抛的 [CODE] msg 原样上抛；底层异常统一兜成 DB_ERROR
        const msg = err instanceof Error ? err.message : String(err)
        if (/^\[[A-Z_]+\]/.test(msg)) throw err
        fail('DB_ERROR', msg)
      }
    },
  }
}
