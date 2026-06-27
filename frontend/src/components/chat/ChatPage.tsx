import { useState, useRef, useEffect } from 'react'
import { PEOPLE, ME } from '../../data/mock'
import type { Person, Thread, Msg, TabKey } from '../../types'
import { IcSearch, IcSend } from '../../icons'

function MsgView({ m }: { m: Msg }) {
  if (m.type === 'handoff') {
    return (
      <div className={`handoff ${m.side}`}>
        <div className="h-t">🤔 这个我不敢替陈昊乱答</div>
        <span dangerouslySetInnerHTML={{ __html: m.text }} />
        <div className="h-status"><span className="tick">✓</span> <span dangerouslySetInnerHTML={{ __html: m.hStatus || '' }} /></div>
      </div>
    )
  }
  return (
    <div className={`row ${m.side}`}>
      <div className={`mini-av ${m.av!.cls}`}>{m.av!.ini}</div>
      <div className="bubble">
        {m.text}
        {m.list && <ol className="ans-list">{m.list.map((li, i) => <li key={i}>{li}</li>)}</ol>}
        {m.src && <span className="src">📄 来源：{m.src}</span>}
      </div>
    </div>
  )
}

export default function ChatPage() {
  const [people, setPeople] = useState<Person[]>(PEOPLE)
  const [personId, setPersonId] = useState('zheng')
  const [tab, setTab] = useState<TabKey>('askMe')
  const [threadId, setThreadId] = useState<string>('z1')
  const [q, setQ] = useState('')
  const [input, setInput] = useState('')
  const msgsRef = useRef<HTMLDivElement>(null)

  const person = people.find(p => p.id === personId)!
  const threads = person[tab]
  const thread = threads.find(t => t.id === threadId)

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight
  }, [personId, tab, threadId, thread?.msgs.length])

  const selectPerson = (id: string) => {
    const p = people.find(x => x.id === id)!
    const t: TabKey = p[tab].length ? tab : (p.askMe.length ? 'askMe' : 'iAsk')
    setPersonId(id); setTab(t); setThreadId((p[t][0] || ({} as Thread)).id)
  }
  const selectTab = (t: TabKey) => { setTab(t); setThreadId((person[t][0] || ({} as Thread)).id) }
  const send = () => {
    const v = input.trim()
    if (!v || !thread) return
    setPeople(prev => prev.map(p => p.id !== personId ? p : {
      ...p,
      [tab]: p[tab].map(t => t.id !== threadId ? t : { ...t, msgs: [...t.msgs, { side: 'right', av: ME, type: 'text', text: v } as Msg] }),
    }))
    setInput('')
  }

  return (
    <div className="page show">
      {/* 人员列表 */}
      <div className="people col">
        <div className="search"><IcSearch className="si" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="搜索人员…" /></div>
        <div className="plist scroll">
          {people.filter(p => p.name.includes(q)).map(p => (
            <div key={p.id} className={'pitem' + (p.id === personId ? ' active' : '')} onClick={() => selectPerson(p.id)}>
              <div className={`av ${p.cls}`}>{p.ini}{p.online && <span className="online" />}</div>
              <div className="x">
                <div className="n">{p.name}{p.leave && <span style={{ fontSize: '9.5px', color: 'var(--amber)', border: '1px solid rgba(240,168,90,.4)', borderRadius: '6px', padding: '0 5px' }}>{p.leave}</span>} <time>{p.time}</time></div>
                <div className="m">{p.last}</div>
              </div>
              {p.unread > 0 && <span className="unread">{p.unread}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* 会话列表 */}
      <div className="threads col">
        <div className="tabs">
          <div className={'tab' + (tab === 'askMe' ? ' active' : '')} onClick={() => selectTab('askMe')}>TA 问我</div>
          <div className={'tab' + (tab === 'iAsk' ? ' active' : '')} onClick={() => selectTab('iAsk')}>我问 TA</div>
        </div>
        <div className="tlist scroll">
          {threads.length === 0
            ? <div className="empty-thread">{tab === 'askMe' ? '还没有人向 TA 提问' : `你还没向「${person.name} 的分身」提过问`}</div>
            : threads.map(t => (
              <div key={t.id} className={'titem' + (t.id === threadId ? ' active' : '')} onClick={() => setThreadId(t.id)}>
                <div className="tt">{t.title}</div>
                <div className="td"><span className={`chip ${t.status === 'wait' ? 'wait' : 'done'}`}>{t.status === 'wait' ? '待回答' : '已回答'}</span> {t.time}</div>
              </div>
            ))}
        </div>
      </div>

      {/* 聊天内容 */}
      <div className="chatwin">
        {thread ? (
          <>
            <div className="cw-head">
              <div className={`av ${person.cls}`}>{person.ini}{person.online && <span className="online" />}</div>
              <div>
                <div className="hn">{person.name} <span className="pill">{person.role}</span></div>
                <div className="hs">{tab === 'askMe' ? '正在向「陈昊 的分身」提问' : `「${person.name} 的分身」· 7×24 在线`}</div>
              </div>
              {person.memo && <div className="memo">{person.memo}</div>}
            </div>
            <div className="msgs scroll" ref={msgsRef}>
              <div className="daydiv">{tab === 'askMe' ? '你的分身代你回答' : `你向 ${person.name} 的分身提问`}</div>
              {thread.msgs.map((m, i) => <MsgView key={i} m={m} />)}
            </div>
            <div className="composer">
              <div className="cbox">
                <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send() }} placeholder="输入消息…回车或点击发送" />
                <button className="send" onClick={send}><IcSend /></button>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-chat"><div className="e-ic">💬</div>选择左侧一条会话查看对话</div>
        )}
      </div>
    </div>
  )
}
