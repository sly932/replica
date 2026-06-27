// replicas 单行读取 helper（个人资料页用）；不改 queries.ts。
import { supabaseAdmin } from './client'

export interface ReplicaProfileRow {
  id: string
  name: string
  mis_id: string | null
  role: string | null
  org: string | null
  team: string | null
  gender: string | null
  bio: string | null
  hobbies: string[] | null
  mbti: string | null
}

export async function getReplica(id: string): Promise<ReplicaProfileRow | null> {
  const { data, error } = await supabaseAdmin
    .from('replicas')
    .select('id, name, mis_id, role, org, team, gender, bio, hobbies, mbti')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(`getReplica 失败: ${error.message}`)
  return (data as ReplicaProfileRow) ?? null
}
