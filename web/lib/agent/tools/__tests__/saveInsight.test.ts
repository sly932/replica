// saveInsight 集成测试（真跑：连 Supabase + ofox embedding）
//
// 跑法（需加载 web/.env.local）：
//   cd web && npx tsx --env-file=.env.local lib/agent/tools/__tests__/saveInsight.test.ts
//
// 覆盖用例：
//   1. happy path：execute({question, conclusion}) → 落库 knowledge_items
//      → 回读断言 source=reasoning / status=pending_review / answer=conclusion，且返回 {ok,code,data}。
//   2. BAD_INPUT：question 为空 → throw [BAD_INPUT]。
//   3. BAD_INPUT：conclusion 为空 → throw [BAD_INPUT]。
//   4. NOT_FOUND：replica 不存在（外键违约）→ throw [NOT_FOUND]。
//   每个 case 用独立 replicaId 隔离；finally 删 test replica（cascade 清 knowledge_items）。
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
import { makeSaveInsightTool } from '../saveInsight'
import type { AgentToolResult } from '@earendil-works/pi-agent-core'

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`断言失败: ${msg}`)
}

// 跑 execute 并捕获 fail() 抛出的错误码（形如 "[CODE] msg"）。
async function expectFail(
  fn: () => Promise<unknown>,
  code: string,
  label: string,
): Promise<void> {
  let thrown: Error | null = null
  try {
    await fn()
  } catch (e) {
    thrown = e as Error
  }
  assert(thrown, `${label}: 应当 throw 而非正常返回`)
  assert(
    thrown!.message.includes(`[${code}]`),
    `${label}: 错误码应为 [${code}]，实际 = ${thrown!.message}`,
  )
  console.log(`[assert] ${label} → ${thrown!.message} ✓`)
}

async function withReplica<T>(fn: (replicaId: string) => Promise<T>): Promise<T> {
  const replicaId = randomUUID()
  await insertRow('replicas', {
    id: replicaId,
    name: '测试·洞见',
    mis_id: `test-${replicaId.slice(0, 8)}`,
    role: '后端负责人',
  })
  try {
    return await fn(replicaId)
  } finally {
    const { error } = await supabaseAdmin.from('replicas').delete().eq('id', replicaId)
    if (error) console.warn('[cleanup] 删除 test replica 失败:', error.message)
    else console.log('[cleanup] 已删除 test replica（cascade knowledge_items）')
  }
}

// ---- case 1: happy path ----
async function testHappyPath() {
  console.log('\n=== case 1: save → status=pending_review ===')
  await withReplica(async (replicaId) => {
    const tool = makeSaveInsightTool({ replicaId, isOwner: false })
    const question = '灵犀部署到生产前需要做什么？'
    const conclusion = '先在 staging 灰度验证 30 分钟，无异常再全量发布；发现问题立即回滚。'

    const res = (await tool.execute!(
      'tc-save-1',
      { question, conclusion },
      undefined as never,
      undefined,
    )) as AgentToolResult<{ ok: boolean; code: string; data: { id: string; status: string } }>

    const text = res.content.map((c) => (c.type === 'text' ? c.text : '')).join('\n')
    console.log('[tool text]', text)
    console.log('[details]', JSON.stringify(res.details))

    // 返回结构断言：{ok, code, data}
    assert(res.details.ok === true, 'details.ok 应为 true')
    assert(res.details.code === 'OK', 'details.code 应为 OK')
    assert(typeof res.details.data.id === 'string' && res.details.data.id, 'data.id 应为非空字符串')
    assert(res.details.data.status === 'pending_review', 'data.status 应为 pending_review')

    // 回读 DB 断言落库正确
    const { data: row, error } = await supabaseAdmin
      .from('knowledge_items')
      .select('id, replica_id, question, answer, source, status, embedding')
      .eq('id', res.details.data.id)
      .single()
    assert(!error, `回读应成功: ${error?.message}`)
    console.log('[db row]', JSON.stringify({
      replica_id: row!.replica_id,
      question: row!.question,
      answer: row!.answer,
      source: row!.source,
      status: row!.status,
      embedDim: typeof row!.embedding === 'string'
        ? JSON.parse(row!.embedding as string).length
        : (row!.embedding as number[])?.length,
    }))
    assert(row!.replica_id === replicaId, 'replica_id 应为本 case 的 replicaId')
    assert(row!.source === 'reasoning', 'source 应为 reasoning')
    assert(row!.status === 'pending_review', 'DB status 应为 pending_review')
    assert(row!.answer === conclusion, 'answer 应等于 conclusion')
    assert(row!.question === question, 'question 应原样落库')
    const dim = typeof row!.embedding === 'string'
      ? JSON.parse(row!.embedding as string).length
      : (row!.embedding as number[])?.length
    assert(dim === 1536, `embedding 维度应为 1536，实际 ${dim}`)
    console.log('[assert] case 1 全部通过 ✓')
  })
}

// ---- case 2/3: BAD_INPUT ----
async function testBadInput() {
  console.log('\n=== case 2/3: BAD_INPUT（空 question / 空 conclusion）===')
  await withReplica(async (replicaId) => {
    const tool = makeSaveInsightTool({ replicaId, isOwner: false })
    await expectFail(
      () => tool.execute!('tc-bad-q', { question: '  ', conclusion: '有结论' }, undefined as never, undefined),
      'BAD_INPUT',
      'case 2 空 question',
    )
    await expectFail(
      () => tool.execute!('tc-bad-c', { question: '有问题', conclusion: '' }, undefined as never, undefined),
      'BAD_INPUT',
      'case 3 空 conclusion',
    )
  })
}

// ---- case 4: NOT_FOUND（replica 不存在，外键违约）----
async function testNotFound() {
  console.log('\n=== case 4: NOT_FOUND（replica 不存在）===')
  const ghostId = randomUUID() // 不 insert，制造外键违约
  const tool = makeSaveInsightTool({ replicaId: ghostId, isOwner: false })
  await expectFail(
    () => tool.execute!('tc-404', { question: '问题', conclusion: '结论' }, undefined as never, undefined),
    'NOT_FOUND',
    'case 4 replica 不存在',
  )
}

async function main() {
  await testHappyPath()
  await testBadInput()
  await testNotFound()
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
