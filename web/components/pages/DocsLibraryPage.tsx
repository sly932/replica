'use client'
// 文档库：浏览/搜索全部知识库文档（全局，跨所有分身）
import { useState, useEffect } from 'react'
import { IcDoc, IcSearch } from '@/lib/icons'
import { listDocuments, type DocLibItem } from '@/lib/api/documents'

const PAGE_SIZE = 20

export default function DocsLibraryPage() {
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<DocLibItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // debounce 搜索关键词 ~300ms；关键词变化时回到第一页
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(q.trim()); setPage(1) }, 300)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    listDocuments(debouncedQ, page, PAGE_SIZE)
      .then((d) => { if (!alive) return; setItems(d.items); setTotal(d.total) })
      .catch((e) => { if (!alive) return; setError((e as Error).message) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [debouncedQ, page])

  // 文档展示页地址：优先环境变量域名，否则兜底当前域名
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')
  const openDoc = (id: string) => window.open(`${appUrl}/doc/${id}`, '_blank')

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="page show">
      <div className="wrap">
        <div className="page-head">
          <h1>文档库</h1>
          <p>浏览和搜索全部文档，点开查看或加进自己的知识来源</p>
        </div>

        <div className="search" style={{ marginInline: 26 }}>
          <IcSearch />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索文档标题…（回车或自动搜索，清空查看全部）"
          />
        </div>

        <div className="list scroll">
          {loading && <div style={{ color: 'var(--mute)', padding: '12px 4px' }}>加载中…</div>}
          {!loading && error && <div style={{ color: 'var(--red)', padding: '12px 4px' }}>{error}</div>}
          {!loading && !error && items.length === 0 && (
            <div style={{ color: 'var(--mute)', padding: '12px 4px' }}>
              {debouncedQ ? `没有匹配「${debouncedQ}」的文档` : '暂无文档'}
            </div>
          )}
          {!loading && !error && items.map((d) => (
            <div className="card" key={d.id} style={{ cursor: 'pointer' }} onClick={() => openDoc(d.id)}>
              <div className="ico"><IcDoc /></div>
              <div className="body">
                <div className="t" title="打开文档展示页">{d.title}</div>
                <div className="meta">
                  <span>{d.author}</span>
                  <span>{new Date(d.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {!loading && !error && total > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
            padding: '12px 26px 22px', color: 'var(--mute)', fontSize: 12.5,
          }}>
            <button
              className="btn ghost"
              disabled={page <= 1}
              style={{ opacity: page <= 1 ? 0.5 : 1, cursor: page <= 1 ? 'default' : 'pointer' }}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >上一页</button>
            <span>第 {page} / {totalPages} 页 · 共 {total} 条</span>
            <button
              className="btn ghost"
              disabled={page >= totalPages}
              style={{ opacity: page >= totalPages ? 0.5 : 1, cursor: page >= totalPages ? 'default' : 'pointer' }}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >下一页</button>
          </div>
        )}
      </div>
    </div>
  )
}
