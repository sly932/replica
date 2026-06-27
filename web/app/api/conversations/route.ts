// 会话列表 / 新建会话（B-L2）
import { createConversation, listConversations, type Direction } from '@/lib/db/conversations'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const replicaId = url.searchParams.get('replicaId')
  const direction = url.searchParams.get('direction') as Direction | null
  const askerId = url.searchParams.get('askerId')
  if (!replicaId) return Response.json({ error: '缺少 replicaId' }, { status: 400 })
  const conversations = await listConversations(replicaId, direction ?? undefined, askerId ?? undefined)
  return Response.json({ conversations })
}

export async function POST(req: Request) {
  const { replicaId, direction, askerId } = await req.json()
  if (!replicaId) return Response.json({ error: '缺少 replicaId' }, { status: 400 })
  const conv = await createConversation(replicaId, (direction as Direction) || 'i_ask', askerId || undefined)
  return Response.json(conv)
}
