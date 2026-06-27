// readDocument 集成测试（真跑：连 Supabase + cloudsway + ofox）
//
// 跑法（需加载 web/.env.local）：
//   cd web && npx tsx --env-file=.env.local lib/agent/tools/__tests__/readDocument.test.ts
//
// 流程：建独立 test replica → ingestArticle 灌入一篇 >3000 字文档（真调 embed/cloudsway）
//   → readDocument 分页读两次，验 nextIdx 推进 + hasMore 翻转 + 切片正确
//   → 覆盖错误路径 BAD_INPUT / NOT_FOUND / FORBIDDEN
//   → 清理（删 replica，cascade 删 articles/chunks）。
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
import { ingestArticle } from '../../../rag'
import { makeReadDocumentTool } from '../readDocument'
import type { AgentToolResult } from '@earendil-works/pi-agent-core'

type ReadData = { text: string; nextIdx: number; hasMore: boolean; total: number }
type ReadResult = AgentToolResult<{ ok: boolean; code: string; data: ReadData }>

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`断言失败: ${msg}`)
}

// 期望 execute 抛错且带 [CODE] 前缀（pi 约定：失败必须 throw）。
async function expectFail(code: string, fn: () => Promise<unknown>, label: string) {
  try {
    await fn()
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e)
    assert(m.startsWith(`[${code}]`), `${label}：应抛 [${code}]，实际：${m}`)
    console.log(`[assert] ${label} → 正确抛出 ${m}`)
    return
  }
  throw new Error(`${label}：期望抛 [${code}] 但未抛出`)
}

// 造一篇 >3000 字的中文文档（多段落，供 ingestArticle 切块/上下文化）。
function makeDoc(): string {
  const paras: string[] = []
  for (let i = 0; paras.join('\n\n').length < 3200; i++) {
    paras.push(
      `第${i}段：灵犀部署平台在本段记录与构建、灰度、回滚相关的操作要点，` +
        `这是用于 readDocument 分页读取的真实数据，编号${i}，` +
        `包含足够的中文字符以便切片验证翻页推进与 hasMore 标志是否正确。`,
    )
  }
  return paras.join('\n\n')
}

async function main() {
  const replicaId = randomUUID()
  const otherReplicaId = randomUUID()
  console.log('[setup] test replicaId =', replicaId, ' other =', otherReplicaId)

  await insertRow('replicas', {
    id: replicaId,
    name: '测试·readDoc',
    mis_id: `test-${replicaId.slice(0, 8)}`,
    role: '后端负责人',
  })
  await insertRow('replicas', {
    id: otherReplicaId,
    name: '测试·他人',
    mis_id: `test-${otherReplicaId.slice(0, 8)}`,
  })

  try {
    // 1. ingestArticle 灌入 >3000 字文档（真调 embed + cloudsway genContext）
    const content = makeDoc()
    console.log('[ingest] 文档字符数 =', content.length)
    assert(content.length > 3000, '测试文档应 >3000 字')
    const t0 = Date.now()
    const { articleId, chunkCount } = await ingestArticle(
      replicaId,
      '灵犀部署手册·分页测试',
      content,
      'file://readDocument.test',
    )
    console.log(`[ingest] articleId=${articleId} chunkCount=${chunkCount} 耗时=${Date.now() - t0}ms`)
    assert(chunkCount > 0, 'ingestArticle 应至少产生 1 个 chunk')

    const tool = makeReadDocumentTool({ replicaId, isOwner: false })
    const call = (params: Record<string, unknown>) =>
      tool.execute!('tc', params as never, undefined as never, undefined) as Promise<ReadResult>

    // 2. 第一页：curIdx/readLen 走默认（0 / 2000）
    const p1 = await call({ docId: articleId })
    console.log('[page1] details =', JSON.stringify(p1.details))
    assert(p1.details.ok === true, 'page1 details.ok 应为 true')
    const d1 = p1.details.data
    assert(d1.total === content.length, `page1 total 应 = ${content.length}，实际 ${d1.total}`)
    assert(d1.text.length === 2000, `page1 应读满 2000 字（readLen 默认），实际 ${d1.text.length}`)
    assert(d1.text === content.slice(0, 2000), 'page1 切片应等于 content[0,2000]')
    assert(d1.nextIdx === 2000, `page1 nextIdx 应 = 2000，实际 ${d1.nextIdx}`)
    assert(d1.hasMore === true, 'page1 hasMore 应为 true（文档 >2000 字）')

    // 3. 第二页：从 nextIdx 续读，验 nextIdx 推进 + 切片衔接 + hasMore 翻转
    const p2 = await call({ docId: articleId, curIdx: d1.nextIdx })
    console.log('[page2] details =', JSON.stringify(p2.details))
    const d2 = p2.details.data
    assert(d2.nextIdx > d1.nextIdx, `page2 nextIdx(${d2.nextIdx}) 应 > page1 nextIdx(${d1.nextIdx})`)
    assert(d2.text === content.slice(d1.nextIdx, d1.nextIdx + 2000), 'page2 切片应衔接 page1')
    assert(d1.text + d2.text === content.slice(0, d2.nextIdx), '两页拼接应等于原文前缀')
    // 文档 <4000 字：两页即读完，hasMore 翻为 false，nextIdx 到达 total
    assert(d2.hasMore === false, 'page2 hasMore 应为 false（已读完）')
    assert(d2.nextIdx === d1.total, `page2 nextIdx 应到达 total(${d1.total})`)
    console.log('[assert] 分页：nextIdx 推进 + 切片衔接 + hasMore 翻转 全部通过 ✓')

    // 4. readLen 上限保护：传 5000 也只读 2000
    const pCap = await call({ docId: articleId, curIdx: 0, readLen: 5000 })
    assert(pCap.details.data.text.length === 2000, `readLen 应被钳到 2000，实际 ${pCap.details.data.text.length}`)
    console.log('[assert] readLen 上限钳制 ✓')

    // 5. 错误路径
    await expectFail('BAD_INPUT', () => call({ docId: '  ' }), 'docId 空白')
    await expectFail('NOT_FOUND', () => call({ docId: randomUUID() }), 'docId 不存在')

    // FORBIDDEN：另一个 replica 名下的文档，当前 ctx 无权读
    const otherArticle = await insertRow('articles', {
      replica_id: otherReplicaId,
      title: '他人文档',
      content: '这是他人分身的私有文档内容。',
    })
    await expectFail('FORBIDDEN', () => call({ docId: otherArticle.id as string }), '跨分身越权读')

    console.log('\n[assert] 全部用例通过 ✓')
  } finally {
    for (const id of [replicaId, otherReplicaId]) {
      const { error } = await supabaseAdmin.from('replicas').delete().eq('id', id)
      if (error) console.warn(`[cleanup] 删除 replica ${id} 失败:`, error.message)
    }
    console.log('[cleanup] 已删除 test replicas（cascade chunks/articles）')
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
