// 可选模型清单（系统设置 / 对话框模型选择器用）
// ofox.ai Anthropic 端点的 Claude 系模型，均支持多模态（图片）。
export interface ModelOpt {
  id: string
  name: string
  multimodal: boolean
}

export const CHAT_MODELS: ModelOpt[] = [
  { id: 'anthropic/claude-opus-4.8', name: 'Claude Opus 4.8 · 最强', multimodal: true },
  { id: 'anthropic/claude-opus-4.6', name: 'Claude Opus 4.6', multimodal: true },
  { id: 'anthropic/claude-sonnet-4.6', name: 'Claude Sonnet 4.6 · 均衡', multimodal: true },
  { id: 'anthropic/claude-sonnet-4.5', name: 'Claude Sonnet 4.5', multimodal: true },
  { id: 'anthropic/claude-haiku-4.5', name: 'Claude Haiku 4.5 · 快', multimodal: true },
]

// contextual 分块用，推荐便宜快的 haiku
export const SUMMARY_MODELS: ModelOpt[] = CHAT_MODELS
