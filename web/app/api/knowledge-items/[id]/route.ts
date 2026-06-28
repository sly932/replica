// 知识条目写操作：PATCH（改 status 和/或 answer，改 answer 必重算 embedding）/ DELETE（软删）
import {
  getKnowledgeItemById,
  updateKnowledgeItem,
  softDeleteKnowledgeItem,
  type KnowledgeStatus,
} from '@/lib/db/knowledgeItems'
import { cacheClear } from '@/lib/cache'

export const runtime = 'nodejs'

const STATUSES: KnowledgeStatus[] = ['pending_answer', 'pending_review', 'approved', 'archived']

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let body: { status?: string; answer?: string; enabled?: boolean }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: '非法 JSON' }, { status: 400 })
  }

  const patch: { status?: KnowledgeStatus; answer?: string; enabled?: boolean } = {}
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status as KnowledgeStatus)) {
      return Response.json({ error: '非法 status' }, { status: 400 })
    }
    patch.status = body.status as KnowledgeStatus
  }
  if (body.answer !== undefined) patch.answer = body.answer
  if (body.enabled !== undefined) patch.enabled = !!body.enabled
  if (patch.status === undefined && patch.answer === undefined && patch.enabled === undefined) {
    return Response.json({ error: '无可更新字段' }, { status: 400 })
  }

  const existing = await getKnowledgeItemById(id)
  if (!existing) return Response.json({ error: 'NOT_FOUND' }, { status: 404 })

  try {
    const item = await updateKnowledgeItem(id, patch)
    cacheClear(`knowledge-items:${existing.replica_id}:`)
    return Response.json({ item })
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const existing = await getKnowledgeItemById(id)
  if (!existing) return Response.json({ error: 'NOT_FOUND' }, { status: 404 })

  try {
    await softDeleteKnowledgeItem(id)
    cacheClear(`knowledge-items:${existing.replica_id}:`)
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 })
  }
}
