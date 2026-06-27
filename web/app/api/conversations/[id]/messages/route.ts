// 某会话的历史消息（B-L2）
import { getMessages } from '@/lib/db/conversations'

export const runtime = 'nodejs'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const messages = await getMessages(id)
  return Response.json({ messages })
}
