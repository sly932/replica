// 工具共享基础层 —— 所有 Replica agent 工具的统一约定
// 速查依据：docs/技术/pi集成速查.md §3；约定见 docs/技术/工具开发约定.md
//
// 约定：
//  - 工具用「工厂」形式：makeXxxTool(ctx: ToolCtx) => AgentTool<Schema>
//    工厂注入 replicaId / isOwner 等运行期上下文，闭包进 execute。
//  - schema 用 typebox（Type/Static 从 '@earendil-works/pi-ai' 重导出），不是 zod。
//  - execute 成功：返回 okResult(text, data) → AgentToolResult
//    execute 失败：fail(code, msg) → throw（pi 约定，别把错误塞进 content）。
import type { AgentToolResult } from '@earendil-works/pi-agent-core'
// typebox：统一从这里再导出，工具文件只 import 本模块，避免各处直连 pi-ai
export { Type, type Static } from '@earendil-works/pi-ai'

// 工具运行期上下文：哪个分身、当前会话是否「主人 ↔ 自己分身」
export interface ToolCtx {
  replicaId: string
  isOwner: boolean
}

// 统一成功返回。text 给模型看的正文；data 给日志/前端的结构化结果。
// details 固定带 { ok, code, data } 三件套，便于前端/日志统一解析。
export function okResult<T>(text: string, data: T): AgentToolResult<{ ok: true; code: 'OK'; data: T }> {
  return {
    content: [{ type: 'text', text }],
    details: { ok: true, code: 'OK', data },
  }
}

// 统一失败：throw。code 是稳定错误码（大写下划线），msg 是人读说明。
// 形如 "[NOT_OWNER] 仅主人可管理记忆"。Agent 会以 isError 的 toolResult 报给模型。
export function fail(code: string, msg: string): never {
  throw new Error(`[${code}] ${msg}`)
}
