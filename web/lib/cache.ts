// 极简前端缓存（横切）：避免切换页面/会话时重复查询。
// 用法：先 cacheGet(key)，命中直接用；未命中 fetch 后 cacheSet(key, data)；写操作后 cacheClear(prefix)。
const store = new Map<string, { v: unknown; t: number }>()

export function cacheGet<T>(key: string, ttl = 30000): T | undefined {
  const e = store.get(key)
  if (e && Date.now() - e.t < ttl) return e.v as T
  return undefined
}

export function cacheSet(key: string, v: unknown): void {
  store.set(key, { v, t: Date.now() })
}

export function cacheClear(prefix?: string): void {
  if (!prefix) { store.clear(); return }
  for (const k of [...store.keys()]) if (k.startsWith(prefix)) store.delete(k)
}
