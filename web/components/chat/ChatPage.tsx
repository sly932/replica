import { useState, useRef, useEffect } from 'react'
import type { Person, Msg, AvCls, ToolCall } from '@/lib/types'
import { IcSearch, IcSend } from '@/lib/icons'
import { streamChat } from '@/lib/api/chat'
import { listConversations, createConversation, getMessages, deleteConversation, type Conv, type ApiMsg } from '@/lib/api/conversations'
import { cacheGet, cacheSet, cacheClear } from '@/lib/cache'
import { useReplica } from '@/lib/replicaContext'
import { confirmDialog } from '@/lib/dialog'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const ME = { cls: 'c2' as AvCls, ini: '你' }
const CLS: AvCls[] = ['c1', 'c2', 'c3', 'c4', 'c5']
// 只保留「我问 TA」方向；提问者=当前用户
const DIRECTION = 'i_ask'
const TOOL_LABEL: Record<string, string> = {
  search_knowledge: '检索知识库', search_memory: '检索记忆', search_conversation: '检索历史会话',
  read_document: '读取文档', read_knowledge_item: '读取知识条目', save_question: '登记待回答问题',
  save_insight: '沉淀洞见', manage_memory: '管理记忆',
}

const preStyle: React.CSSProperties = {
  whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: 'var(--input-bg)',
  padding: '6px 8px', borderRadius: '6px', maxHeight: '200px', overflow: 'auto', margin: 0, fontSize: '11px',
}

// 个别分身的演示用定制问题（放最前，便于演示特定场景）
// 陈昊：定价是产品/商务侧信息，分身答不出 → 触发 save_question 登记给真人补答（飞轮演示）
const DEMO_Q: Record<string, string[]> = {
  陈昊: ['灵犀对外的商业定价和报价策略具体是多少钱？'],
}

// 按分身的真实字段（角色/团队）拼几条「针对该分身」的示例问题，点击即填入输入框
function exampleQuestions(p: Person): string[] {
  const team = p.team || p.org
  const qs = [...(DEMO_Q[p.name] || []), '能简单介绍下你自己吗？']
  if (p.role) qs.push(`作为${p.role}，你平时主要负责哪些工作？`)
  if (team) qs.push(`${team}最近在推进什么？`)
  qs.push('有什么经验或建议能分享给我吗？')
  return qs.slice(0, 4)
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
  // 选中分身(personId)始终是被问/回答方；只展示「我问 TA」，提问者=当前用户
  const convReplicaId = personId
  const askerId = currentId

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

  // 分身/当前用户 变 → 拉「我问 TA」会话，选第一个。切换用户即重载。
  useEffect(() => {
    if (!convReplicaId || !currentId) return
    let alive = true
    const ck = `convs:${convReplicaId}:${askerId}`
    const apply = (cs: Conv[]) => {
      if (!alive) return
      setConvs(cs)
      if (cs[0]) { setConvId(cs[0].id); loadMsgs(cs[0].id) }
      else { setConvId(''); setMsgs([]) }
    }
    const cached = cacheGet<Conv[]>(ck)
    if (cached) { apply(cached); return () => { alive = false } }
    listConversations(convReplicaId, DIRECTION, askerId).then((cs) => { cacheSet(ck, cs); apply(cs) }).catch(() => {})
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personId, currentId])

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight
  }, [convId, msgs.length, streamingMap])

  const selectPerson = (id: string) => setPersonId(id)
  const selectConv = (id: string) => { setConvId(id); loadMsgs(id) }
  // 新建对话只切到空白态，不写表；发首条消息时(doSend convId 为空)才 createConversation
  const newConv = () => { setConvId(''); setMsgs([]) }

  // 删除会话：确认后调 DELETE，从列表移除；若删的是当前会话则切到空白态
  const delConv = async (e: React.MouseEvent, c: Conv) => {
    e.stopPropagation()
    if (!(await confirmDialog(`删除会话「${c.title || '新对话'}」？该会话的聊天记录将一并删除，且不可恢复。`))) return
    setConvs((prev) => prev.filter((x) => x.id !== c.id))
    if (convId === c.id) { setConvId(''); setMsgs([]) }
    cacheClear('convs:'); cacheClear(`msgs:${c.id}`)
    try { await deleteConversation(c.id) } catch { /* 已从UI移除，失败下次刷新自然恢复 */ }
  }

  const doSend = async (v: string, p: Person, curConvId: string) => {
    const botAv = { cls: p.cls, ini: p.ini }
    const cReplica = p.id // 选中分身始终是回答方
    const cAsker = currentId
    const isOwner = p.id === currentId // 我问我自己的分身=主人场景
    let cid = curConvId
    if (!cid) {
      const conv = await createConversation(cReplica, DIRECTION, cAsker)
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
        listConversations(cReplica, DIRECTION, currentId).then((cs) => { cacheSet(`convs:${cReplica}:${currentId}`, cs); setConvs(cs) }).catch(() => {})
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
    const owner = personId === currentId
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
        <div className="tlist scroll" style={{ paddingTop: 10 }}>
          {person && (
            <div className="titem new-conv" onClick={newConv} style={{ textAlign: 'center', color: 'var(--accent)', fontWeight: 600 }}>＋ 新对话</div>
          )}
          {convs.map((c) => (
            <div key={c.id} className={'titem' + (c.id === convId ? ' active' : '')} onClick={() => selectConv(c.id)}>
              <div className="tt">{c.title || '新对话'}</div>
              <div className="td">{streamingMap[c.id] ? <span className="chip wait">回复中…</span> : <span className="chip done">已回答</span>}</div>
              <button className="del" title="删除会话" onClick={(e) => delConv(e, c)}>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></svg>
              </button>
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
                <div className="hs">{`「${person.name} 的分身」· 7×24 在线`}</div>
              </div>
              <button onClick={newConv} style={{ marginLeft: 'auto', fontSize: '12px', padding: '6px 13px', borderRadius: '8px', border: '1px solid var(--stroke)', background: 'transparent', color: 'var(--accent)', cursor: 'pointer' }}>＋ 新对话</button>
            </div>
            <div className="msgs scroll" ref={msgsRef}>
              <div className="daydiv">{`你向 ${person.name} 的分身提问`}</div>
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
              {!input.trim() && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', padding: '0 4px 8px' }}>
                  {exampleQuestions(person).map((eq) => (
                    <button key={eq} onClick={() => setInput(eq)} style={{ fontSize: '12px', color: 'var(--dim)', background: 'var(--glass)', border: '1px solid var(--stroke)', borderRadius: '14px', padding: '5px 12px', cursor: 'pointer' }}>{eq}</button>
                  ))}
                </div>
              )}
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
