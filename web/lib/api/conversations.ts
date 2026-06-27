// 前端会话/消息 API（B-L2）
export interface Conv {
  id: string
  title: string | null
  direction: string
  created_at: string
}
export interface ApiMsg {
  id: string
  role: string
  content: string
  tool_calls?: { id: string; name: string; args?: unknown; result?: unknown; isError?: boolean }[] | null
  images: unknown
  created_at: string
}

export async function listConversations(replicaId: string, direction?: string, askerId?: string): Promise<Conv[]> {
  const u = new URL('/api/conversations', location.origin)
  u.searchParams.set('replicaId', replicaId)
  if (direction) u.searchParams.set('direction', direction)
  if (askerId) u.searchParams.set('askerId', askerId)
  const r = await fetch(u.toString())
  const d = await r.json()
  return d.conversations || []
}

export async function createConversation(replicaId: string, direction = 'i_ask', askerId?: string): Promise<Conv> {
  const r = await fetch('/api/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ replicaId, direction, askerId }),
  })
  return r.json()
}

export async function getMessages(conversationId: string): Promise<ApiMsg[]> {
  const r = await fetch(`/api/conversations/${conversationId}/messages`)
  const d = await r.json()
  return d.messages || []
}
