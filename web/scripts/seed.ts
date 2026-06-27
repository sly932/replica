// 灌库：把 mock/seed 的 7 角色 + 21 文档灌进 Supabase（一次性，可重跑）
// 跑：cd web && npx tsx --env-file=.env.local scripts/seed.ts
import { readFileSync } from 'node:fs'

// 本地：embedding(ofox)/cloudsway 需走代理（Node fetch 默认不读 proxy 环境变量）
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
  const replicas = JSON.parse(readFileSync(`${SEED}/replicas.json`, 'utf8'))
  const index = JSON.parse(readFileSync(`${SEED}/index.json`, 'utf8'))

  // 清旧（按 mis_id，cascade 删 articles/chunks）
  const misIds = replicas.map((r: any) => r.mis_id)
  await supabaseAdmin.from('replicas').delete().in('mis_id', misIds)
  console.log('[clean] 清除旧 replicas:', misIds.length)

  // 插 replicas
  const idByMis: Record<string, string> = {}
  for (const r of replicas) {
    const { data, error } = await supabaseAdmin
      .from('replicas')
      .insert({
        name: r.name, mis_id: r.mis_id, role: r.role, org: r.org, team: r.team,
        gender: r.gender ?? null, mbti: r.mbti ?? null, bio: r.bio ?? null,
        persona_prompt: r.persona_prompt,
      })
      .select('id')
      .single()
    if (error) throw new Error(`insert replica ${r.mis_id}: ${error.message}`)
    idByMis[r.mis_id] = data.id
    console.log(`[replica] ${r.name}(${r.mis_id}) → ${data.id}`)
  }

  // 灌文档
  let docs = 0
  for (const entry of index) {
    const rid = idByMis[entry.mis_id]
    if (!rid) { console.warn('跳过未知 mis_id', entry.mis_id); continue }
    for (const art of entry.articles) {
      const content = stripFm(readFileSync(`${SEED}/${art.file}`, 'utf8'))
      const t0 = Date.now()
      const res = await ingestArticle(rid, art.title, content, art.source_url)
      docs++
      console.log(`  [doc] ${art.title} → ${JSON.stringify(res)} (${Date.now() - t0}ms)`)
    }
  }
  console.log(`\n✅ 灌库完成：${replicas.length} 角色 / ${docs} 文档`)
}

main().catch((e) => { console.error('❌ 灌库失败:', e); process.exit(1) })
