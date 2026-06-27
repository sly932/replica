// 公开文档展示页 /doc/[id]：标题 + 作者 + Markdown 正文。无需登录，可作分享链接。
import { supabaseAdmin } from '@/lib/db/client'
import DocView from './DocView'

export const runtime = 'nodejs'

export default async function DocPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: article } = await supabaseAdmin
    .from('articles')
    .select('id, title, content, replica_id, created_at')
    .eq('id', id)
    .maybeSingle()

  if (!article) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        文档不存在或已删除
      </div>
    )
  }

  let author = ''
  let role = ''
  if (article.replica_id) {
    const { data: rep } = await supabaseAdmin.from('replicas').select('name, role').eq('id', article.replica_id).maybeSingle()
    author = rep?.name || ''
    role = rep?.role || ''
  }

  return (
    <DocView
      title={article.title || '未命名文档'}
      author={author}
      role={role}
      content={article.content || ''}
      date={(article.created_at || '').slice(0, 10)}
    />
  )
}
