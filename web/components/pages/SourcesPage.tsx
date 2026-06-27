'use client'

import { useState, useEffect } from 'react'
import { IcDoc, IcEdit } from '@/lib/icons'
import { useReplica } from '@/lib/replicaContext'
import {
  listArticles, addArticle, patchArticle, deleteArticle,
  type Article,
} from '@/lib/api/manage'
import { confirmDialog, alertDialog, promptDialog } from '@/lib/dialog'

export default function SourcesPage() {
  const { currentId } = useReplica()
  const [docs, setDocs] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!currentId) return
    setLoading(true)
    listArticles(currentId).then((d) => { setDocs(d); setLoading(false) }).catch(() => setLoading(false))
  }, [currentId])

  const reload = () => listArticles(currentId).then(setDocs)
  // 文档展示页地址：优先用环境变量域名，否则兜底当前域名
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')
  const openDoc = (id: string) => window.open(`${appUrl}/doc/${id}`, '_blank')

  const upload = async () => {
    const title = await promptDialog('文档标题：')
    if (!title) return
    const content = (await promptDialog('文档正文（Markdown）：')) || ''
    if (!content) return
    setBusy(true)
    try {
      await addArticle(currentId, { title, content })
      await reload()
    } catch (e) {
      await alertDialog((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const toggle = async (d: Article) => {
    const next = d.status === 'enabled' ? 'disabled' : 'enabled'
    setDocs((prev) => prev.map((x) => (x.id === d.id ? { ...x, status: next } : x)))
    try { await patchArticle(d.id, { status: next }) } catch (e) { await alertDialog((e as Error).message); reload() }
  }

  const remove = async (d: Article) => {
    if (!(await confirmDialog(`删除「${d.title || '未命名'}」？此操作不可恢复。`))) return
    setDocs((prev) => prev.filter((x) => x.id !== d.id))
    try { await deleteArticle(d.id) } catch (e) { await alertDialog((e as Error).message); reload() }
  }

  return (
    <div className="page show">
      <div className="wrap">
        <div className="page-head row-head">
          <div>
            <h1>知识来源</h1>
            <p>分身回答只引用这里「已启用」的文档 · 共 {docs.length} 篇</p>
          </div>
          <button className="btn" onClick={upload} disabled={busy || !currentId}>{busy ? '入库中…' : '＋ 添加文档'}</button>
        </div>
        <div className="list scroll">
          {loading && <div style={{ color: 'var(--mute)', padding: '12px 4px' }}>加载中…</div>}
          {!loading && docs.length === 0 && <div style={{ color: 'var(--mute)', padding: '12px 4px' }}>暂无文档</div>}
          {docs.map((d) => (
            <div className="card" key={d.id}>
              <div className="ico"><IcDoc /></div>
              <div className="body">
                <div className="t" style={{ cursor: 'pointer' }} onClick={() => openDoc(d.id)} title="打开文档展示页">{d.title || '未命名文档'}</div>
                <div className="d">{(d.content || '').slice(0, 80) || '（无正文）'}</div>
                <div className="meta">
                  <span>{new Date(d.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="acts">
                <span className="iconbtn" title="打开/分享文档页" onClick={() => openDoc(d.id)}><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><path d="M15 3h6v6" /><path d="M10 14 21 3" /></svg></span>
                <span className="iconbtn" title="删除" onClick={() => remove(d)}><IcEdit /></span>
                <div className={'toggle' + (d.status === 'enabled' ? ' on' : '')} onClick={() => toggle(d)} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
