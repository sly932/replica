// chat 接入：ofox.ai 的 Anthropic Messages 端点（pi-ai 原生 anthropic-messages provider）
//
// 为什么换：原 cloudsway（agentsway.dev）是有状态 agent API，function calling 要适配它的
// requires_action 太复杂，放弃。ofox 提供标准 Anthropic Messages 端点，pi-ai 一级支持、
// 原生 tool use + prompt caching，工具能真用。
//
// 关键：
// - baseUrl = CHAT_BASE_URL = https://api.ofox.ai/anthropic；Anthropic SDK 自动拼到
//   {baseUrl}/v1/messages。
// - 认证：streamSimple 显式传 apiKey（方式 B），pi-ai 内部用 Anthropic SDK，会自动带上
//   x-api-key + anthropic-version header（正是 ofox 验证过的认证方式），无需手动补 header。
// - prompt caching：pi-ai anthropic provider 默认 cacheRetention='short'，会自动给
//   systemPrompt / 最后一个 tool / 最后一条 user message 打 cache_control:{type:'ephemeral'}。
//   即 persona（systemPrompt）默认被缓存，无需额外配置。
import type { Model } from '@earendil-works/pi-ai'
import type { StreamFn } from '@earendil-works/pi-agent-core'
import { streamSimple } from '@earendil-works/pi-ai/api/anthropic-messages'

const CHAT_BASE = process.env.CHAT_BASE_URL // https://api.ofox.ai/anthropic（不含 /v1）
const CHAT_KEY = process.env.CHAT_API_KEY
const DEFAULT_MODEL = process.env.CHAT_MODEL || 'anthropic/claude-sonnet-4.6'

// 构造 anthropic-messages 模型描述；modelId 由前端对话框/系统设置传入，缺省用默认
export function buildChatModel(modelId?: string): Model<'anthropic-messages'> {
  return {
    id: modelId || DEFAULT_MODEL,
    name: 'ofox',
    api: 'anthropic-messages',
    provider: 'ofox',
    baseUrl: CHAT_BASE!, // SDK 会打到 {baseUrl}/v1/messages
    reasoning: false,
    input: ['text', 'image'], // 多模态
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 200000,
    maxTokens: 8000,
  }
}

// streamFn：用 pi-ai anthropic 的 streamSimple，显式注入 key（方式 B）。
// 默认 cacheRetention='short' → systemPrompt 自动走 prompt caching。
export const streamFn: StreamFn = (model, context, options) =>
  streamSimple(model as Model<'anthropic-messages'>, context, {
    ...options,
    apiKey: CHAT_KEY!,
  })
