'use client'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function DocView({
  title, author, role, content, date,
}: { title: string; author: string; role: string; content: string; date: string }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', padding: '56px 20px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 12, lineHeight: 1.3 }}>{title}</h1>
        <div style={{ fontSize: 13, color: 'var(--mute)', marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid var(--stroke)' }}>
          {author && (
            <>
              作者 <span style={{ color: 'var(--dim)', fontWeight: 600 }}>{author}</span>{role ? ` · ${role}` : ''}
              {date ? ' · ' : ''}
            </>
          )}
          {date}
        </div>
        <article className="md doc-md" style={{ lineHeight: 1.75, fontSize: 15 }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </article>
      </div>
    </div>
  )
}
