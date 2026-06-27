import { useState, useEffect } from 'react'
import { IcChat, IcBook, IcClipboard, IcSparkle, IcUser, IcGear } from './icons'
import ChatPage from './components/chat/ChatPage'
import SourcesPage from './components/pages/SourcesPage'
import ItemsPage from './components/pages/ItemsPage'
import MemoryPage from './components/pages/MemoryPage'
import ProfilePage from './components/pages/ProfilePage'
import SettingsPage from './components/pages/SettingsPage'

type PageKey = 'chat' | 'sources' | 'items' | 'memory' | 'profile' | 'settings'

const NAV: { key: PageKey; label: string; icon: React.ReactNode; badge?: number }[] = [
  { key: 'chat', label: '对话', icon: <IcChat />, badge: 2 },
  { key: 'sources', label: '知识来源', icon: <IcBook /> },
  { key: 'items', label: '知识条目', icon: <IcClipboard /> },
  { key: 'memory', label: '记忆', icon: <IcSparkle /> },
  { key: 'profile', label: '个人资料', icon: <IcUser /> },
  { key: 'settings', label: '设置', icon: <IcGear /> },
]

export default function App() {
  const [page, setPage] = useState<PageKey>('chat')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  useEffect(() => { document.documentElement.setAttribute('data-theme', theme) }, [theme])

  return (
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
          <div className="logo">替</div>
          <div className="nav">
            {NAV.map(n => (
              <div key={n.key} className={'item' + (page === n.key ? ' active' : '')} onClick={() => setPage(n.key)}>
                {n.icon}<span className="lb">{n.label}</span>
                {n.badge ? <span className="badge">{n.badge}</span> : null}
              </div>
            ))}
          </div>
          <div className="me"><div className="av">昊</div><span>陈昊</span></div>
        </div>

        {page === 'chat' && <ChatPage />}
        {page === 'sources' && <SourcesPage />}
        {page === 'items' && <ItemsPage />}
        {page === 'memory' && <MemoryPage />}
        {page === 'profile' && <ProfilePage />}
        {page === 'settings' && <SettingsPage />}
      </div>
    </div>
  )
}
