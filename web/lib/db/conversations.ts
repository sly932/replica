// 会话 / 消息持久化（B-L2）：会话列表、历史消息、落库（含工具调用）
import { supabaseAdmin } from './client'

export type Direction = 'ask_me' | 'i_ask'

export interface ConvRow {
  id: string
  title: string | null
  direction: string
  created_at: string
}
export interface MsgRow {
  id: string
  role: string
  content: string
  tool_calls: unknown
  images: unknown
  created_at: string
}

export async function createConversation(
  replicaId: string,
  direction: Direction,
  askerId?: string,
): Promise<ConvRow> {
  const { data, error } = await supabaseAdmin
    .from('conversations')
    .insert({ replica_id: replicaId, direction, asker_id: askerId ?? null })
    .select('id, title, direction, created_at')
    .single()
  if (error) throw new Error(`createConversation 失败: ${error.message}`)
  return data as ConvRow
}

export async function listConversations(
  replicaId: string,
  direction?: Direction,
  askerId?: string,
): Promise<ConvRow[]> {
  let q = supabaseAdmin
    .from('conversations')
    .select('id, title, direction, created_at')
    .eq('replica_id', replicaId)
  if (direction) q = q.eq('direction', direction)
  if (askerId) q = q.eq('asker_id', askerId)
  const { data, error } = await q.order('created_at', { ascending: false })
  if (error) throw new Error(`listConversations 失败: ${error.message}`)
  return (data ?? []) as ConvRow[]
}

export async function getMessages(conversationId: string): Promise<MsgRow[]> {
  const { data, error } = await supabaseAdmin
    .from('messages')
    .select('id, role, content, tool_calls, images, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(`getMessages 失败: ${error.message}`)
  return (data ?? []) as MsgRow[]
}

export async function addMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
  toolCalls?: unknown,
  images?: unknown,
): Promise<{ id: string }> {
  const { data, error } = await supabaseAdmin
    .from('messages')
    .insert({ conversation_id: conversationId, role, content, tool_calls: toolCalls ?? null, images: images ?? null })
    .select('id')
    .single()
  if (error) throw new Error(`addMessage 失败: ${error.message}`)
  return data as { id: string }
}

// 会话标题为空时用首条用户消息截断填充（会话列表展示用）
export async function ensureTitle(conversationId: string, text: string): Promise<void> {
  const { data } = await supabaseAdmin
    .from('conversations')
    .select('title')
    .eq('id', conversationId)
    .single()
  if (data && !data.title) {
    await supabaseAdmin
      .from('conversations')
      .update({ title: text.slice(0, 20) })
      .eq('id', conversationId)
  }
}
