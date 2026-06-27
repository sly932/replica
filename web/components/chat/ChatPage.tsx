import { useState, useRef, useEffect } from 'react'
import type { Person, Msg, TabKey, AvCls, ToolCall } from '@/lib/types'
import { IcSearch, IcSend } from '@/lib/icons'
import { streamChat } from '@/lib/api/chat'
import { listConversations, createConversation, getMessages, type Conv, type ApiMsg } from '@/lib/api/conversations'
import { cacheGet, cacheSet, cacheClear } from '@/lib/cache'
import { useReplica } from '@/lib/replicaContext'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const ME = { cls: 'c2' as AvCls, ini: '你' }
const CLS: AvCls[] = ['c1', 'c2', 'c3', 'c4', 'c5']
const DIR: Record<TabKey, 'ask_me' | 'i_ask'> = { askMe: 'ask_me', iAsk: 'i_ask' }
const TOOL_LABEL: Record<string, string> = {
  search_knowledge: '检索知识库', search_memory: '检索记忆', search_conversation: '检索历史会话',
  read_document: '读取文档', read_knowledge_item: '读取知识条目', save_question: '登记待回答问题',
  save_insight: '沉淀洞见', manage_memory: '管理记忆',
}

const preStyle: React.CSSProperties = {
  whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: 'var(--input-bg)',
  padding: '6px 8px', borderRadius: '6px', maxHeight: '200px', overflow: 'auto', margin: 0, fontSize: '11px',
}

function toPerson(r: { id: string; name: string; role?: string; org?: string; team?: string }, i: number): Person {
  return {
    id: r.id, name: r.name, role: r.role || '', org: r.org || '', team: r.team || '',
    cls: CLS[i % CLS.length], ini: r.name?.[0] || '?', online: true,
    unread: 0, last: r.role || r.team || '', time: '', askMe: [], iAsk: [],
  }
}

function ToolCallCard({ tc }: { tc: ToolCall }) {
  const [open, setOpen] = useState(false)
  const label = TOOL_LABEL[tc.name] || tc.name
  const running = tc.result === undefined
  return (
    <div style={{ border: '1px solid var(--stroke)', borderRadius: '10px', margin: '6px 0', overflow: 'hidden', background: 'var(--glass)' }}>
      <div onClick={() => setOpen(!open)} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '7px 10px', cursor: 'pointer', fontSize: '12.5px', color: 'var(--text)' }}>
        <span>🔧</span>
        <span>调用 <b>{label}</b></span>
        <span style={{ fontSize: '11px', color: running ? 'var(--mute)' : tc.isError ? 'var(--red)' : 'var(--ok)' }}>{running ? '运行中…' : tc.isError ? '✗ 出错' : '✓'}</span>
        <span style={{ marginLeft: 'auto', color: 'var(--dim)' }}>{open ? '▾' : '▸'}</span>
      </div>
      {open && (
        <div style={{ padding: '8px 10px', borderTop: '1px solid var(--stroke-soft)' }}>
          <div style={{ color: 'var(--dim)', fontSize: '11px', marginBottom: '3px' }}>参数</div>
          <pre style={preStyle}>{JSON.stringify(tc.args ?? {}, null, 2)}</pre>
          {!running && (
            <>
              <div style={{ color: 'var(--dim)', fontSize: '11px', margin: '6px 0 3px' }}>结果</div>
              <pre style={preStyle}>{typeof tc.result === 'string' ? tc.result : JSON.stringify(tc.result, null, 2)}</pre>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function MsgView({ m }: { m: Msg }) {
  return (
    <div className={`row ${m.side}`}>
      <div className={`mini-av ${m.av!.cls}`}>{m.av!.ini}</div>
      <div className="bubble md">
        {m.toolCalls?.map((tc) => <ToolCallCard key={tc.id} tc={tc} />)}
        {m.text && <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>}
      </div>
    </div>
  )
}

interface Streaming { text: string; toolCalls: ToolCall[]; abort: AbortController }

export default function ChatPage() {
  const { currentId, replicas } = useReplica()
  const [personId, setPersonId] = useState('')
  const [tab, setTab] = useState<TabKey>('iAsk')
  const [convs, setConvs] = useState<Conv[]>([])
  const [convId, setConvId] = useState('')
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [streamingMap, setStreamingMap] = useState<Record<string, Streaming>>({})
  const [queued, setQueued] = useState<Record<string, number>>({})
  const [showSys, setShowSys] = useState(false)
  const [sysText, setSysText] = useState('')
  const [q, setQ] = useState('')
  const [input, setInput] = useState('')
  const msgsRef = useRef<HTMLDivElement>(null)
  const convIdRef = useRef('')
  const streamingMapRef = useRef<Record<string, Streaming>>({})
  const queueRef = useRef<Record<string, string[]>>({})

  const people = replicas.map(toPerson)
  const person = people.find((p) => p.id === personId)
  // i_ask(我问TA)：被问=personId，提问者=当前用户；ask_me(TA问我)：被问=当前用户的分身
  // 选中分身(personId)始终是被问/回答方；我问TA=我作提问者，TA问我=列别人问它的
  const convReplicaId = personId
  const askerId = tab === 'iAsk' ? currentId : undefined

  useEffect(() => { convIdRef.current = convId }, [convId])
  useEffect(() => { streamingMapRef.current = streamingMap }, [streamingMap])
  useEffect(() => { if (!personId && replicas[0]) setPersonId(replicas[0].id) }, [replicas, personId])

  const toMsg = (m: ApiMsg, p?: Person): Msg =>
    m.role === 'user'
      ? { side: 'right', av: ME, type: 'text', text: m.content }
      : { side: 'left', av: { cls: p?.cls || 'c1', ini: p?.ini || '?' }, type: 'text', text: m.content, toolCalls: m.tool_calls || undefined }

  const loadMsgs = (cid: string) => {
    const p = people.find((x) => x.id === personId)
    const ck = `msgs:${cid}`
    const cached = cacheGet<ApiMsg[]>(ck)
    if (cached) { setMsgs(cached.map((m) => toMsg(m, p))); return }
    getMessages(cid).then((ms) => { cacheSet(ck, ms); setMsgs(ms.map((m) => toMsg(m, p))) }).catch(() => setMsgs([]))
  }

  // 分身/tab/当前用户 变 → 拉会话（按 asker 过滤），选第一个。切换用户即重载。
  useEffect(() => {
    if (!convReplicaId || !currentId) return
    let alive = true
    const ck = `convs:${convReplicaId}:${tab}:${askerId || 'all'}`
    const apply = (cs: Conv[]) => {
      if (!alive) return
      setConvs(cs)
      if (cs[0]) { setConvId(cs[0].id); loadMsgs(cs[0].id) }
      else { setConvId(''); setMsgs([]) }
    }
    const cached = cacheGet<Conv[]>(ck)
    if (cached) { apply(cached); return () => { alive = false } }
    listConversations(convReplicaId, DIR[tab], askerId).then((cs) => { cacheSet(ck, cs); apply(cs) }).catch(() => {})
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personId, tab, currentId])

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight
  }, [convId, msgs.length, streamingMap])

  const selectPerson = (id: string) => setPersonId(id)
  const selectConv = (id: string) => { setConvId(id); loadMsgs(id) }
  // 新建对话只切到空白态，不写表；发首条消息时(doSend convId 为空)才 createConversation
  const newConv = () => { setConvId(''); setMsgs([]) }

  const doSend = async (v: string, p: Person, curConvId: string) => {
    const botAv = { cls: p.cls, ini: p.ini }
    const cReplica = p.id // 选中分身始终是回答方
    const cAsker = currentId
    const isOwner = tab === 'iAsk' && p.id === currentId // 我问我自己的分身=主人场景
    let cid = curConvId
    if (!cid) {
      const conv = await createConversation(cReplica, DIR[tab], cAsker)
      cid = conv.id
      cacheClear('convs:')
      setConvs((prev) => [conv, ...prev]); setConvId(cid)
    }
    setMsgs((prev) => [...prev, { side: 'right', av: ME, type: 'text', text: v }])
    const abort = new AbortController()
    setStreamingMap((m) => ({ ...m, [cid]: { text: '', toolCalls: [], abort } }))
    let acc = ''
    await streamChat(v, {
      replicaId: cReplica,
      conversationId: cid,
      isOwner,
      signal: abort.signal,
      onToolStart: (c) => setStreamingMap((m) => (m[cid] ? { ...m, [cid]: { ...m[cid], toolCalls: [...m[cid].toolCalls, { id: c.id, name: c.name, args: c.args }] } } : m)),
      onToolEnd: (c) => setStreamingMap((m) => (m[cid] ? { ...m, [cid]: { ...m[cid], toolCalls: m[cid].toolCalls.map((t) => (t.id === c.id ? { ...t, result: c.result, isError: c.isError } : t)) } } : m)),
      onDelta: (d) => { acc += d; setStreamingMap((m) => (m[cid] ? { ...m, [cid]: { ...m[cid], text: acc } } : m)) },
      onDone: () => {
        const finalTools = streamingMapRef.current[cid]?.toolCalls || []
        if (convIdRef.current === cid) setMsgs((prev) => [...prev, { side: 'left', av: botAv, type: 'text', text: acc, toolCalls: finalTools.length ? finalTools : undefined }])
        setStreamingMap((m) => { const n = { ...m }; delete n[cid]; return n })
        cacheClear(`msgs:${cid}`); cacheClear('convs:')
        listConversations(cReplica, DIR[tab], tab === 'iAsk' ? currentId : undefined).then((cs) => { cacheSet(`convs:${cReplica}:${tab}:${tab === 'iAsk' ? currentId : 'all'}`, cs); setConvs(cs) }).catch(() => {})
        const ql = queueRef.current[cid] || []
        if (ql.length) {
          const next = ql.shift()!
          setQueued((qq) => ({ ...qq, [cid]: ql.length }))
          void doSend(next, p, cid)
        }
      },
      onError: (e) => {
        if (convIdRef.current === cid) setMsgs((prev) => [...prev, { side: 'left', av: botAv, type: 'text', text: `（出错：${e}）` }])
        setStreamingMap((m) => { const n = { ...m }; delete n[cid]; return n })
      },
    })
  }

  const send = () => {
    const v = input.trim()
    if (!v || !person) return
    setInput('')
    if (convId && streamingMap[convId]) {
      queueRef.current[convId] = [...(queueRef.current[convId] || []), v]
      setQueued((qq) => ({ ...qq, [convId]: queueRef.current[convId].length }))
      return
    }
    void doSend(v, person, convId)
  }

  const stop = () => {
    const s = convId ? streamingMap[convId] : undefined
    s?.abort.abort()
  }

  // 查看当前会话生效的完整系统提示词（人格 + 场景）
  const viewSys = async () => {
    if (!convReplicaId) return
    const owner = tab === 'iAsk' && personId === currentId
    setSysText('加载中…'); setShowSys(true)
    try {
      const r = await fetch(`/api/system-prompt?replicaId=${convReplicaId}&isOwner=${owner}`)
      const d = await r.json()
      setSysText(d.systemPrompt || '(空)')
    } catch { setSysText('(加载失败)') }
  }

  const cur = convId ? streamingMap[convId] : undefined
  const busy = !!cur
  const qCount = convId ? queued[convId] || 0 : 0

  return (
    <div className="page show">
      <div className="people col">
        <div className="search"><IcSearch className="si" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索分身…" /></div>
        <div className="plist scroll">
          {people.length === 0 && <div className="empty-thread">加载分身中…</div>}
          {people.filter((p) => p.name.includes(q)).map((p) => (
            <div key={p.id} className={'pitem' + (p.id === personId ? ' active' : '')} onClick={() => selectPerson(p.id)}>
              <div className={`av ${p.cls}`}>{p.ini}{p.online && <span className="online" />}</div>
              <div className="x">
                <div className="n">{p.name} <time>{p.team}</time></div>
                <div className="m">{p.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="threads col">
        <div className="tabs">
          <div className={'tab' + (tab === 'askMe' ? ' active' : '')} onClick={() => setTab('askMe')}>TA 问我</div>
          <div className={'tab' + (tab === 'iAsk' ? ' active' : '')} onClick={() => setTab('iAsk')}>我问 TA</div>
        </div>
        <div className="tlist scroll">
          {person && (
            <div className="titem new-conv" onClick={newConv} style={{ textAlign: 'center', color: 'var(--accent)', fontWeight: 600 }}>＋ 新对话</div>
          )}
          {convs.map((c) => (
            <div key={c.id} className={'titem' + (c.id === convId ? ' active' : '')} onClick={() => selectConv(c.id)}>
              <div className="tt">{c.title || '新对话'}</div>
              <div className="td">{streamingMap[c.id] ? <span className="chip wait">回复中…</span> : <span className="chip done">已回答</span>}</div>
            </div>
          ))}
          {person && convs.length === 0 && <div className="empty-thread">点「＋ 新对话」开始</div>}
        </div>
      </div>

      <div className="chatwin">
        {person ? (
          <>
            <div className="cw-head">
              <div className={`av ${person.cls}`}>{person.ini}{person.online && <span className="online" />}</div>
              <div>
                <div className="hn">{person.name} <span className="pill">{person.role}</span></div>
                <div className="hs">{tab === 'iAsk' ? `「${person.name} 的分身」· 7×24 在线` : `别人向「${person.name} 的分身」提问`}</div>
              </div>
              <button onClick={newConv} style={{ marginLeft: 'auto', fontSize: '12px', padding: '6px 13px', borderRadius: '8px', border: '1px solid var(--stroke)', background: 'transparent', color: 'var(--accent)', cursor: 'pointer' }}>＋ 新对话</button>
            </div>
            <div className="msgs scroll" ref={msgsRef}>
              <div className="daydiv">{tab === 'iAsk' ? `你向 ${person.name} 的分身提问` : `别人向 ${person.name} 的分身提问`}</div>
              {msgs.map((m, i) => <MsgView key={i} m={m} />)}
              {cur && (
                <div className="row left">
                  <div className={`mini-av ${person.cls}`}>{person.ini}</div>
                  <div className="bubble md">
                    {cur.toolCalls.map((tc) => <ToolCallCard key={tc.id} tc={tc} />)}
                    {cur.text && <ReactMarkdown remarkPlugins={[remarkGfm]}>{cur.text}</ReactMarkdown>}
                    <span className="stream-cursor">▋</span>
                  </div>
                </div>
              )}
            </div>
            <div className="composer">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 4px 6px' }}>
                <button onClick={viewSys} style={{ fontSize: '11.5px', color: 'var(--dim)', background: 'transparent', border: '1px solid var(--stroke)', borderRadius: '7px', padding: '3px 10px', cursor: 'pointer' }}>📋 系统提示词</button>
                {qCount > 0 && <span style={{ fontSize: '11px', color: 'var(--mute)' }}>排队中 {qCount} 条，答完依次发送</span>}
              </div>
              <div className="cbox">
                <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) send() }} placeholder={busy ? '回复中…回车可排队' : '输入消息…回车或点击发送'} />
                {busy
                  ? <button className="send" onClick={stop} title="终止生成" style={{ background: 'var(--red)' }}>■</button>
                  : <button className="send" onClick={send}><IcSend /></button>}
              </div>
            </div>
          </>
        ) : (
          <div className="empty-chat"><div className="e-ic">💬</div>选择左侧分身开始提问</div>
        )}
      </div>

      {showSys && (
        <div onClick={() => setShowSys(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 560, maxWidth: '90vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column', background: 'var(--base-edge)', color: 'var(--text)', border: '1px solid var(--stroke)', borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>系统提示词</div>
            <div style={{ fontSize: 11.5, color: 'var(--mute)', marginBottom: 12 }}>分身人格 + 当前场景指令，发送消息时随对话历史一起发给模型</div>
            <pre style={{ flex: 1, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12.5, lineHeight: 1.65, background: 'var(--input-bg)', padding: '12px 14px', borderRadius: 10, margin: 0 }}>{sysText}</pre>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
              <button className="btn" onClick={() => setShowSys(false)}>关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
