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

export async function listArticles(replicaId: string): Promise<ArticleListRow[]> {
  const { data, error } = await supabaseAdmin
    .from('articles')
    .select('id, replica_id, title, content, source_url, status, created_at')
    .eq('replica_id', replicaId)
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

// 从分身知识库「移除」：删向量(chunks) + 文档标记 archived。
// 不真删 articles 原文行——文档是独立资产，/doc 仍可访问、可重新添加。
export async function deleteArticle(id: string): Promise<void> {
  await supabaseAdmin.from('chunks').delete().eq('article_id', id)
  const { error } = await supabaseAdmin.from('articles').update({ status: 'archived' }).eq('id', id)
  if (error) throw new Error(`移除文档失败: ${error.message}`)
}
