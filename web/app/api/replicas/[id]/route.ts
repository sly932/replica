// 单个分身：GET 读完整资料 · PATCH 改个性化字段(gender/bio/hobbies/mbti)
import { updateRow } from '@/lib/db/queries'
import { getReplica } from '@/lib/db/replicas'

export const runtime = 'nodejs'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const replica = await getReplica(id)
    if (!replica) return Response.json({ error: 'NOT_FOUND' }, { status: 404 })
    return Response.json({ replica })
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await req.json()
    const patch: Record<string, unknown> = {}
    if (body.gender !== undefined) patch.gender = body.gender
    if (body.bio !== undefined) patch.bio = body.bio
    if (body.hobbies !== undefined) patch.hobbies = body.hobbies
    if (body.mbti !== undefined) patch.mbti = body.mbti
    if (Object.keys(patch).length === 0) return Response.json({ error: '无可更新字段' }, { status: 400 })
    const row = await updateRow('replicas', id, patch)
    return Response.json(row)
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 })
  }
}
