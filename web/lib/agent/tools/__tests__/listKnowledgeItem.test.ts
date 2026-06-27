// listKnowledgeItem 集成测试（真跑：连 Supabase）
//
// 跑法（需加载 web/.env.local）：
//   cd web && npx tsx --env-file=.env.local lib/agent/tools/__tests__/listKnowledgeItem.test.ts
//
// 用例：
//   1. 插 2 条未删 + 1 条已软删条目 → list 只返回 2 条，含 id/question/status
//   2. limit=1 → 只返回 1 条
//   3. 跨 replica 隔离 → 另一个 replica list 得到空清单
//   清理：删 test replica（cascade 删 knowledge_items）。
import { randomUUID } from 'node:crypto'

const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY
if (proxyUrl) {
  const { setGlobalDispatcher, EnvHttpProxyAgent } = await import('undici')
  setGlobalDispatcher(new EnvHttpProxyAgent())
  console.log('[setup] 已启用 EnvHttpProxyAgent，代理 =', proxyUrl)
}

import { supabaseAdmin } from '../../../db/client'
import { insertRow } from '../../../db/queries'
import { makeListKnowledgeItemTool } from '../listKnowledgeItem'
import type { AgentToolResult } from '@earendil-works/pi-agent-core'

type ListData = { count: number; items: { id: string; question: string | null; status: string }[] }
type ListResult = AgentToolResult<{ ok: boolean; code: string; data: ListData }>

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`断言失败: ${msg}`)
}

async function main() {
  const replicaId = randomUUID()
  console.log('[setup] test replicaId =', replicaId)

  await insertRow('replicas', {
    id: replicaId,
    name: '测试·listKnowledgeItem',
    mis_id: `test-${replicaId.slice(0, 8)}`,
    role: '后端负责人',
  })

  try {
    // 插 2 条未删（不同 status） + 1 条已软删（不应被列出）
    const k1 = (await insertRow('knowledge_items', {
      replica_id: replicaId,
      question: '灵犀怎么灰度发布？',
      answer: '按 5%/50%/100% 灰度。',
      source: 'human',
      status: 'approved',
      deleted: false,
    })) as { id: string }
    const k2 = (await insertRow('knowledge_items', {
      replica_id: replicaId,
      question: '回滚怎么操作？',
      answer: '一键回滚上个版本。',
      source: 'human',
      status: 'pending_review',
      deleted: false,
    })) as { id: string }
    await insertRow('knowledge_items', {
      replica_id: replicaId,
      question: '已删除的问题',
      answer: '不应出现。',
      source: 'human',
      status: 'approved',
      deleted: true,
    })

    const tool = makeListKnowledgeItemTool({ replicaId, isOwner: false })
    const call = (params: Record<string, unknown>) =>
      tool.execute!('tc', params as never, undefined as never, undefined) as Promise<ListResult>

    // 用例 1：默认列出全部未删
    const r1 = await call({})
    const text = r1.content.map((c) => (c.type === 'text' ? c.text : '')).join('\n')
    console.log('\n========== listKnowledgeItem 返回 ==========')
    console.log(text)
    console.log('[details]', JSON.stringify(r1.details))
    console.log('========== /返回 ==========\n')

    assert(r1.details.ok === true, 'details.ok 应为 true')
    const d1 = r1.details.data
    assert(d1.count === 2, `应只返回 2 条未删条目，实际 ${d1.count}`)
    const ids = d1.items.map((x) => x.id)
    assert(ids.includes(k1.id) && ids.includes(k2.id), '返回应含两条未删条目')
    assert(d1.items.every((x) => typeof x.question === 'string' && typeof x.status === 'string'), '每条应带 question 与 status')
    console.log('[assert] 用例1 列出未删条目 ✓')

    // 用例 2：limit=1
    const r2 = await call({ limit: 1 })
    assert(r2.details.data.count === 1, `limit=1 应只返回 1 条，实际 ${r2.details.data.count}`)
    console.log('[assert] 用例2 limit 生效 ✓')

    // 用例 3：跨 replica 隔离 → 空清单
    const otherTool = makeListKnowledgeItemTool({ replicaId: randomUUID(), isOwner: false })
    const r3 = (await otherTool.execute!(
      'tc-3',
      {} as never,
      undefined as never,
      undefined,
    )) as ListResult
    assert(r3.details.data.count === 0, '他人 replica 应得到空清单')
    console.log('[assert] 用例3 跨 replica 隔离 ✓')

    console.log('[assert] 全部通过 ✓')
  } finally {
    const { error } = await supabaseAdmin.from('replicas').delete().eq('id', replicaId)
    if (error) console.warn('[cleanup] 删除 test replica 失败:', error.message)
    else console.log('[cleanup] 已删除 test replica（cascade knowledge_items）')
  }
}

main()
  .then(() => {
    console.log('\nTEST PASSED ✅')
    process.exit(0)
  })
  .catch((e) => {
    console.error('\nTEST FAILED ❌\n', e)
    process.exit(1)
  })
