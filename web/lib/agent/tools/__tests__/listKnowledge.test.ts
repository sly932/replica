// listKnowledge 集成测试（真跑：连 Supabase）
//
// 跑法（需加载 web/.env.local）：
//   cd web && npx tsx --env-file=.env.local lib/agent/tools/__tests__/listKnowledge.test.ts
//
// 用例：
//   1. 插 2 篇 enabled + 1 篇非 enabled 文档 → list 只返回 2 篇，含 id/title
//   2. limit=1 → 只返回 1 条
//   3. 跨 replica 隔离 → 另一个 replica list 得到空清单
//   清理：删 test replica（cascade 删 articles）。
import { randomUUID } from 'node:crypto'

const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY
if (proxyUrl) {
  const { setGlobalDispatcher, EnvHttpProxyAgent } = await import('undici')
  setGlobalDispatcher(new EnvHttpProxyAgent())
  console.log('[setup] 已启用 EnvHttpProxyAgent，代理 =', proxyUrl)
}

import { supabaseAdmin } from '../../../db/client'
import { insertRow } from '../../../db/queries'
import { makeListKnowledgeTool } from '../listKnowledge'
import type { AgentToolResult } from '@earendil-works/pi-agent-core'

type ListData = { count: number; items: { id: string; title: string | null }[] }
type ListResult = AgentToolResult<{ ok: boolean; code: string; data: ListData }>

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`断言失败: ${msg}`)
}

async function main() {
  const replicaId = randomUUID()
  console.log('[setup] test replicaId =', replicaId)

  await insertRow('replicas', {
    id: replicaId,
    name: '测试·listKnowledge',
    mis_id: `test-${replicaId.slice(0, 8)}`,
    role: '后端负责人',
  })

  try {
    // 插 2 篇 enabled + 1 篇 archived（非 enabled，不应被列出）
    const a1 = (await insertRow('articles', {
      replica_id: replicaId,
      title: '灵犀部署手册',
      content: '部署相关内容。',
      status: 'enabled',
    })) as { id: string }
    const a2 = (await insertRow('articles', {
      replica_id: replicaId,
      title: '灵犀回滚指南',
      content: '回滚相关内容。',
      status: 'enabled',
    })) as { id: string }
    await insertRow('articles', {
      replica_id: replicaId,
      title: '已归档文档',
      content: '不应出现。',
      status: 'archived',
    })

    const tool = makeListKnowledgeTool({ replicaId, isOwner: false })
    const call = (params: Record<string, unknown>) =>
      tool.execute!('tc', params as never, undefined as never, undefined) as Promise<ListResult>

    // 用例 1：默认列出全部 enabled
    const r1 = await call({})
    const text = r1.content.map((c) => (c.type === 'text' ? c.text : '')).join('\n')
    console.log('\n========== listKnowledge 返回 ==========')
    console.log(text)
    console.log('[details]', JSON.stringify(r1.details))
    console.log('========== /返回 ==========\n')

    assert(r1.details.ok === true, 'details.ok 应为 true')
    const d1 = r1.details.data
    assert(d1.count === 2, `应只返回 2 篇 enabled，实际 ${d1.count}`)
    const ids = d1.items.map((x) => x.id)
    assert(ids.includes(a1.id) && ids.includes(a2.id), '返回应含两篇 enabled 文档')
    assert(d1.items.every((x) => typeof x.title === 'string'), '每条应带 title')
    console.log('[assert] 用例1 列出 enabled 文档 ✓')

    // 用例 2：limit=1
    const r2 = await call({ limit: 1 })
    assert(r2.details.data.count === 1, `limit=1 应只返回 1 条，实际 ${r2.details.data.count}`)
    console.log('[assert] 用例2 limit 生效 ✓')

    // 用例 3：跨 replica 隔离 → 空清单
    const otherTool = makeListKnowledgeTool({ replicaId: randomUUID(), isOwner: false })
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
    else console.log('[cleanup] 已删除 test replica（cascade articles）')
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
