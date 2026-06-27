// 单个子分身：PATCH 改 name/bio 或移交(parentId) · DELETE 硬删
import { updateSubReplica, deleteSubReplica } from '@/lib/db/subReplicas'

export const runtime = 'nodejs'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await req.json()
    const patch: { name?: string; bio?: string; parentId?: string } = {}
    if (body.name !== undefined) patch.name = String(body.name).trim()
    if (body.bio !== undefined) patch.bio = String(body.bio).trim()
    if (body.parentId !== undefined) patch.parentId = String(body.parentId).trim()
    if (Object.keys(patch).length === 0) {
      return Response.json({ error: '无可更新字段' }, { status: 400 })
    }
    const sub = await updateSubReplica(id, patch)
    return Response.json(sub)
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await deleteSubReplica(id)
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 })
  }
}
