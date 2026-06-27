// ReplicaAgent —— 分身大脑（pi-agent-core 封装）
// 速查依据：docs/技术/pi集成速查.md §1、§8
import { Agent, type AgentTool } from '@earendil-works/pi-agent-core'
import { buildChatModel, streamFn } from '../llm/chat'

export interface BuildReplicaAgentOpts {
  systemPrompt: string // 人格 + 边界（"答不出诚实转人工，不杜撰"）
  modelId?: string // 前端选的聊天模型
  tools?: AgentTool<any>[] // 工具集（searchKnowledge / manageMemory ...，按场景裁剪）
  messages?: any[] // 历史 transcript（恢复会话用）
  // TODO(B5 记忆): 传入召回函数，用 transformContext 注入（见速查 §6，不能 throw）
}

export function buildReplicaAgent(opts: BuildReplicaAgentOpts) {
  return new Agent({
    initialState: {
      systemPrompt: opts.systemPrompt,
      model: buildChatModel(opts.modelId),
      tools: opts.tools ?? [],
      messages: opts.messages ?? [],
    },
    streamFn,
  })
}
