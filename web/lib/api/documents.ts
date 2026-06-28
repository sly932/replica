// 文档库前端 helper：分页+搜索查全部文档，经 lib/cache.ts 包一层。
import { cacheGet, cacheSet } from '@/lib/cache'

export interface DocLibItem {
  id: string
  title: string
  author: string
  created_at: string
}

export interface DocLibResult {
  items: DocLibItem[]
  total: number
  page: number
  pageSize: number
}

export async function listDocuments(
  q: string,
  page: number,
  pageSize = 20,
): Promise<DocLibResult> {
  const key = `documents:${q}:${page}`
  const hit = cacheGet<DocLibResult>(key)
  if (hit) return hit
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (q) params.set('q', q)
  const r = await fetch(`/api/documents?${params.toString()}`)
  const d = await r.json()
  if (!r.ok) throw new Error(d.error || '加载失败')
  cacheSet(key, d)
  return d as DocLibResult
}
