// 工具元数据（A）：设置页展示每个工具的 description + 入参 schema
import { buildToolset } from '@/lib/agent/tools'

export const runtime = 'nodejs'

export async function GET() {
  // 用空 replicaId 仅取元数据（不执行）；isOwner=true 取全集，再标出 owner 专属
  const all = buildToolset({ replicaId: '', isOwner: true })
  const baseNames = new Set(buildToolset({ replicaId: '', isOwner: false }).map((t) => t.name))
  const tools = all.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
    ownerOnly: !baseNames.has(t.name),
  }))
  return Response.json({ tools })
}
