'use client'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function DocView({
  title, author, role, content, date,
}: { title: string; author: string; role: string; content: string; date: string }) {
  return (
    // position:fixed 脱离 body 的 flex 居中（否则文档高于视口时标题会被顶出窗口上方裁掉）；白底黑字、从顶部对齐、独立滚动
    <div style={{ position: 'fixed', inset: 0, overflowY: 'auto', background: '#fff', color: '#1a1a1a' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '56px 24px 96px' }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 12, lineHeight: 1.3, color: '#111' }}>{title}</h1>
        <div style={{ fontSize: 13, color: '#888', marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid #eaeaea' }}>
          {author && (
            <>
              作者 <span style={{ color: '#444', fontWeight: 600 }}>{author}</span>{role ? ` · ${role}` : ''}
              {date ? ' · ' : ''}
            </>
          )}
          {date}
        </div>
        <article className="md doc-md" style={{ lineHeight: 1.75, fontSize: 15, color: '#1a1a1a' }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </article>
      </div>
    </div>
  )
}
