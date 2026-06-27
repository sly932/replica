// searchConversation 集成测试（真跑：连 Supabase + ofox embedding）
//
// 跑法（需加载 web/.env.local）：
//   cd web && npx tsx --env-file=.env.local lib/agent/tools/__tests__/searchConversation.test.ts
//
// 流程：建独立 test replica → 插 2 条 conversations（summary 真 embed，不同 created_at）
//   → search 验语义召回 + after/before 时间窗过滤 → 覆盖 BAD_INPUT 错误路径
//   → 清理（删 replica，cascade 删 conversations）。
import { randomUUID } from 'node:crypto'

// 本地开发：若设置了 HTTP(S)_PROXY（如 clash），把 Node 全局 fetch 路由到代理。
// embedding 服务(ofox)在本地需走代理；Node 22 的 fetch 默认不读 proxy 环境变量。
// 仅本地测试需要——生产(Railway)直连外网，不加载本文件。
const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY
if (proxyUrl) {
  const { setGlobalDispatcher, EnvHttpProxyAgent } = await import('undici')
  setGlobalDispatcher(new EnvHttpProxyAgent())
  console.log('[setup] 已启用 EnvHttpProxyAgent，代理 =', proxyUrl)
}

import { supabaseAdmin } from '../../../db/client'
import { insertRow } from '../../../db/queries'
import { embedOne } from '../../../llm/embedding'
import { makeSearchConversationTool } from '../searchConversation'
import type { AgentToolResult } from '@earendil-works/pi-agent-core'

type ConvResult = { id: string; summary: string; created_at: string }
type Details = { ok: boolean; code: string; data: { count: number; results: ConvResult[] } }

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`断言失败: ${msg}`)
}

// 调 execute 并把 details 转成强类型
async function run(
  tool: ReturnType<typeof makeSearchConversationTool>,
  params: Record<string, unknown>,
) {
  const res = (await tool.execute!(
    'tc',
    params as never,
    undefined as never,
    undefined,
  )) as AgentToolResult<Details>
  const text = res.content.map((c) => (c.type === 'text' ? c.text : '')).join('\n')
  return { res, text, details: res.details }
}

// 期望 execute 抛出含 [CODE] 前缀的约定错误
async function expectFail(
  tool: ReturnType<typeof makeSearchConversationTool>,
  params: Record<string, unknown>,
  code: string,
) {
  try {
    await run(tool, params)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    assert(msg.startsWith(`[${code}]`), `期望抛 [${code}]，实际：${msg}`)
    console.log(`[assert] 正确抛出 ${code}：${msg}`)
    return
  }
  throw new Error(`断言失败: 期望抛 [${code}]，但 execute 正常返回`)
}

// 两条会话：A 旧（技术·部署），B 新（生活·爬山），主题语义清晰可分
const CONV_A = {
  created_at: '2026-01-10T08:00:00Z',
  summary: '这次对话讨论了线上后端服务的部署流程、灰度发布策略以及故障回滚方案。',
}
const CONV_B = {
  created_at: '2026-06-20T08:00:00Z',
  summary: '这次对话聊了周末去山里爬山、露营和拍风景照片的休闲计划。',
}

async function main() {
  const replicaId = randomUUID()
  console.log('[setup] test replicaId =', replicaId)

  await insertRow('replicas', {
    id: replicaId,
    name: '测试·会话检索',
    mis_id: `test-${replicaId.slice(0, 8)}`,
    role: '后端负责人',
  })

  try {
    // 1. 插 2 条 conversations（summary 真 embed，不同 created_at）
    const [embA, embB] = await Promise.all([embedOne(CONV_A.summary), embedOne(CONV_B.summary)])
    const rowA = await insertRow('conversations', {
      replica_id: replicaId,
      direction: 'ask_me',
      summary: CONV_A.summary,
      summary_embedding: embA,
      created_at: CONV_A.created_at,
    })
    const rowB = await insertRow('conversations', {
      replica_id: replicaId,
      direction: 'ask_me',
      summary: CONV_B.summary,
      summary_embedding: embB,
      created_at: CONV_B.created_at,
    })
    console.log('[seed] convA(部署)=', rowA.id, ' convB(爬山)=', rowB.id)

    const tool = makeSearchConversationTool({ replicaId, isOwner: false })

    // 2. 语义召回：查「部署发布」应召回 convA，结构 {ok,code,data} 正确
    {
      const { text, details } = await run(tool, { query: '部署发布相关的技术讨论' })
      console.log('\n[case1] query=部署发布相关的技术讨论 →\n' + text)
      assert(details.ok === true && details.code === 'OK', 'case1 details 应 ok/OK')
      assert(details.data.count > 0, 'case1 应召回至少 1 条')
      const ids = details.data.results.map((r) => r.id)
      assert(ids.includes(rowA.id as string), 'case1 应召回 convA(部署)')
      assert(details.data.results[0].id === rowA.id, 'case1 convA 应排第一（语义最相关）')
    }

    // 3. after 过滤：after=2026-03-01 把旧的 convA 排除，结果不含 convA
    {
      const { details } = await run(tool, {
        query: '部署发布相关的技术讨论',
        after: '2026-03-01T00:00:00Z',
      })
      const ids = details.data.results.map((r) => r.id)
      console.log('[case2] after=2026-03-01 召回 ids=', ids)
      assert(!ids.includes(rowA.id as string), 'case2 after 应排除旧的 convA')
    }

    // 4. before 过滤：before=2026-03-01 把新的 convB 排除，结果不含 convB
    {
      const { details } = await run(tool, {
        query: '爬山露营的休闲安排',
        before: '2026-03-01T00:00:00Z',
      })
      const ids = details.data.results.map((r) => r.id)
      console.log('[case3] before=2026-03-01 召回 ids=', ids)
      assert(!ids.includes(rowB.id as string), 'case3 before 应排除新的 convB')
    }

    // 5. 时间窗整体落空 → count=0，返回「未检索到」
    {
      const { text, details } = await run(tool, {
        query: '部署发布相关的技术讨论',
        after: '2030-01-01T00:00:00Z',
      })
      console.log('[case4] after=2030 →', text)
      assert(details.ok === true && details.data.count === 0, 'case4 越界时间窗应空召回')
    }

    // 6. 错误路径：空 query → BAD_INPUT
    await expectFail(tool, { query: '   ' }, 'BAD_INPUT')

    // 7. 错误路径：非法 ISO 时间 → BAD_INPUT
    await expectFail(tool, { query: '部署', after: '不是时间' }, 'BAD_INPUT')

    console.log('\n[assert] 全部用例通过 ✓')
  } finally {
    const { error } = await supabaseAdmin.from('replicas').delete().eq('id', replicaId)
    if (error) console.warn('[cleanup] 删除 test replica 失败:', error.message)
    else console.log('[cleanup] 已删除 test replica（cascade conversations）')
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
