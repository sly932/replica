'use client'

import { useState, useEffect } from 'react'
import { IcSparkle, IcFolder, IcEdit } from '@/lib/icons'
import { useReplica } from '@/lib/replicaContext'
import {
  listMemories, addMemory, patchMemory, deleteMemory,
  type Memory,
} from '@/lib/api/manage'
import { confirmDialog, alertDialog, promptDialog } from '@/lib/dialog'

// 新增记忆弹窗
function AddModal({
  onClose, onAdd,
}: {
  onClose: () => void
  onAdd: (kind: 'semantic' | 'episodic', content: string) => Promise<void>
}) {
  const [kind, setKind] = useState<'semantic' | 'episodic'>('semantic')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  return (
    <div className="ki-overlay" onClick={onClose}>
      <div className="ki-modal" style={{ background: 'var(--base-edge)', border: '1px solid var(--stroke)', color: 'var(--text)' }} onClick={(e) => e.stopPropagation()}>
        <h3>新增记忆</h3>
        <select className="sel" value={kind} onChange={(e) => setKind(e.target.value as 'semantic' | 'episodic')}>
          <option value="semantic">通用记忆（semantic）</option>
          <option value="episodic">领域记忆（episodic）</option>
        </select>
        <textarea
          className="ta"
          placeholder="输入记忆内容…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          autoFocus
        />
        <div className="mfoot">
          <button className="btn ghost" onClick={onClose} disabled={saving}>取消</button>
          <button
            className="btn"
            disabled={saving || !content.trim()}
            onClick={async () => {
              setSaving(true)
              try { await onAdd(kind, content.trim()) } finally { setSaving(false) }
            }}
          >{saving ? '保存中…' : '保存'}</button>
        </div>
      </div>
    </div>
  )
}

export default function MemoryPage() {
  const { currentId } = useReplica()
  const [mems, setMems] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    if (!currentId) return
    setLoading(true)
    listMemories(currentId).then((d) => { setMems(d); setLoading(false) }).catch(() => setLoading(false))
  }, [currentId])

  const reload = () => listMemories(currentId).then(setMems)

  const toggle = async (m: Memory) => {
    setMems((prev) => prev.map((x) => (x.id === m.id ? { ...x, enabled: !x.enabled } : x)))
    try { await patchMemory(m.id, { enabled: !m.enabled }) } catch (e) { await alertDialog((e as Error).message); reload() }
  }

  const edit = async (m: Memory) => {
    const content = await promptDialog('编辑记忆内容：', m.content || '')
    if (content == null || content === m.content) return
    setMems((prev) => prev.map((x) => (x.id === m.id ? { ...x, content } : x)))
    try { await patchMemory(m.id, { content }) } catch (e) { await alertDialog((e as Error).message); reload() }
  }

  const remove = async (m: Memory) => {
    if (!(await confirmDialog('删除这条记忆？（软删，可在库中恢复）'))) return
    setMems((prev) => prev.filter((x) => x.id !== m.id))
    try { await deleteMemory(m.id) } catch (e) { await alertDialog((e as Error).message); reload() }
  }

  const add = async (kind: 'semantic' | 'episodic', content: string) => {
    await addMemory(currentId, { kind, content })
    setShowAdd(false)
    await reload()
  }

  const semantic = mems.filter((m) => m.kind === 'semantic')
  const episodic = mems.filter((m) => m.kind === 'episodic')

  const Card = ({ m, icon }: { m: Memory; icon: React.ReactNode }) => (
    <div className="card" key={m.id} style={m.enabled ? undefined : { opacity: 0.55 }}>
      <div className="ico">{icon}</div>
      <div className="body">
        <div className="t">{m.content}</div>
        <div className="meta"><span>{m.kind === 'semantic' ? '通用记忆' : '领域记忆'}</span></div>
      </div>
      <div className="acts">
        <span className="iconbtn" title="编辑" onClick={() => edit(m)}><IcEdit /></span>
        <span className="iconbtn" title="删除" onClick={() => remove(m)}>🗑</span>
        <div className={'toggle' + (m.enabled ? ' on' : '')} onClick={() => toggle(m)} />
      </div>
    </div>
  )

  return (
    <div className="page show">
      <div className="wrap col">
        <div className="page-head row-head">
          <div><h1>记忆</h1><p>分身「越用越懂你」的依据，回答时按需召回</p></div>
          <button className="btn" onClick={() => setShowAdd(true)} disabled={!currentId}>＋ 新增记忆</button>
        </div>
        <div className="scroll">
          {loading && <div style={{ color: 'var(--mute)', padding: '12px 26px' }}>加载中…</div>}
          {!loading && (
            <>
              <div className="sect">通用记忆（semantic）</div>
              <div className="sect-body">
                {semantic.length === 0 && <div style={{ color: 'var(--mute)', padding: '4px 0 8px' }}>暂无</div>}
                {semantic.map((m) => <Card key={m.id} m={m} icon={<IcSparkle />} />)}
              </div>
              <div className="sect">领域记忆（episodic）</div>
              <div className="sect-body pb">
                {episodic.length === 0 && <div style={{ color: 'var(--mute)', padding: '4px 0 8px' }}>暂无</div>}
                {episodic.map((m) => <Card key={m.id} m={m} icon={<IcFolder />} />)}
              </div>
            </>
          )}
        </div>
      </div>
      {showAdd && <AddModal onClose={() => setShowAdd(false)} onAdd={add} />}
    </div>
  )
}
