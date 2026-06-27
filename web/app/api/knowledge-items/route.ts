// 知识条目列表 GET ?replicaId=&status=
// 列表读走 lib/cache.ts（30s TTL）；写操作（[id] 路由）成功后 cacheClear 同前缀。
import { listKnowledgeItems, type KnowledgeStatus } from '@/lib/db/knowledgeItems'
import { cacheGet, cacheSet } from '@/lib/cache'

export const runtime = 'nodejs'

const STATUSES: KnowledgeStatus[] = ['pending_answer', 'pending_review', 'approved', 'archived']

export function cacheKey(replicaId: string, status: string) {
  return `knowledge-items:${replicaId}:${status}`
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const replicaId = url.searchParams.get('replicaId')
  const status = url.searchParams.get('status') as KnowledgeStatus | null
  if (!replicaId) return Response.json({ error: '缺少 replicaId' }, { status: 400 })
  if (!status || !STATUSES.includes(status)) {
    return Response.json({ error: '缺少或非法 status' }, { status: 400 })
  }

  const key = cacheKey(replicaId, status)
  const cached = cacheGet<unknown[]>(key)
  if (cached) return Response.json({ items: cached })

  try {
    const items = await listKnowledgeItems(replicaId, status)
    cacheSet(key, items)
    return Response.json({ items })
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 })
  }
}
