// 子分身：GET 列表（?parentId=）· POST 创建（mis_id 唯一，先校验给 409）
import { listSubReplicas, createSubReplica, misIdExists } from '@/lib/db/subReplicas'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const parentId = new URL(req.url).searchParams.get('parentId')
  if (!parentId) return Response.json({ error: '缺少 parentId' }, { status: 400 })
  try {
    const subs = await listSubReplicas(parentId)
    return Response.json({ subs })
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parentId = (body.parentId || '').trim()
    const name = (body.name || '').trim()
    const mis_id = (body.mis_id || '').trim()
    const bio = typeof body.bio === 'string' ? body.bio.trim() : null
    if (!parentId || !name || !mis_id) {
      return Response.json({ error: 'parentId / name / mis_id 必填' }, { status: 400 })
    }
    // 先查 mis_id 是否已存在，给出友好 409
    if (await misIdExists(mis_id)) {
      return Response.json({ error: `mis_id「${mis_id}」已被占用` }, { status: 409 })
    }
    try {
      const sub = await createSubReplica({ parentId, name, mis_id, bio })
      return Response.json(sub, { status: 201 })
    } catch (e) {
      // 兜底捕获唯一冲突（并发下 select 校验可能漏掉）
      if ((e as { code?: string }).code === '23505') {
        return Response.json({ error: `mis_id「${mis_id}」已被占用` }, { status: 409 })
      }
      throw e
    }
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 })
  }
}
