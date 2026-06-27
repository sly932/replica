// searchKnowledge 集成测试（真跑：连 Supabase + cloudsway + ofox）
//
// 跑法（需加载 web/.env.local）：
//   cd web && npx tsx --env-file=.env.local lib/agent/tools/__tests__/searchKnowledge.test.ts
//   （或 node --env-file=.env.local --import tsx/esm <file>）
//
// 流程：建独立 test replica → ingestArticle 灌 mock chenhao01/deployment.md
//   → searchKnowledge.execute('部署流程') → 断言召回到部署相关 chunk（含 灰度/staging 等）
//   → 清理（删 replica，cascade 删 articles/chunks）。
import { readFileSync } from 'node:fs'
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
import { ingestArticle } from '../../../rag'
import { makeSearchKnowledgeTool } from '../searchKnowledge'
import type { AgentToolResult } from '@earendil-works/pi-agent-core'

const DOC_PATH =
  '/Users/sly/projects/replica/mock/seed/articles/chenhao01/deployment.md'

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`断言失败: ${msg}`)
}

async function main() {
  const replicaId = randomUUID()
  console.log('[setup] test replicaId =', replicaId)

  // 1. 建 test replica（id 显式指定，mis_id 用 uuid 后缀避免唯一冲突）
  await insertRow('replicas', {
    id: replicaId,
    name: '测试·陈昊',
    mis_id: `test-${replicaId.slice(0, 8)}`,
    role: '后端负责人',
  })

  try {
    // 2. ingestArticle 灌入 deployment.md
    const content = readFileSync(DOC_PATH, 'utf8')
    console.log('[ingest] 文档字符数 =', content.length)
    const t0 = Date.now()
    const { articleId, chunkCount } = await ingestArticle(
      replicaId,
      '灵犀部署手册',
      content,
      `file://${DOC_PATH}`,
    )
    console.log(
      `[ingest] articleId=${articleId} chunkCount=${chunkCount} 耗时=${Date.now() - t0}ms`,
    )
    assert(chunkCount > 0, 'ingestArticle 应至少产生 1 个 chunk')

    // 3. searchKnowledge.execute('部署流程')
    const tool = makeSearchKnowledgeTool({ replicaId, isOwner: false })
    const res = (await tool.execute!(
      'tc-1',
      { query: '部署流程' },
      undefined as never,
      undefined,
    )) as AgentToolResult<{ ok: boolean; code: string; data: { count: number; results: unknown[] } }>

    const text = res.content.map((c) => (c.type === 'text' ? c.text : '')).join('\n')
    console.log('\n========== searchKnowledge 返回 ==========')
    console.log(text)
    console.log('========== /返回 ==========\n')
    console.log('[details]', JSON.stringify(res.details))

    // 4. 断言：召回非空、ok、且正文含部署关键词
    assert(res.details.ok === true, 'details.ok 应为 true')
    assert(res.details.data.count > 0, '应召回至少 1 条结果')
    const hasKeyword = /灰度|staging|回滚|发布|prod/.test(text)
    assert(hasKeyword, '召回正文应包含部署相关关键词（灰度/staging/回滚/发布/prod）')
    console.log('[assert] 全部通过 ✓（召回到部署相关内容）')
  } finally {
    // 5. 清理：删 replica（cascade 删 articles/chunks）
    const { error } = await supabaseAdmin.from('replicas').delete().eq('id', replicaId)
    if (error) console.warn('[cleanup] 删除 test replica 失败:', error.message)
    else console.log('[cleanup] 已删除 test replica（cascade chunks/articles）')
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
