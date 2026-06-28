// 补灌：对比 mock/seed/index.json 与 DB，把缺失（被硬删过）的文档重新 ingest。
// 已在 DB 的（含 archived 软删）跳过，不重复。跑：HTTPS_PROXY=... npx tsx --env-file=.env.local scripts/reseed-missing.ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// 本地：ofox(embedding/chat) 需走代理（Node fetch 默认不读 proxy 环境变量）
const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY
if (proxyUrl) {
  const { setGlobalDispatcher, EnvHttpProxyAgent } = await import('undici')
  setGlobalDispatcher(new EnvHttpProxyAgent())
  console.log('[setup] 代理已启用:', proxyUrl)
}

import { supabaseAdmin } from '../lib/db/client'
import { ingestArticle } from '../lib/rag'

const SEED = '/Users/sly/projects/replica/mock/seed'
const stripFm = (md: string) => {
  const m = md.match(/^---\n[\s\S]*?\n---\n?/)
  return m ? md.slice(m[0].length).trimStart() : md
}

async function main() {
  const { data: reps } = await supabaseAdmin.from('replicas').select('id, mis_id')
  const byMis: Record<string, string> = {}
  for (const r of reps || []) byMis[r.mis_id as string] = r.id as string

  // have = DB 现有全部（含 archived），这些不重灌；只补真缺失的
  const { data: arts } = await supabaseAdmin.from('articles').select('title, replica_id')
  const have = new Set((arts || []).map((a) => `${a.replica_id}|${a.title}`))

  const index = JSON.parse(readFileSync(join(SEED, 'index.json'), 'utf8')) as {
    mis_id: string
    articles: { title: string; file: string; source_url: string }[]
  }[]

  let n = 0
  for (const grp of index) {
    const rid = byMis[grp.mis_id]
    if (!rid) { console.log('跳过(无分身):', grp.mis_id); continue }
    for (const a of grp.articles) {
      if (have.has(`${rid}|${a.title}`)) continue
      const content = stripFm(readFileSync(join(SEED, a.file), 'utf8'))
      console.log('补灌:', grp.mis_id, '|', a.title)
      const r = await ingestArticle(rid, a.title, content, a.source_url)
      console.log('  →', JSON.stringify(r))
      n++
    }
  }
  console.log(`补灌完成，共 ${n} 篇`)
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
