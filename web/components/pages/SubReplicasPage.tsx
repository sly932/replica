'use client'
// 子分身管理：列出/创建/修改/删除/移交当前用户(父分身)名下的子分身。
import { useState, useEffect } from 'react'
import { useReplica } from '@/lib/replicaContext'
import { confirmDialog, alertDialog } from '@/lib/dialog'
import {
  listSubReplicas, createSubReplica, patchSubReplica, deleteSubReplica,
  type SubReplica,
} from '@/lib/api/subReplicas'

// ---- 自实现 Modal（主题色自适应）----
const mask: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }
const modal: React.CSSProperties = { width: '380px', maxWidth: '92vw', background: 'var(--base-edge)', color: 'var(--text)', border: '1px solid var(--stroke)', borderRadius: '16px', padding: '22px', boxShadow: '0 20px 60px rgba(0,0,0,.5)' }
const label: React.CSSProperties = { fontSize: '12px', color: 'var(--mute)', marginBottom: '5px', display: 'block' }
const inputS: React.CSSProperties = { width: '100%', background: 'var(--input-bg)', border: '1px solid var(--stroke)', borderRadius: '10px', padding: '9px 12px', color: 'var(--text)', fontSize: '13px', marginBottom: '14px', boxSizing: 'border-box' }
const ghost: React.CSSProperties = { fontSize: '13px', padding: '7px 14px', borderRadius: '9px', border: '1px solid var(--stroke)', background: 'transparent', color: 'var(--text)', cursor: 'pointer' }

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={mask} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>{title}</div>
        {children}
      </div>
    </div>
  )
}

// 创建子分身弹窗
function CreateModal({ onClose, onCreate }: { onClose: () => void; onCreate: (v: { name: string; mis_id: string; bio: string }) => Promise<void> }) {
  const [name, setName] = useState('')
  const [misId, setMisId] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)
  const submit = async () => {
    if (!name.trim() || !misId.trim()) { await alertDialog('名字和 mis_id 必填'); return }
    setSaving(true)
    try { await onCreate({ name: name.trim(), mis_id: misId.trim(), bio: bio.trim() }) }
    finally { setSaving(false) }
  }
  return (
    <Modal title="创建子分身" onClose={onClose}>
      <label style={label}>名字 *</label>
      <input autoFocus style={inputS} value={name} onChange={(e) => setName(e.target.value)} placeholder="子分身名字" />
      <label style={label}>mis_id *（唯一）</label>
      <input style={inputS} value={misId} onChange={(e) => setMisId(e.target.value)} placeholder="唯一标识，如 zhangsan" />
      <label style={label}>简介</label>
      <textarea style={{ ...inputS, minHeight: '70px', resize: 'vertical' }} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="一句话简介（可选）" />
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button style={ghost} onClick={onClose} disabled={saving}>取消</button>
        <button className="btn" onClick={submit} disabled={saving || !name.trim() || !misId.trim()}>{saving ? '创建中…' : '创建'}</button>
      </div>
    </Modal>
  )
}

// 修改子分身弹窗（name + bio）
function EditModal({ sub, onClose, onSave }: { sub: SubReplica; onClose: () => void; onSave: (v: { name: string; bio: string }) => Promise<void> }) {
  const [name, setName] = useState(sub.name || '')
  const [bio, setBio] = useState(sub.bio || '')
  const [saving, setSaving] = useState(false)
  const submit = async () => {
    if (!name.trim()) { await alertDialog('名字不能为空'); return }
    setSaving(true)
    try { await onSave({ name: name.trim(), bio: bio.trim() }) }
    finally { setSaving(false) }
  }
  return (
    <Modal title="修改子分身" onClose={onClose}>
      <label style={label}>名字 *</label>
      <input autoFocus style={inputS} value={name} onChange={(e) => setName(e.target.value)} />
      <label style={label}>简介</label>
      <textarea style={{ ...inputS, minHeight: '70px', resize: 'vertical' }} value={bio} onChange={(e) => setBio(e.target.value)} />
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button style={ghost} onClick={onClose} disabled={saving}>取消</button>
        <button className="btn" onClick={submit} disabled={saving || !name.trim()}>{saving ? '保存中…' : '保存'}</button>
      </div>
    </Modal>
  )
}

// 移交弹窗：选择目标分身
function TransferModal({ sub, targets, onClose, onTransfer }: {
  sub: SubReplica
  targets: { id: string; name: string; mis_id?: string }[]
  onClose: () => void
  onTransfer: (targetId: string) => Promise<void>
}) {
  const [sel, setSel] = useState('')
  const [saving, setSaving] = useState(false)
  const submit = async () => {
    if (!sel) { await alertDialog('请选择目标分身'); return }
    setSaving(true)
    try { await onTransfer(sel) }
    finally { setSaving(false) }
  }
  return (
    <Modal title={`移交「${sub.name}」`} onClose={onClose}>
      <label style={label}>移交给</label>
      {targets.length === 0 ? (
        <div style={{ color: 'var(--mute)', fontSize: '13px', marginBottom: '14px' }}>没有可选的其它分身</div>
      ) : (
        <select style={inputS} value={sel} onChange={(e) => setSel(e.target.value)}>
          <option value="">请选择目标分身…</option>
          {targets.map((t) => (
            <option key={t.id} value={t.id}>{t.name}{t.mis_id ? `（${t.mis_id}）` : ''}</option>
          ))}
        </select>
      )}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button style={ghost} onClick={onClose} disabled={saving}>取消</button>
        <button className="btn" onClick={submit} disabled={saving || !sel}>{saving ? '移交中…' : '确定移交'}</button>
      </div>
    </Modal>
  )
}

export default function SubReplicasPage() {
  const { currentId, replicas } = useReplica()
  const [subs, setSubs] = useState<SubReplica[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<SubReplica | null>(null)
  const [transferring, setTransferring] = useState<SubReplica | null>(null)

  useEffect(() => {
    if (!currentId) return
    setLoading(true)
    listSubReplicas(currentId).then((d) => { setSubs(d); setLoading(false) }).catch((e) => { alertDialog((e as Error).message); setLoading(false) })
  }, [currentId])

  const reload = () => listSubReplicas(currentId).then(setSubs).catch(() => {})

  const create = async (v: { name: string; mis_id: string; bio: string }) => {
    try {
      await createSubReplica({ parentId: currentId, ...v })
      setShowCreate(false)
      await reload()
    } catch (e) { await alertDialog((e as Error).message) }
  }

  const save = async (sub: SubReplica, v: { name: string; bio: string }) => {
    try {
      await patchSubReplica(sub.id, v)
      setEditing(null)
      await reload()
    } catch (e) { await alertDialog((e as Error).message) }
  }

  const remove = async (sub: SubReplica) => {
    if (!(await confirmDialog(`删除子分身「${sub.name}」？此操作不可恢复。`))) return
    setSubs((prev) => prev.filter((x) => x.id !== sub.id))
    try { await deleteSubReplica(sub.id) } catch (e) { await alertDialog((e as Error).message); reload() }
  }

  const transfer = async (sub: SubReplica, targetId: string) => {
    try {
      await patchSubReplica(sub.id, { parentId: targetId })
      setTransferring(null)
      await reload()
    } catch (e) { await alertDialog((e as Error).message) }
  }

  // 移交目标：所有分身里排除自己 + 当前父分身
  const transferTargets = (sub: SubReplica) =>
    replicas.filter((r) => r.id !== sub.id && r.id !== currentId).map((r) => ({ id: r.id, name: r.name, mis_id: r.mis_id }))

  return (
    <div className="page show">
      <div className="wrap col">
        <div className="page-head row-head">
          <div><h1>子分身</h1><p>挂在你名下的分身，可创建、修改、删除或移交给其它分身</p></div>
          <button className="btn" onClick={() => setShowCreate(true)} disabled={!currentId}>＋ 创建子分身</button>
        </div>
        <div className="scroll">
          {loading && <div style={{ color: 'var(--mute)', padding: '12px 26px' }}>加载中…</div>}
          {!loading && subs.length === 0 && <div style={{ color: 'var(--mute)', padding: '12px 26px' }}>还没有子分身，点右上角创建一个吧</div>}
          {!loading && subs.map((sub) => (
            <div className="card" key={sub.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div className="body" style={{ flex: 1 }}>
                <div className="t" style={{ fontWeight: 600 }}>{sub.name}</div>
                <div className="meta" style={{ color: 'var(--mute)', fontSize: '12px', margin: '3px 0' }}>mis_id：{sub.mis_id || '—'}</div>
                <div style={{ fontSize: '13px', color: 'var(--text)', opacity: 0.85 }}>{sub.bio || '（无简介）'}</div>
              </div>
              <div className="acts" style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button style={ghost} onClick={() => setEditing(sub)}>修改</button>
                <button style={ghost} onClick={() => setTransferring(sub)}>移交</button>
                <button style={ghost} onClick={() => remove(sub)}>删除</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={create} />}
      {editing && <EditModal sub={editing} onClose={() => setEditing(null)} onSave={(v) => save(editing, v)} />}
      {transferring && <TransferModal sub={transferring} targets={transferTargets(transferring)} onClose={() => setTransferring(null)} onTransfer={(t) => transfer(transferring, t)} />}
    </div>
  )
}
