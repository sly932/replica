// saveQuestion 集成测试（真跑：连 Supabase + ofox embedding）
//
// 跑法（需加载 web/.env.local）：
//   cd web && npx tsx --env-file=.env.local lib/agent/tools/__tests__/saveQuestion.test.ts
//   （或 node --env-file=.env.local --import tsx/esm <file>）
//
// 覆盖用例：
//   1) 正常路径：execute({question}) → 返回 {ok:true, code:'OK', data:{id}}
//      → 回查 knowledge_items：source=human / status=pending_answer / embedding 非空(1536 维)
//   2) 错误路径 BAD_INPUT：question 为空白 → execute 抛 [BAD_INPUT]
//   清理：删 replica（cascade 删 knowledge_items）。
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
import { makeSaveQuestionTool } from '../saveQuestion'
import type { AgentToolResult } from '@earendil-works/pi-agent-core'

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`断言失败: ${msg}`)
}

// embedding 列经 supabase-js 取回可能是 number[] 或 "[..]" 字符串，统一成数组算长度
function embeddingLen(raw: unknown): number {
  if (Array.isArray(raw)) return raw.length
  if (typeof raw === 'string') {
    try {
      const arr = JSON.parse(raw)
      return Array.isArray(arr) ? arr.length : 0
    } catch {
      return 0
    }
  }
  return 0
}

async function main() {
  const replicaId = randomUUID()
  console.log('[setup] test replicaId =', replicaId)

  await insertRow('replicas', {
    id: replicaId,
    name: '测试·陈昊',
    mis_id: `test-${replicaId.slice(0, 8)}`,
    role: '后端负责人',
  })

  try {
    const tool = makeSaveQuestionTool({ replicaId, isOwner: false })

    // ===== 用例 1：正常路径 =====
    const question = '我们线上数据库的主从切换 RTO 目标是多少？'
    const res = (await tool.execute!(
      'tc-1',
      { question },
      undefined as never,
      undefined,
    )) as AgentToolResult<{ ok: boolean; code: string; data: { id: string } }>

    const text = res.content.map((c) => (c.type === 'text' ? c.text : '')).join('\n')
    console.log('\n========== saveQuestion 返回 ==========')
    console.log(text)
    console.log('[details]', JSON.stringify(res.details))
    console.log('========== /返回 ==========\n')

    assert(res.details.ok === true, 'details.ok 应为 true')
    assert(res.details.code === 'OK', 'details.code 应为 OK')
    assert(typeof res.details.data.id === 'string' && res.details.data.id, 'data.id 应为非空字符串')

    // 回查库
    const { data: row, error } = await supabaseAdmin
      .from('knowledge_items')
      .select('id, replica_id, question, source, status, embedding, deleted')
      .eq('id', res.details.data.id)
      .single()
    assert(!error, `回查 knowledge_items 不应报错: ${error?.message}`)
    assert(row, '应能查到刚写入的行')
    console.log('[db] row =', {
      ...row,
      embedding: `<len=${embeddingLen(row!.embedding)}>`,
    })

    assert(row!.replica_id === replicaId, 'replica_id 应隔离到本测试 replica')
    assert(row!.question === question, 'question 应原样写入')
    assert(row!.source === 'human', 'source 应为 human')
    assert(row!.status === 'pending_answer', 'status 应为 pending_answer')
    const len = embeddingLen(row!.embedding)
    assert(len === 1536, `embedding 应非空且为 1536 维，实际 ${len}`)
    console.log(`[assert] 用例1 通过 ✓ status=${row!.status} embeddingLen=${len}`)

    // ===== 用例 2：错误路径 BAD_INPUT（空 question）=====
    let threw = false
    let errMsg = ''
    try {
      await tool.execute!('tc-2', { question: '   ' }, undefined as never, undefined)
    } catch (e) {
      threw = true
      errMsg = (e as Error).message
    }
    assert(threw, '空 question 应 throw（pi 约定失败必须 throw）')
    assert(/^\[BAD_INPUT\]/.test(errMsg), `错误码应为 BAD_INPUT，实际: ${errMsg}`)
    console.log(`[assert] 用例2 通过 ✓ 抛出: ${errMsg}`)
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
