// 记忆（memories）：
// GET  列出该分身全部未软删记忆（semantic/episodic，含 disabled）
// POST 新增一条记忆：embedOne(content) 生成 embedding 后写库（enabled=true）
import { listAllMemories } from '@/lib/db/memories'
import { insertRow } from '@/lib/db/queries'
import { embedOne } from '@/lib/llm/embedding'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const replicaId = new URL(req.url).searchParams.get('replicaId')
  if (!replicaId) return Response.json({ error: 'replicaId 必填' }, { status: 400 })
  try {
    const memories = await listAllMemories(replicaId)
    return Response.json({ memories })
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const { replicaId, kind, content } = await req.json().catch(() => ({}))
  const text = typeof content === 'string' ? content.trim() : ''
  if (!replicaId) return Response.json({ error: 'replicaId 必填' }, { status: 400 })
  if (!text) return Response.json({ error: 'content 必填' }, { status: 400 })
  if (kind !== 'semantic' && kind !== 'episodic') {
    return Response.json({ error: 'kind 必须为 semantic 或 episodic' }, { status: 400 })
  }
  try {
    const embedding = await embedOne(text)
    const row = await insertRow('memories', {
      replica_id: replicaId,
      kind,
      content: text,
      embedding,
      enabled: true,
    })
    return Response.json({ memory: row }, { status: 201 })
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 })
  }
}
