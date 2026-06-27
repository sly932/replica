// 知识条目（knowledge_items）数据访问层 —— 列表 / 改 status&answer / 软删
// 飞轮闭环：待回答补答 → approved，并为 question+answer 生成 embedding 写入，
// 使其后续可被 searchKnowledge（match_knowledge / keywordKnowledge）命中。
import { supabaseAdmin } from './client'
import { embedOne } from '@/lib/llm/embedding'

export type KnowledgeStatus = 'pending_answer' | 'pending_review' | 'approved' | 'archived'

export interface KnowledgeItem {
  id: string
  replica_id: string
  question: string | null
  answer: string | null
  source: 'human' | 'reasoning' | null
  status: KnowledgeStatus
  created_at: string
}

const COLS = 'id, replica_id, question, answer, source, status, created_at'

// 列出某分身指定 status 且未软删的条目，按创建时间倒序。
export async function listKnowledgeItems(
  replicaId: string,
  status: KnowledgeStatus,
): Promise<KnowledgeItem[]> {
  const { data, error } = await supabaseAdmin
    .from('knowledge_items')
    .select(COLS)
    .eq('replica_id', replicaId)
    .eq('status', status)
    .eq('deleted', false)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`listKnowledgeItems 失败: ${error.message}`)
  return (data ?? []) as KnowledgeItem[]
}

// 按 id 取单条（PATCH/DELETE 的存在性校验与重算 embedding 取 question 用）；不存在返回 null。
export async function getKnowledgeItemById(id: string): Promise<KnowledgeItem | null> {
  const { data, error } = await supabaseAdmin
    .from('knowledge_items')
    .select(COLS)
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(`getKnowledgeItemById 失败: ${error.message}`)
  return (data as KnowledgeItem) ?? null
}

// 更新条目：可改 status 和/或 answer。只要传了 answer（即改了答案），就对
// `question + "\n" + answer` 重算 embedding 一并写入。返回更新后的行。
export async function updateKnowledgeItem(
  id: string,
  patch: { status?: KnowledgeStatus; answer?: string },
): Promise<KnowledgeItem> {
  const update: Record<string, unknown> = {}
  if (patch.status !== undefined) update.status = patch.status

  if (patch.answer !== undefined) {
    update.answer = patch.answer
    const cur = await getKnowledgeItemById(id)
    if (!cur) throw new Error('NOT_FOUND')
    const question = cur.question ?? ''
    update.embedding = await embedOne(`${question}\n${patch.answer}`)
  }

  const { data, error } = await supabaseAdmin
    .from('knowledge_items')
    .update(update)
    .eq('id', id)
    .select(COLS)
    .single()
  if (error) throw new Error(`updateKnowledgeItem 失败: ${error.message}`)
  return data as KnowledgeItem
}

// 软删除：set deleted=true。
export async function softDeleteKnowledgeItem(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('knowledge_items')
    .update({ deleted: true })
    .eq('id', id)
  if (error) throw new Error(`softDeleteKnowledgeItem 失败: ${error.message}`)
}
