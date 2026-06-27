// readKnowledgeItem 集成测试（真跑：连 Supabase + ofox embedding）
//
// 跑法（需加载 web/.env.local）：
//   cd web && npx tsx --env-file=.env.local lib/agent/tools/__tests__/readKnowledgeItem.test.ts
//
// 用例：
//   1. 插 1 条 knowledge_item（question 真调 embedOne 生成向量）→ read 验 {question,answer,status,source}
//   2. read 不存在的 id → 断言抛 [NOT_FOUND]
//   3. read 同 id 但 replica 不匹配 → 也应 [NOT_FOUND]（隔离）
//   清理：删 test replica（cascade 删 knowledge_items）。
import { randomUUID } from 'node:crypto'

// 本地开发：若设置了 HTTP(S)_PROXY（如 clash），把 Node 全局 fetch 路由到代理。
// embedding 服务(ofox)在本地需走代理；Node 22 的 fetch 默认不读 proxy 环境变量。
const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY
if (proxyUrl) {
  const { setGlobalDispatcher, EnvHttpProxyAgent } = await import('undici')
  setGlobalDispatcher(new EnvHttpProxyAgent())
  console.log('[setup] 已启用 EnvHttpProxyAgent，代理 =', proxyUrl)
}

import { supabaseAdmin } from '../../../db/client'
import { insertRow } from '../../../db/queries'
import { embedOne } from '../../../llm/embedding'
import { makeReadKnowledgeItemTool } from '../readKnowledgeItem'
import type { AgentToolResult } from '@earendil-works/pi-agent-core'

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`断言失败: ${msg}`)
}

async function expectFail(code: string, fn: () => Promise<unknown>, label: string) {
  try {
    await fn()
  } catch (e) {
    const m = (e as Error).message
    assert(m.includes(`[${code}]`), `${label}：应抛 [${code}]，实际 = ${m}`)
    console.log(`[assert] ${label} ✓（抛 ${m}）`)
    return
  }
  throw new Error(`断言失败: ${label}：应抛 [${code}] 但未抛`)
}

async function main() {
  const replicaId = randomUUID()
  console.log('[setup] test replicaId =', replicaId)

  await insertRow('replicas', {
    id: replicaId,
    name: '测试·读条目',
    mis_id: `test-${replicaId.slice(0, 8)}`,
    role: '后端负责人',
  })

  try {
    // 1. 插 1 条 knowledge_item（question 真调 embedOne）
    const question = '灵犀服务怎么做灰度发布？'
    const answer = '先发 staging 验证，再按 5%/50%/100% 灰度，异常立即回滚。'
    const embedding = await embedOne(question)
    console.log('[ingest] embedOne 维度 =', embedding.length)
    const row = (await insertRow('knowledge_items', {
      replica_id: replicaId,
      question,
      answer,
      source: 'human',
      status: 'approved',
      embedding,
    })) as { id: string }
    console.log('[ingest] 插入 knowledge_item id =', row.id)

    const tool = makeReadKnowledgeItemTool({ replicaId, isOwner: false })

    // 用例 1：读已存在条目，验全文与结构
    const res = (await tool.execute!(
      'tc-1',
      { itemId: row.id },
      undefined as never,
      undefined,
    )) as AgentToolResult<{
      ok: boolean
      code: string
      data: { id: string; question: string; answer: string; status: string; source: string }
    }>

    const text = res.content.map((c) => (c.type === 'text' ? c.text : '')).join('\n')
    console.log('\n========== readKnowledgeItem 返回 ==========')
    console.log(text)
    console.log('[details]', JSON.stringify(res.details))
    console.log('========== /返回 ==========\n')

    assert(res.details.ok === true, 'details.ok 应为 true')
    assert(res.details.code === 'OK', 'details.code 应为 OK')
    const d = res.details.data
    assert(d.id === row.id, 'data.id 应等于插入的 id')
    assert(d.question === question, 'data.question 应回读一致')
    assert(d.answer === answer, 'data.answer 应回读一致')
    assert(d.status === 'approved', 'data.status 应为 approved')
    assert(d.source === 'human', 'data.source 应为 human')
    assert(text.includes(question) && text.includes(answer), '正文应含 question 与 answer')
    console.log('[assert] 用例1 读取回验 ✓')

    // 用例 2：读不存在的 id → NOT_FOUND
    await expectFail(
      'NOT_FOUND',
      () => tool.execute!('tc-2', { itemId: randomUUID() }, undefined as never, undefined),
      '用例2 读不存在 id',
    )

    // 用例 3：读他人 replica 的条目 → 也 NOT_FOUND（按 replica 隔离）
    const otherTool = makeReadKnowledgeItemTool({ replicaId: randomUUID(), isOwner: false })
    await expectFail(
      'NOT_FOUND',
      () => otherTool.execute!('tc-3', { itemId: row.id }, undefined as never, undefined),
      '用例3 跨 replica 读取',
    )

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
