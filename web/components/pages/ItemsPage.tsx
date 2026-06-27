'use client'

import { useState, useEffect, useCallback } from 'react'
import { IcBulb } from '@/lib/icons'
import { useReplica } from '@/lib/replicaContext'
import { cacheGet, cacheSet, cacheClear } from '@/lib/cache'

// ---- 类型（页面内 inline，不动 lib/types.ts）----
type KnowledgeStatus = 'pending_answer' | 'pending_review' | 'approved' | 'archived'
interface KItem {
  id: string
  replica_id: string
  question: string | null
  answer: string | null
  source: 'human' | 'reasoning' | null
  status: KnowledgeStatus
  created_at: string
}

const TABS: { key: KnowledgeStatus; label: string }[] = [
  { key: 'pending_answer', label: '待回答' },
  { key: 'pending_review', label: '待审批' },
  { key: 'approved', label: '已通过' },
  { key: 'archived', label: '已归档' },
]

const SOURCE_LABEL: Record<string, string> = { human: '真人补答', reasoning: '推理沉淀' }

function fmtTime(s: string) {
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// ---- 编辑/补答弹窗 ----
function EditModal({
  item, title, hint, onClose, onSave,
}: {
  item: KItem
  title: string
  hint: string
  onClose: () => void
  onSave: (answer: string) => Promise<void>
}) {
  const [answer, setAnswer] = useState(item.answer ?? '')
  const [saving, setSaving] = useState(false)
  return (
    <div className="ki-overlay" onClick={onClose}>
      <div className="ki-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <div className="q">{item.question || '（无问题）'}</div>
        <textarea
          className="ta"
          placeholder={hint}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          autoFocus
        />
        <div className="mfoot">
          <button className="btn ghost" onClick={onClose} disabled={saving}>取消</button>
          <button
            className="btn"
            disabled={saving || !answer.trim()}
            onClick={async () => {
              setSaving(true)
              try { await onSave(answer.trim()) } finally { setSaving(false) }
            }}
          >{saving ? '保存中…' : '保存'}</button>
        </div>
      </div>
    </div>
  )
}

export default function ItemsPage() {
  const { currentId: replicaId } = useReplica()
  const [tab, setTab] = useState<KnowledgeStatus>('pending_answer')
  const [items, setItems] = useState<KItem[]>([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState<{ item: KItem; mode: 'answer' | 'edit' } | null>(null)

  const load = useCallback(async () => {
    if (!replicaId) return
    const key = `knowledge-items:${replicaId}:${tab}`
    const hit = cacheGet<KItem[]>(key)
    if (hit) { setItems(hit); return }
    setLoading(true)
    try {
      const r = await fetch(`/api/knowledge-items?replicaId=${replicaId}&status=${tab}`)
      const d = await r.json()
      const list: KItem[] = d.items || []
      cacheSet(key, list)
      setItems(list)
    } catch { setItems([]) } finally { setLoading(false) }
  }, [replicaId, tab])

  useEffect(() => { load() }, [load])

  async function patch(id: string, body: { status?: KnowledgeStatus; answer?: string }) {
    await fetch(`/api/knowledge-items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    cacheClear(`knowledge-items:${replicaId}:`)
    await load()
  }

  async function remove(id: string) {
    await fetch(`/api/knowledge-items/${id}`, { method: 'DELETE' })
    cacheClear(`knowledge-items:${replicaId}:`)
    await load()
  }

  function renderActs(it: KItem) {
    switch (tab) {
      case 'pending_answer':
        return <button className="btn" onClick={() => setModal({ item: it, mode: 'answer' })}>补答</button>
      case 'pending_review':
        return (<>
          <button className="btn" onClick={() => patch(it.id, { status: 'approved' })}>通过</button>
          <button className="btn ghost" onClick={() => patch(it.id, { status: 'archived' })}>驳回</button>
          <button className="btn ghost" onClick={() => setModal({ item: it, mode: 'edit' })}>编辑</button>
        </>)
      case 'approved':
        return (<>
          <button className="btn ghost" onClick={() => setModal({ item: it, mode: 'edit' })}>编辑</button>
          <button className="btn ghost" onClick={() => patch(it.id, { status: 'archived' })}>归档</button>
        </>)
      case 'archived':
        return (<>
          <button className="btn ghost" onClick={() => patch(it.id, { status: 'pending_review' })}>恢复</button>
          <button className="btn ghost" onClick={() => remove(it.id)}>删除</button>
        </>)
    }
  }

  return (
    <div className="page show">
      <div className="wrap">
        <div className="page-head ki-head">
          <div>
            <h1>知识条目</h1>
            <p>由「答不出→真人补答」与「长链路推理」自动沉淀的问答条目</p>
          </div>
        </div>

        <div className="tabs ki-tabs">
          {TABS.map((t) => (
            <div key={t.key} className={'tab' + (tab === t.key ? ' active' : '')} onClick={() => setTab(t.key)}>
              {t.label}
            </div>
          ))}
        </div>

        <div className="list scroll">
          {loading ? (
            <div className="ki-empty">加载中…</div>
          ) : items.length === 0 ? (
            <div className="ki-empty">该分类暂无条目</div>
          ) : items.map((it) => (
            <div className="card" key={it.id}>
              <div className="ico"><IcBulb /></div>
              <div className="body">
                <div className="t">{it.question || '（无问题）'}</div>
                <div className="d">{it.answer || '（待回答）'}</div>
                <div className="meta">
                  <span className={'chip ' + (it.status === 'approved' ? 'done' : 'wait')}>
                    {it.source ? SOURCE_LABEL[it.source] || it.source : '未知来源'}
                  </span>
                  <span>{fmtTime(it.created_at)}</span>
                </div>
              </div>
              <div className="acts ki-acts-col">{renderActs(it)}</div>
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <EditModal
          item={modal.item}
          title={modal.mode === 'answer' ? '补答（提交后自动通过并入库）' : '编辑答案'}
          hint={modal.mode === 'answer' ? '以分身主人的身份填写答案…' : '修改答案…'}
          onClose={() => setModal(null)}
          onSave={async (answer) => {
            if (modal.mode === 'answer') {
              await patch(modal.item.id, { status: 'approved', answer })
            } else {
              await patch(modal.item.id, { answer })
            }
            setModal(null)
          }}
        />
      )}
    </div>
  )
}
