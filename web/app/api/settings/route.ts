// 全局设置 API（系统设置页）
import { getSettings, updateSettings } from '@/lib/db/settings'

export const runtime = 'nodejs'

export async function GET() {
  return Response.json(await getSettings())
}

export async function PATCH(req: Request) {
  const body = await req.json()
  const next = await updateSettings({
    chatModel: body.chatModel,
    summaryModel: body.summaryModel,
    visitorPrompt: body.visitorPrompt,
    ownerPrompt: body.ownerPrompt,
  })
  return Response.json(next)
}
