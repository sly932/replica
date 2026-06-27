// 全局设置读写（系统设置页 + 后端 RAG/chat 默认模型 + 两处场景提示词）
import { supabaseAdmin } from './client'

export interface AppSettings {
  chatModel: string
  summaryModel: string
  visitorPrompt: string // 回答别人时的场景指令
  ownerPrompt: string // 主人本人对话时的场景指令
}

const DEFAULT_VISITOR =
  '【场景】你正在回答同事或外部同学的提问。请基于检索到的资料如实、简洁地回答；资料中没有依据的内容不要编造，应礼貌说明「这块本人还没沉淀」并建议转人工。'
const DEFAULT_OWNER =
  '【场景】你正在与主人本人对话，协助他整理与沉淀知识、管理记忆。可主动调用记忆管理工具，记录主人的偏好与事实。'

const FALLBACK: AppSettings = {
  chatModel: process.env.CHAT_MODEL || 'anthropic/claude-sonnet-4.6',
  summaryModel: process.env.SUMMARY_MODEL || 'anthropic/claude-haiku-4.5',
  visitorPrompt: DEFAULT_VISITOR,
  ownerPrompt: DEFAULT_OWNER,
}

export async function getSettings(): Promise<AppSettings> {
  const { data } = await supabaseAdmin
    .from('app_settings')
    .select('chat_model, summary_model, visitor_prompt, owner_prompt')
    .eq('id', 1)
    .single()
  if (!data) return FALLBACK
  return {
    chatModel: data.chat_model || FALLBACK.chatModel,
    summaryModel: data.summary_model || FALLBACK.summaryModel,
    visitorPrompt: data.visitor_prompt || FALLBACK.visitorPrompt,
    ownerPrompt: data.owner_prompt || FALLBACK.ownerPrompt,
  }
}

export async function updateSettings(p: Partial<AppSettings>): Promise<AppSettings> {
  const patch: Record<string, unknown> = { id: 1, updated_at: new Date().toISOString() }
  if (p.chatModel) patch.chat_model = p.chatModel
  if (p.summaryModel) patch.summary_model = p.summaryModel
  if (p.visitorPrompt !== undefined) patch.visitor_prompt = p.visitorPrompt
  if (p.ownerPrompt !== undefined) patch.owner_prompt = p.ownerPrompt
  const { data, error } = await supabaseAdmin
    .from('app_settings')
    .upsert(patch)
    .select('chat_model, summary_model, visitor_prompt, owner_prompt')
    .single()
  if (error) throw new Error(error.message)
  return {
    chatModel: data.chat_model,
    summaryModel: data.summary_model,
    visitorPrompt: data.visitor_prompt || FALLBACK.visitorPrompt,
    ownerPrompt: data.owner_prompt || FALLBACK.ownerPrompt,
  }
}
