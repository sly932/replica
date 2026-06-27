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
    .order('created_at', { ascending: false })
  if (error) throw new Error(`listArticles 失败: ${error.message}`)
  return (data ?? []) as ArticleListRow[]
}

export async function deleteArticle(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from('articles').delete().eq('id', id)
  if (error) throw new Error(`deleteArticle 失败: ${error.message}`)
}
