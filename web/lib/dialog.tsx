'use client'
// 全局自实现弹窗（替代浏览器原生 confirm/alert/prompt）。promise-based，主题色自适应。
// 用法：在根组件挂 <DialogHost />；任意处 await confirmDialog(msg) / alertDialog(msg) / promptDialog(msg, def)。
import { useState, useEffect } from 'react'

type Req =
  | { kind: 'alert'; message: string; resolve: () => void }
  | { kind: 'confirm'; message: string; resolve: (v: boolean) => void }
  | { kind: 'prompt'; message: string; def: string; resolve: (v: string | null) => void }

let pushReq: ((r: Req) => void) | null = null

export function alertDialog(message: string): Promise<void> {
  return new Promise((res) => { if (pushReq) pushReq({ kind: 'alert', message, resolve: res }); else res() })
}
export function confirmDialog(message: string): Promise<boolean> {
  return new Promise((res) => { if (pushReq) pushReq({ kind: 'confirm', message, resolve: res }); else res(false) })
}
export function promptDialog(message: string, def = ''): Promise<string | null> {
  return new Promise((res) => { if (pushReq) pushReq({ kind: 'prompt', message, def, resolve: res }); else res(null) })
}

const mask: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }
const modal: React.CSSProperties = { width: '340px', maxWidth: '90vw', background: 'var(--base-edge)', color: 'var(--text)', border: '1px solid var(--stroke)', borderRadius: '16px', padding: '20px', boxShadow: '0 20px 60px rgba(0,0,0,.5)' }
const inputS: React.CSSProperties = { width: '100%', background: 'var(--input-bg)', border: '1px solid var(--stroke)', borderRadius: '10px', padding: '9px 12px', color: 'var(--text)', fontSize: '13px', marginBottom: '14px' }
const ghost: React.CSSProperties = { fontSize: '13px', padding: '7px 14px', borderRadius: '9px', border: '1px solid var(--stroke)', background: 'transparent', color: 'var(--text)', cursor: 'pointer' }

export function DialogHost() {
  const [req, setReq] = useState<Req | null>(null)
  const [val, setVal] = useState('')
  useEffect(() => {
    pushReq = (r) => { setReq(r); if (r.kind === 'prompt') setVal(r.def) }
    return () => { pushReq = null }
  }, [])
  if (!req) return null
  const finish = (result: boolean | string | null | undefined) => {
    ;(req.resolve as (v: unknown) => void)(result)
    setReq(null)
  }
  const onCancel = () => finish(req.kind === 'confirm' ? false : req.kind === 'prompt' ? null : undefined)
  const onOk = () => finish(req.kind === 'confirm' ? true : req.kind === 'prompt' ? val : undefined)
  return (
    <div style={mask} onClick={onCancel}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: '14px', lineHeight: 1.6, marginBottom: req.kind === 'prompt' ? '12px' : '18px', whiteSpace: 'pre-wrap' }}>{req.message}</div>
        {req.kind === 'prompt' && <input autoFocus value={val} onChange={(e) => setVal(e.target.value)} style={inputS} onKeyDown={(e) => { if (e.key === 'Enter') onOk() }} />}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          {req.kind !== 'alert' && <button style={ghost} onClick={onCancel}>取消</button>}
          <button className="btn" onClick={onOk}>确定</button>
        </div>
      </div>
    </div>
  )
}
