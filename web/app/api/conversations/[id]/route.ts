// 删除单个会话（B-L2）；messages 经 on delete cascade 一并删除
import { deleteConversation } from '@/lib/db/conversations'

export const runtime = 'nodejs'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!id) return Response.json({ error: '缺少会话 id' }, { status: 400 })
  try {
    await deleteConversation(id)
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 })
  }
}
