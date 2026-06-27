// 上下文压缩逻辑模块。
//
// 逻辑已就绪，未接入 route；启用时在 route agent.prompt 前经 transformContext 调用，
// usedTokens 取自 LLM usage。
//
// 纯逻辑，不依赖 React/Next，可被 tsx 直接跑。messages 是 pi-agent-core 的
// AgentMessage[]（user / assistant / toolResult 三种角色）。

import type {
  AgentMessage,
} from '@earendil-works/pi-agent-core'
import type {
  AssistantMessage,
  TextContent,
} from '@earendil-works/pi-ai'

/** 被裁剪工具输出的占位文本。 */
const CROPPED_TEXT = '[此工具输出已被裁剪]'

/** 摘要消息前缀。 */
const SUMMARY_PREFIX = '[前文摘要]'

/**
 * 根据已用 token 占上下文窗口的比例决定压缩级别。
 * - used/window > 0.8 → 'summary'
 * - used/window > 0.6 → 'micro'
 * - 否则 → 'none'
 */
export function compactionLevel(
  usedTokens: number,
  contextWindow: number,
): 'none' | 'micro' | 'summary' {
  if (!contextWindow || contextWindow <= 0) return 'none'
  const ratio = usedTokens / contextWindow
  if (ratio > 0.8) return 'summary'
  if (ratio > 0.6) return 'micro'
  return 'none'
}

/** 判断一条消息是否为「工具结果」。 */
function isToolResultMessage(msg: AgentMessage): boolean {
  const role = (msg as { role?: string }).role
  return role === 'toolResult' || role === 'tool'
}

/** 判断 content 数组里的某个 block 是否为工具结果块。 */
function isToolResultBlock(block: unknown): boolean {
  const type = (block as { type?: string })?.type
  return type === 'tool_result' || type === 'toolResult'
}

/**
 * 微压缩：把历史里所有「工具结果」的内容替换成占位文本，其余消息原样。
 * 返回新数组（不可变，不改原数组）。
 *
 * 覆盖两种形态：
 * - role 为 'toolResult'（pi-agent-core 真实结构）或 'tool'（兼容）的整条消息。
 * - 任意消息 content 数组里 type 为 'tool_result' / 'toolResult' 的 block。
 */
export function microCompact(messages: AgentMessage[]): AgentMessage[] {
  const placeholder: TextContent = { type: 'text', text: CROPPED_TEXT }

  return messages.map((msg) => {
    if (isToolResultMessage(msg)) {
      return { ...msg, content: [{ ...placeholder }] } as AgentMessage
    }

    const content = (msg as { content?: unknown }).content
    if (Array.isArray(content) && content.some(isToolResultBlock)) {
      const newContent = content.map((block) =>
        isToolResultBlock(block) ? { ...placeholder } : block,
      )
      return { ...msg, content: newContent } as AgentMessage
    }

    return msg
  })
}

/** 把一条消息转成纯文本（用于拼接送入 summarize）。 */
function messageToText(msg: AgentMessage): string {
  const role = (msg as { role?: string }).role ?? 'unknown'
  const content = (msg as { content?: unknown }).content

  let body: string
  if (typeof content === 'string') {
    body = content
  } else if (Array.isArray(content)) {
    body = content
      .map((block) => {
        const b = block as { type?: string; text?: string }
        if (b?.type === 'text' && typeof b.text === 'string') return b.text
        if (isToolResultBlock(b)) return '[工具结果]'
        if (b?.type === 'toolCall') return '[工具调用]'
        return ''
      })
      .filter(Boolean)
      .join('\n')
  } else {
    body = ''
  }

  return `${role}: ${body}`.trim()
}

/**
 * 摘要压缩：保留最后 3 条 user 消息及其之后的所有消息原样；
 * 把「倒数第 3 条 user 消息之前」的全部消息拼成纯文本、调 summarize 得摘要，
 * 用一条 assistant 文本消息「[前文摘要] {摘要}」替换那一段。
 * user 消息不足 3 条则原样返回。
 */
export async function summarizeMessages(
  messages: AgentMessage[],
  summarize: (text: string) => Promise<string>,
): Promise<AgentMessage[]> {
  // 找到所有 user 消息的下标。
  const userIndices: number[] = []
  for (let i = 0; i < messages.length; i++) {
    if ((messages[i] as { role?: string }).role === 'user') userIndices.push(i)
  }

  // 不足 3 条 user 消息：原样返回。
  if (userIndices.length < 3) return messages

  // 倒数第 3 条 user 消息的下标，从这里（含）开始保留。
  const keepFrom = userIndices[userIndices.length - 3]
  if (keepFrom <= 0) return messages

  const toSummarize = messages.slice(0, keepFrom)
  const kept = messages.slice(keepFrom)

  const text = toSummarize.map(messageToText).join('\n')
  const summary = await summarize(text)

  const summaryMessage = {
    role: 'assistant',
    content: [{ type: 'text', text: `${SUMMARY_PREFIX} ${summary}` }],
    api: 'anthropic',
    provider: 'anthropic',
    model: 'compaction-summary',
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
  } as unknown as AssistantMessage

  return [summaryMessage as AgentMessage, ...kept]
}

/**
 * 返回某个模型的上下文窗口大小。
 * Claude 系列（sonnet / opus / haiku 等）返回 200000；未知默认 200000。
 */
export function contextWindowFor(model: string): number {
  void model
  return 200000
}
