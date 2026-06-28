// 前端管理 API（知识来源 / 记忆 / 个人资料三页共用）
// 列表类 GET 经 lib/cache.ts 包一层；写操作成功后 cacheClear 对应前缀。
import { cacheGet, cacheSet, cacheClear } from '@/lib/cache'

// ---- 分身列表（顶部分身选择下拉用）----
export interface ReplicaBrief {
  id: string
  name: string
  mis_id: string | null
  role: string | null
  org: string | null
  team: string | null
}

export async function listReplicas(): Promise<ReplicaBrief[]> {
  const key = 'replicas:list'
  const hit = cacheGet<ReplicaBrief[]>(key)
  if (hit) return hit
  const r = await fetch('/api/replicas')
  const d = await r.json()
  const list: ReplicaBrief[] = d.replicas || []
  cacheSet(key, list)
  return list
}

// ---- 知识来源 articles ----
export interface Article {
  id: string
  replica_id: string
  title: string | null
  content: string | null
  source_url: string | null
  status: string
  created_at: string
}

export async function listArticles(replicaId: string): Promise<Article[]> {
  const key = `articles:${replicaId}`
  const hit = cacheGet<Article[]>(key)
  if (hit) return hit
  const r = await fetch(`/api/articles?replicaId=${replicaId}`)
  const d = await r.json()
  const list: Article[] = d.articles || []
  cacheSet(key, list)
  return list
}

export async function addArticle(
  replicaId: string,
  input: { title?: string; content?: string; sourceUrl?: string },
): Promise<void> {
  const r = await fetch('/api/articles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ replicaId, ...input }),
  })
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || '添加失败')
  cacheClear('articles:')
}

// 让当前分身引用一篇已存在的全局文档（已向量化则复用，不重灌）
export async function ingestArticleById(
  articleId: string,
  replicaId: string,
): Promise<{ chunkCount: number; reused: boolean }> {
  const r = await fetch('/api/articles/ingest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ articleId, replicaId }),
  })
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(d.error || '入库失败')
  cacheClear('articles:')
  return d as { chunkCount: number; reused: boolean }
}

export async function patchArticle(id: string, patch: { status?: string; title?: string }): Promise<void> {
  const r = await fetch(`/api/articles/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || '更新失败')
  cacheClear('articles:')
}

// 从当前分身知识库移除对该文档的引用（不删原文/向量）
export async function deleteArticle(id: string, replicaId: string): Promise<void> {
  const r = await fetch(`/api/articles/${id}?replicaId=${replicaId}`, { method: 'DELETE' })
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || '删除失败')
  cacheClear('articles:')
}

// ---- 记忆 memories ----
export interface Memory {
  id: string
  replica_id: string
  kind: string // 'semantic' | 'episodic'
  content: string
  enabled: boolean
  created_at: string
}

export async function listMemories(replicaId: string): Promise<Memory[]> {
  const key = `memories:${replicaId}`
  const hit = cacheGet<Memory[]>(key)
  if (hit) return hit
  const r = await fetch(`/api/memories?replicaId=${replicaId}`)
  const d = await r.json()
  const list: Memory[] = d.memories || []
  cacheSet(key, list)
  return list
}

export async function addMemory(
  replicaId: string,
  input: { kind: 'semantic' | 'episodic'; content: string },
): Promise<void> {
  const r = await fetch('/api/memories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ replicaId, ...input }),
  })
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || '新增失败')
  cacheClear('memories:')
}

export async function patchMemory(id: string, patch: { content?: string; enabled?: boolean }): Promise<void> {
  const r = await fetch(`/api/memories/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || '更新失败')
  cacheClear('memories:')
}

export async function deleteMemory(id: string): Promise<void> {
  const r = await fetch(`/api/memories/${id}`, { method: 'DELETE' })
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || '删除失败')
  cacheClear('memories:')
}

// ---- 个人资料 replicas ----
export interface ReplicaProfile {
  id: string
  name: string
  mis_id: string | null
  role: string | null
  org: string | null
  team: string | null
  gender: string | null
  bio: string | null
  hobbies: string[] | null
  mbti: string | null
}

export async function getReplica(id: string): Promise<ReplicaProfile> {
  const key = `replica:${id}`
  const hit = cacheGet<ReplicaProfile>(key)
  if (hit) return hit
  const r = await fetch(`/api/replicas/${id}`)
  const d = await r.json()
  if (!r.ok) throw new Error(d.error || '加载失败')
  cacheSet(key, d.replica)
  return d.replica
}

export async function patchReplica(
  id: string,
  patch: { gender?: string; bio?: string; hobbies?: string[]; mbti?: string },
): Promise<void> {
  const r = await fetch(`/api/replicas/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || '保存失败')
  cacheClear(`replica:${id}`)
}
