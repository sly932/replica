// 返回某分身在某场景下「组装后的完整系统提示词」（模板填充真实信息 + 场景指令）
import { supabaseAdmin } from '@/lib/db/client'
import { getSettings } from '@/lib/db/settings'
import { buildSystemPrompt } from '@/lib/agent/buildSystemPrompt'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const replicaId = url.searchParams.get('replicaId')
  const isOwner = url.searchParams.get('isOwner') === 'true'
  if (!replicaId) return Response.json({ error: '缺少 replicaId' }, { status: 400 })

  const { data: replica } = await supabaseAdmin
    .from('replicas')
    .select('name, role, org, team, bio, mbti, hobbies, persona_prompt')
    .eq('id', replicaId)
    .maybeSingle()
  if (!replica) return Response.json({ error: '分身不存在' }, { status: 404 })

  const settings = await getSettings()
  const scene = isOwner ? settings.ownerPrompt : settings.visitorPrompt
  const { data: docs } = await supabaseAdmin
    .from('articles')
    .select('title')
    .eq('replica_id', replicaId)
    .eq('status', 'enabled')
  const docTitles = (docs || []).map((d) => d.title).filter(Boolean) as string[]
  const { data: mems } = await supabaseAdmin
    .from('memories')
    .select('content')
    .eq('replica_id', replicaId)
    .eq('enabled', true)
    .eq('deleted', false)
  const memories = (mems || []).map((m) => m.content).filter(Boolean) as string[]

  const systemPrompt = buildSystemPrompt(replica, docTitles, memories, scene)
  return Response.json({ systemPrompt })
}
