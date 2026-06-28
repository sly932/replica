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

// 从分身知识库「移除」：删向量(chunks) + 文档标记 archived。
// 不真删 articles 原文行——文档是独立资产，/doc 仍可访问、可重新添加。
export async function deleteArticle(id: string): Promise<void> {
  await supabaseAdmin.from('chunks').delete().eq('article_id', id)
  const { error } = await supabaseAdmin.from('articles').update({ status: 'archived' }).eq('id', id)
  if (error) throw new Error(`移除文档失败: ${error.message}`)
}
