// 子分身前端 fetch 层：列表走 lib/cache 缓存（key=subs:<parentId>），写操作后 cacheClear('subs:')
import { cacheGet, cacheSet, cacheClear } from '@/lib/cache'

export interface SubReplica {
  id: string
  name: string
  mis_id: string | null
  bio: string | null
  role: string | null
  team: string | null
  parent_id: string | null
}

export async function listSubReplicas(parentId: string): Promise<SubReplica[]> {
  const key = `subs:${parentId}`
  const hit = cacheGet<SubReplica[]>(key)
  if (hit) return hit
  const r = await fetch(`/api/sub-replicas?parentId=${parentId}`)
  const d = await r.json()
  if (!r.ok) throw new Error(d.error || '加载失败')
  const list: SubReplica[] = d.subs || []
  cacheSet(key, list)
  return list
}

export async function createSubReplica(input: {
  parentId: string
  name: string
  mis_id: string
  bio?: string
}): Promise<SubReplica> {
  const r = await fetch('/api/sub-replicas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(d.error || '创建失败')
  cacheClear('subs:')
  return d as SubReplica
}

export async function patchSubReplica(
  id: string,
  patch: { name?: string; bio?: string; parentId?: string },
): Promise<void> {
  const r = await fetch(`/api/sub-replicas/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || '更新失败')
  cacheClear('subs:')
}

export async function deleteSubReplica(id: string): Promise<void> {
  const r = await fetch(`/api/sub-replicas/${id}`, { method: 'DELETE' })
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || '删除失败')
  cacheClear('subs:')
}
