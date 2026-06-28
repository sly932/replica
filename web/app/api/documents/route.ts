// 文档库（全局）：GET 列表 —— 标题模糊搜索 + 分页，跨所有分身。
import { listAllDocuments } from '@/lib/db/articles'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams
  const q = (sp.get('q') || '').trim()
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(sp.get('pageSize') || '20', 10) || 20))
  try {
    const result = await listAllDocuments(q, page, pageSize)
    return Response.json(result)
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 })
  }
}
