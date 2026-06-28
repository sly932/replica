// 单篇 article：PATCH 改 status(enabled/disabled)/title · DELETE 从当前分身知识库移除引用
import { updateRow } from '@/lib/db/queries'
import { removeFromKb } from '@/lib/db/articles'

export const runtime = 'nodejs'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await req.json()
    const patch: Record<string, unknown> = {}
    if (body.status !== undefined) patch.status = body.status
    if (body.title !== undefined) patch.title = body.title
    if (Object.keys(patch).length === 0) return Response.json({ error: '无可更新字段' }, { status: 400 })
    const row = await updateRow('articles', id, patch)
    return Response.json(row)
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const replicaId = new URL(req.url).searchParams.get('replicaId')
    if (!replicaId) return Response.json({ error: 'replicaId 必填' }, { status: 400 })
    await removeFromKb(replicaId, id)
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 })
  }
}
