// 前端 SSE 客户端：调 /api/chat，逐字 + 工具调用(start/end) 回调，支持中止(signal)
export interface StreamChatOpts {
  replicaId: string
  conversationId?: string
  model?: string
  isOwner?: boolean
  signal?: AbortSignal
  onDelta: (text: string) => void
  onToolStart?: (call: { id: string; name: string; args: unknown }) => void
  onToolEnd?: (call: { id: string; result: unknown; isError: boolean }) => void
  onDone?: () => void
  onError?: (msg: string) => void
}

export async function streamChat(message: string, opts: StreamChatOpts): Promise<void> {
  let settled = false
  const ok = () => { if (!settled) { settled = true; opts.onDone?.() } }
  const err = (m: string) => { if (!settled) { settled = true; opts.onError?.(m) } }

  let res: Response
  try {
    res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ replicaId: opts.replicaId, conversationId: opts.conversationId, message, model: opts.model, isOwner: opts.isOwner }),
      signal: opts.signal,
    })
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') { ok(); return } // 用户中止：当作正常结束
    err(String(e))
    return
  }
  if (!res.ok || !res.body) {
    err(`HTTP ${res.status}`)
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  try {
    while (true) {
      const r = await reader.read()
      if (r.done) break
      buf += decoder.decode(r.value, { stream: true })
      const parts = buf.split('\n\n')
      buf = parts.pop() || ''
      for (const part of parts) {
        const line = part.split('\n').find((l) => l.startsWith('data: '))
        if (!line) continue
        try {
          const evt = JSON.parse(line.slice(6))
          if (evt.type === 'delta') opts.onDelta(evt.text)
          else if (evt.type === 'tool_start') opts.onToolStart?.({ id: evt.id, name: evt.name, args: evt.args })
          else if (evt.type === 'tool_end') opts.onToolEnd?.({ id: evt.id, result: evt.result, isError: evt.isError })
          else if (evt.type === 'done') ok()
          else if (evt.type === 'error') err(evt.message)
        } catch {
          /* 跳过解析失败的行 */
        }
      }
    }
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') { ok(); return } // 中止
    err(String(e))
    return
  }
  ok()
}
