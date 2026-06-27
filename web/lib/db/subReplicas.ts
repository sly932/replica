// 子分身数据访问层（server 侧）：基于 replicas 表，用 parent_id 串父子关系。
// 仅本功能使用，不动 lib/db/queries.ts。
import { supabaseAdmin } from './client'

const COLS = 'id, name, mis_id, bio, role, team, parent_id'

export interface SubReplica {
  id: string
  name: string
  mis_id: string | null
  bio: string | null
  role: string | null
  team: string | null
  parent_id: string | null
}

// 列出某父分身名下的子分身
export async function listSubReplicas(parentId: string): Promise<SubReplica[]> {
  const { data, error } = await supabaseAdmin
    .from('replicas')
    .select(COLS)
    .eq('parent_id', parentId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as SubReplica[]
}

// mis_id 是否已被占用（replicas.mis_id 唯一）
export async function misIdExists(misId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('replicas')
    .select('id')
    .eq('mis_id', misId)
    .limit(1)
  if (error) throw new Error(error.message)
  return (data ?? []).length > 0
}

// 创建子分身
export async function createSubReplica(input: {
  parentId: string
  name: string
  mis_id: string
  bio?: string | null
}): Promise<SubReplica> {
  const { data, error } = await supabaseAdmin
    .from('replicas')
    .insert({
      name: input.name,
      mis_id: input.mis_id,
      bio: input.bio ?? null,
      parent_id: input.parentId,
    })
    .select(COLS)
    .single()
  if (error) throw error
  return data as SubReplica
}

// 更新子分身（name/bio），或移交（parent_id 改成目标分身）
export async function updateSubReplica(
  id: string,
  patch: { name?: string; bio?: string; parentId?: string },
): Promise<SubReplica> {
  const set: Record<string, unknown> = {}
  if (patch.name !== undefined) set.name = patch.name
  if (patch.bio !== undefined) set.bio = patch.bio
  if (patch.parentId !== undefined) set.parent_id = patch.parentId
  const { data, error } = await supabaseAdmin
    .from('replicas')
    .update(set)
    .eq('id', id)
    .select(COLS)
    .single()
  if (error) throw new Error(error.message)
  return data as SubReplica
}

// 删除子分身（硬删，replicas 无 deleted 列）
export async function deleteSubReplica(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from('replicas').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
