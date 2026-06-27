// 返回某分身在某场景下「组装后的完整系统提示词」（人格 persona + 场景指令）
import { supabaseAdmin } from '@/lib/db/client'
import { getSettings } from '@/lib/db/settings'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const replicaId = url.searchParams.get('replicaId')
  const isOwner = url.searchParams.get('isOwner') === 'true'
  if (!replicaId) return Response.json({ error: '缺少 replicaId' }, { status: 400 })

  const { data: replica } = await supabaseAdmin
    .from('replicas')
    .select('name, persona_prompt')
    .eq('id', replicaId)
    .maybeSingle()

  const settings = await getSettings()
  const basePersona =
    replica?.persona_prompt ||
    `你是${replica?.name || '某人'}的数字分身，用第一人称作答；不确定就老实说不知道，不杜撰。`
  const scene = isOwner ? settings.ownerPrompt : settings.visitorPrompt
  const systemPrompt = [basePersona, scene].filter(Boolean).join('\n\n')

  return Response.json({ systemPrompt, persona: basePersona, scene })
}
