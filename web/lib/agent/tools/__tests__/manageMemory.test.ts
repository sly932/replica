// manageMemory 集成测试（真跑：连 Supabase + ofox embedding）
//
// 跑法（需加载 web/.env.local）：
//   cd web && npx tsx --env-file=.env.local lib/agent/tools/__tests__/manageMemory.test.ts
//   （或 node --env-file=.env.local --import tsx/esm <file>）
//
// 覆盖用例（仅 isOwner 可用）：
//   1) add 正常路径    → {ok:true, code:'OK', data:{id, content}}，回库校验 enabled/kind
//   2) list            → 含刚 add 的记忆
//   3) add 近似重复     → 业务失败 {ok:false, code:'CONFLICT', conflicts:[{id,content}]}（不 throw）
//   4) update(id,content) → {ok:true}，回库校验 content 改写 + embedding 重算(1536 维)
//   5) delete(id)      → {ok:true} 软删
//   6) list            → 验软删（已删 id 不再出现）
//   错误路径：
//   7) FORBIDDEN  非主人调用 → throw [FORBIDDEN]
//   8) NOT_FOUND  delete 不存在 id → throw [NOT_FOUND]
//   9) BAD_INPUT  add 空 content → throw [BAD_INPUT]
//   清理：删 replica（cascade 删 memories）。
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
import { makeManageMemoryTool } from '../manageMemory'
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

type Details = { ok: boolean; code: string; data?: any; conflicts?: any[] }
function detailsOf(res: AgentToolResult<Details>): Details {
  return res.details as Details
}
function textOf(res: AgentToolResult<Details>): string {
  return res.content.map((c) => (c.type === 'text' ? c.text : '')).join('\n')
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
    const tool = makeManageMemoryTool({ replicaId, isOwner: true })

    // ===== 用例 1：add 正常路径 =====
    const content1 = '主人喜欢在周五下午做 code review，并且偏好简洁的 commit message。'
    const addRes = (await tool.execute!(
      'tc-add',
      { type: 'add', content: content1 },
      undefined as never,
      undefined,
    )) as AgentToolResult<Details>
    console.log('\n========== add 返回 ==========')
    console.log(textOf(addRes))
    console.log('[details]', JSON.stringify(detailsOf(addRes)))

    const addD = detailsOf(addRes)
    assert(addD.ok === true, 'add details.ok 应为 true')
    assert(addD.code === 'OK', 'add details.code 应为 OK')
    const memId = addD.data.id as string
    assert(typeof memId === 'string' && memId, 'add 应返回非空 data.id')

    // 回库校验
    const { data: row1 } = await supabaseAdmin
      .from('memories')
      .select('id, replica_id, kind, content, enabled, deleted, embedding')
      .eq('id', memId)
      .single()
    assert(row1!.replica_id === replicaId, 'replica_id 应隔离到本测试 replica')
    assert(row1!.kind === 'semantic', 'kind 应为 semantic')
    assert(row1!.enabled === true && row1!.deleted === false, '应 enabled 且未软删')
    assert(embeddingLen(row1!.embedding) === 1536, 'embedding 应为 1536 维')
    console.log(`[assert] 用例1 add 通过 ✓ id=${memId} kind=${row1!.kind}`)

    // ===== 用例 2：list 含刚 add =====
    const listRes1 = (await tool.execute!(
      'tc-list1',
      { type: 'list' },
      undefined as never,
      undefined,
    )) as AgentToolResult<Details>
    const listD1 = detailsOf(listRes1)
    assert(listD1.ok === true, 'list details.ok 应为 true')
    assert(listD1.data.count === 1, `list 应有 1 条，实际 ${listD1.data.count}`)
    assert(
      listD1.data.memories.some((m: any) => m.id === memId),
      'list 应包含刚 add 的记忆',
    )
    console.log(`[assert] 用例2 list 通过 ✓ count=${listD1.data.count}`)

    // ===== 用例 3：add 近似重复 → CONFLICT（业务失败，不 throw）=====
    const contentDup = '主人喜欢在周五下午进行 code review，偏好简洁的 commit message。'
    const dupRes = (await tool.execute!(
      'tc-dup',
      { type: 'add', content: contentDup },
      undefined as never,
      undefined,
    )) as AgentToolResult<Details>
    console.log('\n========== add(重复) 返回 ==========')
    console.log(textOf(dupRes))
    console.log('[details]', JSON.stringify(detailsOf(dupRes)))

    const dupD = detailsOf(dupRes)
    assert(dupD.ok === false, 'CONFLICT 时 details.ok 应为 false')
    assert(dupD.code === 'CONFLICT', `应返回 CONFLICT，实际 ${dupD.code}`)
    assert(Array.isArray(dupD.conflicts) && dupD.conflicts.length > 0, 'conflicts 应非空')
    assert(
      dupD.conflicts!.some((c: any) => c.id === memId),
      'conflicts 应含已存在的相似记忆 id',
    )
    // 确认重复项未真正写入：库里仍只有 1 条
    const { count: cntAfterDup } = await supabaseAdmin
      .from('memories')
      .select('id', { count: 'exact', head: true })
      .eq('replica_id', replicaId)
      .eq('enabled', true)
      .eq('deleted', false)
    assert(cntAfterDup === 1, `CONFLICT 不应写入新记忆，库里应仍为 1 条，实际 ${cntAfterDup}`)
    console.log(`[assert] 用例3 CONFLICT 通过 ✓ conflicts=${dupD.conflicts!.length} 未写入新行`)

    // ===== 用例 4：update(id, content) =====
    const content2 = '主人现在改为在周一上午做 code review，依旧偏好简洁 commit。'
    const updRes = (await tool.execute!(
      'tc-upd',
      { type: 'update', id: memId, content: content2 },
      undefined as never,
      undefined,
    )) as AgentToolResult<Details>
    const updD = detailsOf(updRes)
    assert(updD.ok === true, 'update details.ok 应为 true')
    const { data: row2 } = await supabaseAdmin
      .from('memories')
      .select('content, embedding')
      .eq('id', memId)
      .single()
    assert(row2!.content === content2, 'update 后 content 应改写')
    assert(embeddingLen(row2!.embedding) === 1536, 'update 后 embedding 应重算为 1536 维')
    console.log(`[assert] 用例4 update 通过 ✓ content 已改写`)

    // ===== 用例 5：delete(id) 软删 =====
    const delRes = (await tool.execute!(
      'tc-del',
      { type: 'delete', id: memId },
      undefined as never,
      undefined,
    )) as AgentToolResult<Details>
    assert(detailsOf(delRes).ok === true, 'delete details.ok 应为 true')
    const { data: row3 } = await supabaseAdmin
      .from('memories')
      .select('deleted')
      .eq('id', memId)
      .single()
    assert(row3!.deleted === true, '软删后行应仍存在且 deleted=true')
    console.log('[assert] 用例5 delete 通过 ✓ deleted=true（软删，行仍在）')

    // ===== 用例 6：list 验软删 =====
    const listRes2 = (await tool.execute!(
      'tc-list2',
      { type: 'list' },
      undefined as never,
      undefined,
    )) as AgentToolResult<Details>
    const listD2 = detailsOf(listRes2)
    assert(listD2.data.count === 0, `软删后 list 应为 0 条，实际 ${listD2.data.count}`)
    assert(
      !listD2.data.memories.some((m: any) => m.id === memId),
      'list 不应再出现已软删的记忆',
    )
    console.log(`[assert] 用例6 list 验软删 通过 ✓ count=${listD2.data.count}`)

    // ===== 用例 7：FORBIDDEN（非主人）=====
    const guestTool = makeManageMemoryTool({ replicaId, isOwner: false })
    let threw = false
    let errMsg = ''
    try {
      await guestTool.execute!('tc-forbidden', { type: 'list' }, undefined as never, undefined)
    } catch (e) {
      threw = true
      errMsg = (e as Error).message
    }
    assert(threw && /^\[FORBIDDEN\]/.test(errMsg), `非主人应抛 [FORBIDDEN]，实际: ${errMsg}`)
    console.log(`[assert] 用例7 FORBIDDEN 通过 ✓ 抛出: ${errMsg}`)

    // ===== 用例 8：NOT_FOUND（delete 不存在 id）=====
    threw = false
    errMsg = ''
    try {
      await tool.execute!(
        'tc-notfound',
        { type: 'delete', id: randomUUID() },
        undefined as never,
        undefined,
      )
    } catch (e) {
      threw = true
      errMsg = (e as Error).message
    }
    assert(threw && /^\[NOT_FOUND\]/.test(errMsg), `不存在 id 应抛 [NOT_FOUND]，实际: ${errMsg}`)
    console.log(`[assert] 用例8 NOT_FOUND 通过 ✓ 抛出: ${errMsg}`)

    // ===== 用例 9：BAD_INPUT（add 空 content）=====
    threw = false
    errMsg = ''
    try {
      await tool.execute!('tc-badinput', { type: 'add', content: '   ' }, undefined as never, undefined)
    } catch (e) {
      threw = true
      errMsg = (e as Error).message
    }
    assert(threw && /^\[BAD_INPUT\]/.test(errMsg), `空 content 应抛 [BAD_INPUT]，实际: ${errMsg}`)
    console.log(`[assert] 用例9 BAD_INPUT 通过 ✓ 抛出: ${errMsg}`)
  } finally {
    const { error } = await supabaseAdmin.from('replicas').delete().eq('id', replicaId)
    if (error) console.warn('[cleanup] 删除 test replica 失败:', error.message)
    else console.log('[cleanup] 已删除 test replica（cascade memories）')
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
