'use client'

import { useState, useEffect } from 'react'
import { IcChat, IcBook, IcClipboard, IcSparkle, IcUser, IcGear } from '@/lib/icons'
import { ReplicaContext, type ReplicaLite } from '@/lib/replicaContext'
import { prefetchUser } from '@/lib/api/prefetch'
import { DialogHost } from '@/lib/dialog'
import ChatPage from '@/components/chat/ChatPage'
import SourcesPage from '@/components/pages/SourcesPage'
import ItemsPage from '@/components/pages/ItemsPage'
import MemoryPage from '@/components/pages/MemoryPage'
import ProfilePage from '@/components/pages/ProfilePage'
import SettingsPage from '@/components/pages/SettingsPage'

type PageKey = 'chat' | 'sources' | 'items' | 'memory' | 'profile' | 'settings'

const NAV: { key: PageKey; label: string; icon: React.ReactNode }[] = [
  { key: 'chat', label: '对话', icon: <IcChat /> },
  { key: 'sources', label: '知识来源', icon: <IcBook /> },
  { key: 'items', label: '知识条目', icon: <IcClipboard /> },
  { key: 'memory', label: '记忆', icon: <IcSparkle /> },
  { key: 'profile', label: '个人资料', icon: <IcUser /> },
  { key: 'settings', label: '设置', icon: <IcGear /> },
]

// 弹窗 / 浮层样式：统一用主题变量（暗/亮自适应）
const popStyle: React.CSSProperties = {
  position: 'absolute', left: '100%', bottom: 0, marginLeft: '8px', minWidth: '120px',
  background: 'var(--base-edge)', color: 'var(--text)', border: '1px solid var(--stroke)', borderRadius: '10px',
  padding: '6px', boxShadow: '0 8px 28px rgba(0,0,0,.4)', zIndex: 50,
}
const popItemStyle: React.CSSProperties = { padding: '8px 12px', borderRadius: '7px', fontSize: '13px', cursor: 'pointer', color: 'var(--text)' }
const maskStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', zIndex: 100,
}
const modalStyle: React.CSSProperties = {
  width: '380px', maxWidth: '90vw', background: 'var(--base-edge)', color: 'var(--text)',
  border: '1px solid var(--stroke)', borderRadius: '16px', padding: '20px', boxShadow: '0 20px 60px rgba(0,0,0,.5)',
}
const switchInputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--input-bg)', border: '1px solid var(--stroke)',
  borderRadius: '10px', padding: '9px 12px', color: 'var(--text)', fontSize: '13px', marginBottom: '10px',
}
const switchListStyle: React.CSSProperties = { maxHeight: '300px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }
const switchItemStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '10px', cursor: 'pointer', color: 'var(--text)' }
const switchItemActive: React.CSSProperties = { background: 'var(--accent-soft)', outline: '1px solid var(--accent)' }
const btnGhost: React.CSSProperties = {
  fontSize: '13px', padding: '7px 14px', borderRadius: '9px', border: '1px solid var(--stroke)',
  background: 'transparent', color: 'var(--text)', cursor: 'pointer',
}

export default function Workbench() {
  const [page, setPage] = useState<PageKey>('chat')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [replicas, setReplicas] = useState<ReplicaLite[]>([])
  const [currentId, setCurrentId] = useState('')
  const [showMenu, setShowMenu] = useState(false)
  const [showSwitch, setShowSwitch] = useState(false)
  const [sq, setSq] = useState('')
  const [sel, setSel] = useState('')

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme) }, [theme])

  useEffect(() => {
    fetch('/api/replicas').then((r) => r.json()).then((d) => {
      const rs: ReplicaLite[] = d.replicas || []
      setReplicas(rs)
      if (rs[0]) setCurrentId(rs[0].id)
    }).catch(() => {})
  }, [])

  // 进入 / 切换用户 → 预加载该用户数据进缓存
  useEffect(() => { if (currentId) prefetchUser(currentId).catch(() => {}) }, [currentId])

  const current = replicas.find((r) => r.id === currentId)

  const confirmSwitch = () => {
    if (sel) setCurrentId(sel)
    setShowSwitch(false)
  }

  return (
    <ReplicaContext.Provider value={{ currentId, current, replicas, setCurrentId }}>
      <div className="app">
        <div className="titlebar">
          <span className="dot r" /><span className="dot y" /><span className="dot g" />
          <span className="t">Replica · 数字分身工作台</span>
          <button className="theme-btn" title="切换日/夜模式" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
            <svg className="ic-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
            <svg className="ic-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
          </button>
        </div>

        <div className="main">
          <div className="navbar">
            <div className="logo">R</div>
            <div className="nav">
              {NAV.map((n) => (
                <div key={n.key} className={'item' + (page === n.key ? ' active' : '')} onClick={() => setPage(n.key)}>
                  {n.icon}<span className="lb">{n.label}</span>
                </div>
              ))}
            </div>
            <div className="me" style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setShowMenu((v) => !v)}>
              <div className="av">{current?.name?.[0] || '?'}</div>
              <span>{current?.name || '—'}</span>
              {showMenu && (
                <div style={popStyle} onClick={(e) => e.stopPropagation()}>
                  <div style={popItemStyle} onClick={() => { setSel(currentId); setSq(''); setShowSwitch(true); setShowMenu(false) }}>切换用户</div>
                </div>
              )}
            </div>
          </div>

          {page === 'chat' && <ChatPage />}
          {page === 'sources' && <SourcesPage />}
          {page === 'items' && <ItemsPage />}
          {page === 'memory' && <MemoryPage />}
          {page === 'profile' && <ProfilePage />}
          {page === 'settings' && <SettingsPage />}
        </div>
      </div>

      {/* 切换用户弹窗 */}
      {showSwitch && (
        <div style={maskStyle} onClick={() => setShowSwitch(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px', color: 'var(--text)' }}>切换用户</div>
            <input autoFocus value={sq} onChange={(e) => setSq(e.target.value)} placeholder="搜索分身…" style={switchInputStyle} />
            <div style={switchListStyle}>
              {replicas.filter((r) => r.name.includes(sq)).map((r) => (
                <div key={r.id} onClick={() => setSel(r.id)} style={{ ...switchItemStyle, ...(sel === r.id ? switchItemActive : {}) }}>
                  <div className="av" style={{ width: 30, height: 30, fontSize: 12 }}>{r.name?.[0]}</div>
                  <div><div style={{ fontWeight: 600 }}>{r.name}</div><div style={{ fontSize: 11, color: 'var(--dim)' }}>{r.role}{r.team ? ` · ${r.team}` : ''}</div></div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '14px' }}>
              <button style={btnGhost} onClick={() => setShowSwitch(false)}>取消</button>
              <button className="btn" onClick={confirmSwitch}>确定</button>
            </div>
          </div>
        </div>
      )}

      <DialogHost />
    </ReplicaContext.Provider>
  )
}
