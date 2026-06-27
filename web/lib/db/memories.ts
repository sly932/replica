// memories 管理 helpers（记忆页用）；不改 queries.ts。
// queries.ts 的 listMemories 仅列 enabled=true，管理页需要含 disabled 的全量（未软删），故单列一个。
import { supabaseAdmin } from './client'

export interface MemoryListRow {
  id: string
  replica_id: string
  kind: string
  content: string
  enabled: boolean
  created_at: string
}

// 列出该分身全部未软删 memory（含 disabled，供管理页 toggle/编辑），按创建时间倒序。
export async function listAllMemories(replicaId: string): Promise<MemoryListRow[]> {
  const { data, error } = await supabaseAdmin
    .from('memories')
    .select('id, replica_id, kind, content, enabled, created_at')
    .eq('replica_id', replicaId)
    .eq('deleted', false)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`listAllMemories 失败: ${error.message}`)
  return (data ?? []) as MemoryListRow[]
}
