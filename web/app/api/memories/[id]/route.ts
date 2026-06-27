// 单条 memory：PATCH 改 content / enabled(toggle) · DELETE 软删(deleted=true)
import { updateRow, softDelete } from '@/lib/db/queries'

export const runtime = 'nodejs'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await req.json()
    const patch: Record<string, unknown> = {}
    if (body.content !== undefined) patch.content = body.content
    if (body.enabled !== undefined) patch.enabled = body.enabled
    if (Object.keys(patch).length === 0) return Response.json({ error: '无可更新字段' }, { status: 400 })
    const row = await updateRow('memories', id, patch)
    return Response.json(row)
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await softDelete('memories', id)
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 })
  }
}
