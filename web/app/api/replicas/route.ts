// 分身列表（前端分身广场/通讯录用）
import { supabaseAdmin } from '@/lib/db/client'

export const runtime = 'nodejs'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('replicas')
    .select('id, name, mis_id, role, org, team')
    .order('created_at', { ascending: true })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ replicas: data ?? [] })
}
