// 【已弃用（改用 pi-ai anthropic-messages）】
// chat 已迁移到 ofox.ai 的 Anthropic Messages 端点（见 lib/llm/chat.ts），不再使用本文件。
// 保留仅作历史参考，无任何引用。
//
// cloudsway Responses API 自定义 streamFn
//
// 背景：cloudsway（base https://api.agentsway.dev，POST /v1/responses）号称 OpenAI
// Responses 兼容，但其 SSE 流省略了 OpenAI 标准的结构事件
// （response.output_item.added / response.content_part.added / response.output_text.done），
// pi-ai 内部的 OpenAI SDK 累加器靠这些事件组装文本，缺了就组装不出 → assistant message
// 的 content 为空数组。
//
// 方案：绕过 OpenAI SDK，直接 fetch + 手解析 cloudsway SSE。文本增量在
// response.output_text.delta 的 `delta` 字段，末尾 response.completed 带完整 output_text + usage。
//
// 速查依据：docs/技术/pi集成速查.md §2、§8；docs/技术/cloudsway-streamfn适配.md
import type {
  AssistantMessage,
  AssistantMessageEventStream,
  Context,
  Message,
  Model,
  SimpleStreamOptions,
} from '@earendil-works/pi-ai'
// AssistantMessageEventStream 在包主入口被 export type 遮蔽（只能当类型用），
// 故用同模块导出的工厂函数拿到运行时值。
import { createAssistantMessageEventStream } from '@earendil-works/pi-ai'

// cloudsway 多模态 input item（与 OpenAI Responses input 等价）
type CloudswayInputContent =
  | { type: 'input_text'; text: string }
  | { type: 'input_image'; image_url: string }
  | { type: 'output_text'; text: string }
type CloudswayInputItem = {
  role: 'user' | 'assistant'
  content: CloudswayInputContent[]
}

// 把 pi 的对话历史转成 cloudsway 的 input 数组。
// systemPrompt 不进 input，单独走 instructions。
function buildInput(messages: Message[]): CloudswayInputItem[] {
  const input: CloudswayInputItem[] = []
  for (const msg of messages) {
    if (msg.role === 'user') {
      const content: CloudswayInputContent[] =
        typeof msg.content === 'string'
          ? [{ type: 'input_text', text: msg.content }]
          : msg.content.map((item): CloudswayInputContent =>
              item.type === 'text'
                ? { type: 'input_text', text: item.text }
                : {
                    type: 'input_image',
                    // ImageContent { data: base64, mimeType } → data URL
                    image_url: `data:${item.mimeType};base64,${item.data}`,
                  },
            )
      if (content.length > 0) input.push({ role: 'user', content })
    } else if (msg.role === 'assistant') {
      // 回放历史 assistant：只取文本块（MVP 不回放 thinking/toolCall）
      const text = msg.content
        .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
        .map((b) => b.text)
        .join('')
      if (text) input.push({ role: 'assistant', content: [{ type: 'output_text', text }] })
    }
    // TODO(工具): toolResult 消息暂不回放（MVP 纯文本）
  }
  return input
}

// 自定义 streamFn：签名兼容 pi-agent-core 的 StreamFn / pi-ai 的 StreamFunction
export function cloudswayStream(
  model: Model<'openai-responses'>,
  context: Context,
  options?: SimpleStreamOptions,
): AssistantMessageEventStream {
  const stream = createAssistantMessageEventStream()

  ;(async () => {
    const output: AssistantMessage = {
      role: 'assistant',
      content: [],
      api: model.api,
      provider: model.provider,
      model: model.id,
      usage: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
        totalTokens: 0,
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
      },
      stopReason: 'stop',
      timestamp: Date.now(),
    }

    let started = false // 是否已 emit text_start
    let acc = '' // 累加的文本增量
    const textBlock = { type: 'text' as const, text: '' }

    const ensureStarted = () => {
      if (started) return
      started = true
      output.content.push(textBlock)
      stream.push({ type: 'text_start', contentIndex: 0, partial: output })
    }

    try {
      const apiKey = options?.apiKey
      if (!apiKey) throw new Error('cloudswayStream: missing apiKey')

      const body = {
        model: model.id,
        input: buildInput(context.messages),
        stream: true,
        max_steps: 1, // 把 cloudsway 当纯 LLM（单步），agent 编排(plan/multi-step)交给 pi-agent-core；防 plan/reasoning 混入输出
        ...(context.systemPrompt ? { instructions: context.systemPrompt } : {}),
        ...(options?.maxTokens ? { max_output_tokens: options.maxTokens } : {}),
        ...(options?.temperature !== undefined ? { temperature: options.temperature } : {}),
      }

      const res = await fetch(`${model.baseUrl}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(body),
        signal: options?.signal,
      })

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => '')
        throw new Error(`cloudsway HTTP ${res.status}: ${errText.slice(0, 500)}`)
      }

      stream.push({ type: 'start', partial: output })

      // 手解析 SSE：按行读，data: 后是 JSON，对象有 type 字段
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      const handleEvent = (evt: Record<string, unknown>) => {
        const type = evt.type as string | undefined
        if (type === 'response.output_text.delta') {
          const delta = typeof evt.delta === 'string' ? evt.delta : ''
          if (!delta) return
          ensureStarted()
          acc += delta
          textBlock.text = acc
          stream.push({ type: 'text_delta', contentIndex: 0, delta, partial: output })
        } else if (type === 'response.completed') {
          const resp = (evt.response ?? {}) as Record<string, unknown>
          // 以逐字 delta 累加为准；仅当一个增量都没收到时才用 completed 的 output_text 兜底。
          // 绝不用 completed 覆盖/补 tail——cloudsway 在 agent/plan 模式下 output_text 可能掺入
          // plan/reasoning 元数据，覆盖会把这些垃圾混进正文（曾导致回复尾部出现 plan_update JSON）。
          if (acc.length === 0) {
            const full = typeof resp.output_text === 'string' ? resp.output_text : ''
            if (full) {
              ensureStarted()
              acc = full
              textBlock.text = acc
              stream.push({ type: 'text_delta', contentIndex: 0, delta: full, partial: output })
            }
          }
          // usage
          const usage = (resp.usage ?? {}) as Record<string, unknown>
          const inTok = Number(usage.input_tokens ?? 0) || 0
          const outTok = Number(usage.output_tokens ?? 0) || 0
          output.usage.input = inTok
          output.usage.output = outTok
          output.usage.totalTokens = inTok + outTok
          const respId = resp.id
          if (typeof respId === 'string') output.responseId = respId
        }
        // TODO(工具): cloudsway 的 tool 事件（response.tool.invocation.completed 等）
        //   暂不处理；MVP 仅纯文本输出。其余 created/in_progress/model.* /step.* /plan.* 忽略。
      }

      const flushLine = (line: string) => {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data:')) return
        const payload = trimmed.slice(5).trim()
        if (!payload || payload === '[DONE]') return
        let evt: Record<string, unknown>
        try {
          evt = JSON.parse(payload)
        } catch {
          return // 非 JSON 行（注释/心跳）忽略
        }
        handleEvent(evt)
      }

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        let idx: number
        while ((idx = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, idx)
          buf = buf.slice(idx + 1)
          flushLine(line)
        }
      }
      // flush 残留
      if (buf) flushLine(buf)

      if (!started) {
        // 没有任何文本增量也没拿到 completed 文本：保证 content 不为空时才 push end
        ensureStarted()
      }
      stream.push({ type: 'text_end', contentIndex: 0, content: acc, partial: output })
      stream.push({ type: 'done', reason: 'stop', message: output })
      stream.end()
    } catch (error) {
      output.stopReason = options?.signal?.aborted ? 'aborted' : 'error'
      output.errorMessage = error instanceof Error ? error.message : String(error)
      stream.push({ type: 'error', reason: output.stopReason, error: output })
      stream.end()
    }
  })()

  return stream
}
