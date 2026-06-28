// articles 管理 helpers（知识来源页用）；不改 queries.ts。
// 列表/硬删除（删除 article 时 chunks 经 FK on delete cascade 一并清掉）。
import { supabaseAdmin } from './client'

export interface ArticleListRow {
  id: string
  replica_id: string
  title: string | null
  content: string | null
  source_url: string | null
  status: string
  created_at: string
}

// 方案B：当前分身在 replica_kb 里引用了哪些文档（article_ids）。
export async function listReplicaArticleIds(replicaId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from('replica_kb')
    .select('article_id')
    .eq('replica_id', replicaId)
  if (error) throw new Error(`listReplicaArticleIds 失败: ${error.message}`)
  return (data ?? []).map((r) => r.article_id as string)
}

// 方案B：让分身引用某篇文档（已引用则忽略）。
export async function addToKb(replicaId: string, articleId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('replica_kb')
    .upsert({ replica_id: replicaId, article_id: articleId }, { onConflict: 'replica_id,article_id', ignoreDuplicates: true })
  if (error) throw new Error(`addToKb 失败: ${error.message}`)
}

// 知识来源页：列出「当前分身引用的文档」（先取引用 ids，再查 articles）。
export async function listArticles(replicaId: string): Promise<ArticleListRow[]> {
  const ids = await listReplicaArticleIds(replicaId)
  if (ids.length === 0) return []
  const { data, error } = await supabaseAdmin
    .from('articles')
    .select('id, replica_id, title, content, source_url, status, created_at')
    .in('id', ids)
    .neq('status', 'archived')
    .order('created_at', { ascending: false })
  if (error) throw new Error(`listArticles 失败: ${error.message}`)
  return (data ?? []) as ArticleListRow[]
}

// 文档库（全局，跨所有分身）：标题模糊搜索 + 分页，附带作者名。
export interface DocLibItem {
  id: string
  title: string
  author: string
  created_at: string
}

export async function listAllDocuments(
  q: string,
  page: number,
  pageSize: number,
): Promise<{ items: DocLibItem[]; total: number; page: number; pageSize: number }> {
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  let query = supabaseAdmin
    .from('articles')
    .select('id, title, replica_id, created_at', { count: 'exact' })
    .neq('status', 'archived')
  if (q) query = query.ilike('title', `%${q}%`)
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to)
  if (error) throw new Error(`listAllDocuments 失败: ${error.message}`)
  const rows = data ?? []

  // 作者名：批量查 replicas 再映射
  const ids = [...new Set(rows.map((r) => r.replica_id).filter(Boolean))]
  const names = new Map<string, string>()
  if (ids.length) {
    const { data: reps, error: rerr } = await supabaseAdmin
      .from('replicas')
      .select('id, name')
      .in('id', ids)
    if (rerr) throw new Error(`查询作者失败: ${rerr.message}`)
    for (const r of reps ?? []) names.set(r.id, r.name)
  }

  const items: DocLibItem[] = rows.map((r) => ({
    id: r.id,
    title: r.title || '未命名文档',
    author: names.get(r.replica_id) || '未知',
    created_at: r.created_at,
  }))
  return { items, total: count ?? 0, page, pageSize }
}

// 方案B：从「当前分身的知识库」移除引用——只删 replica_kb 关联。
// 不删 article、不删 chunks（其它分身可能仍引用同一篇文档的全局向量）。
export async function removeFromKb(replicaId: string, articleId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('replica_kb')
    .delete()
    .eq('replica_id', replicaId)
    .eq('article_id', articleId)
  if (error) throw new Error(`removeFromKb 失败: ${error.message}`)
}
