// 知识来源（articles）：GET 列表 / POST 灌库（ingestArticle 走 RAG 切块+向量化）
import { listArticles } from '@/lib/db/articles'
import { ingestArticle } from '@/lib/rag'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const replicaId = new URL(req.url).searchParams.get('replicaId')
  if (!replicaId) return Response.json({ error: 'replicaId 必填' }, { status: 400 })
  try {
    const articles = await listArticles(replicaId)
    return Response.json({ articles })
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { replicaId, sourceUrl } = body as { replicaId?: string; sourceUrl?: string }
    let title = body.title as string | undefined
    let content = body.content as string | undefined
    if (!replicaId) return Response.json({ error: 'replicaId 必填' }, { status: 400 })
    // 仅给链接：抓取正文（demo：取原始文本作为正文）
    if (!content && sourceUrl) {
      const r = await fetch(sourceUrl)
      if (!r.ok) return Response.json({ error: `抓取链接失败 HTTP ${r.status}` }, { status: 400 })
      content = await r.text()
      title = title || sourceUrl
    }
    if (!title || !content) {
      return Response.json({ error: '需要 title+content 或 sourceUrl' }, { status: 400 })
    }
    const result = await ingestArticle(replicaId, title, content, sourceUrl)
    return Response.json(result)
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 })
  }
}
