// 工具装配层：按场景裁剪动作空间（context engineering）
// - 回答别人（!isOwner）：检索 + 沉淀
// - 主人 ↔ 自己分身（isOwner）：额外挂 manageMemory（管理主人记忆）
import type { AgentTool } from '@earendil-works/pi-agent-core'
import type { ToolCtx } from './_shared'
import { makeSearchKnowledgeTool } from './searchKnowledge'
import { makeSearchMemoryTool } from './searchMemory'
import { makeSearchConversationTool } from './searchConversation'
import { makeListKnowledgeTool } from './listKnowledge'
import { makeListKnowledgeItemTool } from './listKnowledgeItem'
import { makeReadDocumentTool } from './readDocument'
import { makeReadKnowledgeItemTool } from './readKnowledgeItem'
import { makeSaveQuestionTool } from './saveQuestion'
import { makeSaveInsightTool } from './saveInsight'
import { makeManageMemoryTool } from './manageMemory'

export function buildToolset(ctx: ToolCtx): AgentTool<any>[] {
  const tools: AgentTool<any>[] = [
    makeSearchKnowledgeTool(ctx),
    makeSearchMemoryTool(ctx),
    makeSearchConversationTool(ctx),
    makeListKnowledgeTool(ctx),
    makeListKnowledgeItemTool(ctx),
    makeReadDocumentTool(ctx),
    makeReadKnowledgeItemTool(ctx),
    makeSaveQuestionTool(ctx),
    makeSaveInsightTool(ctx),
  ]
  if (ctx.isOwner) tools.push(makeManageMemoryTool(ctx))
  return tools
}
