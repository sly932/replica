// searchMemory 集成测试（真跑：连 Supabase + ofox embedding + cloudsway）
//
// 跑法（需加载 web/.env.local）：
//   cd web && npx tsx --env-file=.env.local lib/agent/tools/__tests__/searchMemory.test.ts
//
// 覆盖用例：
//   1) 召回：建 test replica，插 2 条 enabled memories（真 embed），search 命中且结构正确
//   2) 过滤：disabled / deleted 的 memory（内容强匹配）不应被召回
//   3) 空结果：无任何 memory 的 replica 检索 → count=0，正文「未检索到相关记忆」
//   4) 错误路径：空 query → throw [BAD_INPUT]
//   清理：finally 删 test replica（cascade 删 memories）。
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
import { embed } from '../../../llm/embedding'
import { makeSearchMemoryTool } from '../searchMemory'
import type { AgentToolResult } from '@earendil-works/pi-agent-core'

interface SearchDetails {
  ok: boolean
  code: string
  data: { count: number; results: Array<{ id: string; kind: string; content: string; similarity: number }> }
}

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`断言失败: ${msg}`)
}

async function runSearch(replicaId: string, query: string) {
  const tool = makeSearchMemoryTool({ replicaId, isOwner: false })
  const res = (await tool.execute!(
    'tc-1',
    { query },
    undefined as never,
    undefined,
  )) as AgentToolResult<SearchDetails>
  const text = res.content.map((c) => (c.type === 'text' ? c.text : '')).join('\n')
  return { res, text }
}

async function main() {
  const replicaId = randomUUID()
  const emptyReplicaId = randomUUID()
  console.log('[setup] test replicaId =', replicaId)

  // 建两个 test replica：一个灌数据，一个保持空（验空结果）
  for (const id of [replicaId, emptyReplicaId]) {
    await insertRow('replicas', {
      id,
      name: '测试·记忆',
      mis_id: `test-${id.slice(0, 8)}`,
      role: '后端负责人',
    })
  }

  try {
    // ---- 准备数据：4 条 memory，内容均强匹配「灰度发布」，靠 enabled/deleted 区分 ----
    const M_ENABLED_1 = '上周三团队评审决定：线上发布统一采用灰度发布，先放量 5% 再逐步全量。'
    const M_ENABLED_2 = '灰度发布期间若错误率超过阈值，自动回滚到上一个稳定版本。'
    const M_DISABLED = '这条关于灰度发布的记忆已被禁用，不应出现在检索结果里。'
    const M_DELETED = '这条关于灰度发布的记忆已被软删除，不应出现在检索结果里。'

    const contents = [M_ENABLED_1, M_ENABLED_2, M_DISABLED, M_DELETED]
    const t0 = Date.now()
    const vectors = await embed(contents)
    console.log(`[embed] 4 条记忆向量化完成 耗时=${Date.now() - t0}ms 维度=${vectors[0].length}`)

    const ids = {
      enabled1: (await insertRow('memories', {
        replica_id: replicaId, kind: 'episodic', content: M_ENABLED_1,
        embedding: vectors[0], enabled: true, deleted: false,
      })).id,
      enabled2: (await insertRow('memories', {
        replica_id: replicaId, kind: 'semantic', content: M_ENABLED_2,
        embedding: vectors[1], enabled: true, deleted: false,
      })).id,
      disabled: (await insertRow('memories', {
        replica_id: replicaId, kind: 'semantic', content: M_DISABLED,
        embedding: vectors[2], enabled: false, deleted: false,
      })).id,
      deleted: (await insertRow('memories', {
        replica_id: replicaId, kind: 'semantic', content: M_DELETED,
        embedding: vectors[3], enabled: true, deleted: true,
      })).id,
    }
    console.log('[seed] memory ids =', ids)

    // ---- 用例 1 + 2：召回 + 过滤 ----
    const { res, text } = await runSearch(replicaId, '灰度发布怎么做')
    console.log('\n========== searchMemory 返回 ==========')
    console.log(text)
    console.log('========== /返回 ==========')
    console.log('[details]', JSON.stringify(res.details))

    assert(res.details.ok === true, 'details.ok 应为 true')
    assert(res.details.code === 'OK', 'details.code 应为 OK')
    assert(res.details.data.count >= 2, '应召回至少 2 条 enabled 记忆')
    // 结构：每条含 id/kind/content/similarity
    for (const r of res.details.data.results) {
      assert(typeof r.id === 'string' && r.id.length > 0, '结果应含 id')
      assert(r.kind === 'semantic' || r.kind === 'episodic', `kind 应为枚举，实际=${r.kind}`)
      assert(typeof r.content === 'string' && r.content.length > 0, '结果应含 content')
      assert(typeof r.similarity === 'number', '结果应含 similarity(number)')
    }
    const recalledIds = new Set(res.details.data.results.map((r) => r.id))
    assert(recalledIds.has(ids.enabled1), '应召回 enabled 记忆1')
    assert(recalledIds.has(ids.enabled2), '应召回 enabled 记忆2')
    // 过滤：disabled / deleted 不应出现
    assert(!recalledIds.has(ids.disabled), 'disabled 记忆不应被召回')
    assert(!recalledIds.has(ids.deleted), 'deleted 记忆不应被召回')
    assert(/灰度/.test(text), '正文应包含「灰度」')
    console.log('[assert] 用例1+2 通过 ✓（召回 enabled、过滤 disabled/deleted）')

    // ---- 用例 3：空 replica → count=0 ----
    const empty = await runSearch(emptyReplicaId, '灰度发布')
    assert(empty.res.details.ok === true, '空结果仍 ok=true')
    assert(empty.res.details.data.count === 0, '无记忆的 replica 应 count=0')
    assert(/未检索到相关记忆/.test(empty.text), '正文应为「未检索到相关记忆」')
    console.log('[assert] 用例3 通过 ✓（空 replica count=0）')

    // ---- 用例 4：空 query → throw [BAD_INPUT] ----
    let threw = ''
    try {
      await runSearch(replicaId, '   ')
    } catch (e) {
      threw = (e as Error).message
    }
    assert(/\[BAD_INPUT\]/.test(threw), `空 query 应 throw [BAD_INPUT]，实际=${threw}`)
    console.log('[assert] 用例4 通过 ✓（空 query → [BAD_INPUT]）')
  } finally {
    for (const id of [replicaId, emptyReplicaId]) {
      const { error } = await supabaseAdmin.from('replicas').delete().eq('id', id)
      if (error) console.warn('[cleanup] 删除 test replica 失败:', error.message)
    }
    console.log('[cleanup] 已删除 test replica（cascade memories）')
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
