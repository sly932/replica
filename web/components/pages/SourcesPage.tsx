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

  const upload = async () => {
    const title = await promptDialog('文档标题：')
    if (!title) return
    const content = (await promptDialog('文档正文（留空则改用文档链接）：')) || ''
    let sourceUrl: string | undefined
    if (!content) {
      sourceUrl = (await promptDialog('文档链接（如 https://docs.xinglan.com/...）：')) || undefined
      if (!sourceUrl) return
    }
    setBusy(true)
    try {
      await addArticle(currentId, { title, content: content || undefined, sourceUrl })
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
                <div className="t">{d.title || '未命名文档'}</div>
                <div className="d">{(d.content || '').slice(0, 80) || '（无正文）'}</div>
                <div className="meta">
                  {d.source_url && <span>🔗 {d.source_url}</span>}
                  <span>{new Date(d.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="acts">
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
