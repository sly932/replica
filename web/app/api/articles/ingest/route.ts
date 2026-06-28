// 把「已存在」的 article 原文重新向量化入知识库：POST { articleId } → ingestArticleById
import { ingestArticleById } from '@/lib/rag'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { articleId, replicaId } = (await req.json()) as { articleId?: string; replicaId?: string }
    if (!articleId) return Response.json({ error: 'articleId 必填' }, { status: 400 })
    if (!replicaId) return Response.json({ error: 'replicaId 必填' }, { status: 400 })
    const result = await ingestArticleById(articleId, replicaId)
    return Response.json(result)
  } catch (e) {
    const msg = (e as Error).message
    if (msg === 'NOT_FOUND') return Response.json({ error: '文档不存在' }, { status: 404 })
    return Response.json({ error: msg }, { status: 500 })
  }
}
