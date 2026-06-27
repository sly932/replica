// SSE 流式问答：按 replicaId 加载分身人格 + 按场景装配工具集 + 会话持久化(B-L2)
// 速查依据：docs/技术/pi集成速查.md §4；工具约定：docs/技术/工具开发约定.md
import { buildReplicaAgent } from '@/lib/agent/replicaAgent'
import { buildToolset } from '@/lib/agent/tools'
import { supabaseAdmin } from '@/lib/db/client'
import { getSettings } from '@/lib/db/settings'
import { addMessage, ensureTitle } from '@/lib/db/conversations'

export const runtime = 'nodejs' // pi-agent-core 需要 Node 运行时（非 edge）

export async function POST(req: Request) {
  const { replicaId, conversationId, message, model, isOwner } = await req.json()
  if (!replicaId || !message) {
    return Response.json({ error: '缺少 replicaId 或 message' }, { status: 400 })
  }

  // 取分身人格
  const { data: replica, error } = await supabaseAdmin
    .from('replicas')
    .select('id, name, role, persona_prompt')
    .eq('id', replicaId)
    .single()
  if (error || !replica) {
    return Response.json({ error: '分身不存在' }, { status: 404 })
  }

  // 落库用户消息 + 首条消息作会话标题
  if (conversationId) {
    await addMessage(conversationId, 'user', message)
    await ensureTitle(conversationId, message)
  }

  const ctx = { replicaId, isOwner: !!isOwner }
  const settings = await getSettings() // 全局默认模型 + 两处场景提示词（系统设置页可改）
  const basePersona =
    replica.persona_prompt ||
    `你是${replica.name}的数字分身，用第一人称作答；不确定就老实说不知道，不杜撰。`
  const scene = isOwner ? settings.ownerPrompt : settings.visitorPrompt // 两处系统提示词按场景注入
  const agent = buildReplicaAgent({
    systemPrompt: [basePersona, scene].filter(Boolean).join('\n\n'),
    modelId: model || settings.chatModel, // 对话框传的优先，否则用系统设置默认
    tools: buildToolset(ctx), // 回答别人=检索+沉淀；主人=额外 manageMemory
  })

  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder()
      const send = (data: unknown) =>
        controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`))

      let assistantText = '' // 累积分身可见回复，结束时落库
      // 累积工具调用（按 toolCallId 配对 start/end），随消息一起落库
      const toolCalls = new Map<string, { id: string; name: string; args: unknown; result?: unknown; isError?: boolean }>()
      const unsub = agent.subscribe((event) => {
        if (
          event.type === 'message_update' &&
          event.assistantMessageEvent.type === 'text_delta'
        ) {
          assistantText += event.assistantMessageEvent.delta
          send({ type: 'delta', text: event.assistantMessageEvent.delta })
        } else if (event.type === 'tool_execution_start') {
          toolCalls.set(event.toolCallId, { id: event.toolCallId, name: event.toolName, args: event.args })
          send({ type: 'tool_start', id: event.toolCallId, name: event.toolName, args: event.args })
        } else if (event.type === 'tool_execution_end') {
          const c = toolCalls.get(event.toolCallId)
          if (c) { c.result = event.result; c.isError = event.isError }
          send({ type: 'tool_end', id: event.toolCallId, result: event.result, isError: event.isError })
        } else if (event.type === 'agent_end') {
          send({ type: 'done' })
        }
      })

      agent
        .prompt(message)
        .catch((err) => send({ type: 'error', message: String(err) }))
        .finally(async () => {
          // 落库分身回复 + 工具调用（B-L2；L3 后台续传未做：中途断开这条会丢）
          if (conversationId && (assistantText.trim() || toolCalls.size)) {
            try {
              await addMessage(conversationId, 'assistant', assistantText, [...toolCalls.values()])
            } catch {
              /* 落库失败不影响已发出的流 */
            }
          }
          unsub()
          controller.close()
        })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
