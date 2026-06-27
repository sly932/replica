# pi-agent-core 技术调研（面向 Replica 分身 agent 主体）

> 调研对象：`@earendil-works/pi-agent-core` v0.80.2（即 `badlogic/pi-mono` → `earendil-works/pi`，作者 Mario Zechner）。
> 源码：`~/projects/pi-mono-research/pi-mono/packages/agent`，配套 LLM 底座 `packages/ai`（`@earendil-works/pi-ai`）。
> 已有前置调研：`~/projects/pi-mono-research/docs/{pi-agent-core.md,pi-ai.md,README.md}`（本文在其基础上聚焦技术栈决策）。
> 结论先行：**它是框架无关的纯 TS/Node 库，不绑定 Next.js；能在 Next API routes / Hono / Express / Railway 任意 Node 后端里用；流式与多模态都原生支持；OpenAI 兼容中转（cloudsway 等 base_url）可接。**

---

## 1. pi-mono / pi-agent-core 是什么

**pi-mono** 是一个 AI agent monorepo，5 个 npm 包，scope `@earendil-works`，全部 **ESM-only、Node ≥ 22.19.0、MIT**。依赖层次（自底向上）：

```
pi-orchestrator   进程级 fleet 监管（spawn 多个 pi 子进程，实验性）
   └─► pi-coding-agent (="pi")   终端编码 agent 产品（CLI/TUI/RPC/SDK 四模式）
         ├─► pi-agent-core   ★ 有状态 agent 运行时：loop + 工具执行 + 事件流 + session 树
         │     └─► pi-ai      统一多 provider LLM API（~35 家）+ 模型目录 + auth + 计费
         └─► pi-tui          终端 UI 库（仅交互模式用）
```

**pi-agent-core 的角色 = agent 运行时核心**。README 原话："Stateful agent with tool execution and event streaming."。它本质是 "pi-ai + 状态 + 工具 + session"。提供三层递进能力（同一个包导出）：

1. **底层 loop**（`src/agent-loop.ts`）— 纯函数驱动器，跑 LLM turn + 工具执行并发射事件，不持有状态。
2. **`Agent` 类**（`src/agent.ts`）— 有状态封装：transcript、steering/follow-up 队列、生命周期事件、工具执行、`subscribe`。**这是分身 agent 最可能用的层。**
3. **`AgentHarness`**（`src/harness/agent-harness.ts`）— 完整产品编排：可分支 session 持久化、compaction（上下文压缩）、skills、prompt 模板、typed mutating hooks、可插拔 `ExecutionEnv`（文件系统+shell）。做"带文件操作的 coding agent"才需要。

---

## 2. 技术栈 / 运行时

- **语言/运行时**：纯 TypeScript（5.9.3），编译产物 ESM，`"type":"module"`，`engines.node >= 22.19.0`。构建用 `tsgo`，测试 `vitest`。
- **是 npm workspace package**：是。`package.json` `name: "@earendil-works/pi-agent-core"`，`main: dist/index.js`，`types: dist/index.d.ts`。
- **两个入口**（`exports`）：
  - `.` → `dist/index.js`：除 Node-env 实现外的全部（核心运行时，**平台无关**）。
  - `./node` → `dist/node.js`：额外导出 `NodeExecutionEnv`（**唯一耦合 Node 的符号**，仅 harness 文件/shell 用）。
- **运行时依赖**（`packages/agent/package.json`）：`@earendil-works/pi-ai ^0.80.2`（锁步版本，硬依赖）、`typebox 1.1.38`（工具 schema）、`yaml 2.9.0`（SKILL.md frontmatter）、`ignore 7.0.5`（skill 目录遍历）。**没有任何 web 框架依赖。**
- **怎么被依赖**：`npm i @earendil-works/pi-agent-core @earendil-works/pi-ai`，再按 provider 需要装/懒加载 vendor SDK（pi-ai 懒加载 `@anthropic-ai/sdk`、`openai`、`@google/genai` 等）。

---

## 3.【最关键】是否绑定 Next.js —— 不绑定

**结论：pi-agent-core 是框架无关的 TS 库，与 Next.js 零关系。**

证据：
- **monorepo 整体不是 Next.js 项目**：全仓 `packages/*/package.json` 里 **没有任何 `react` / `next` / `@types/react` 依赖**（grep 验证为 NONE）。pi 是个面向**终端/CLI/服务端**的 agent 工具链，不是 web app。
- pi-agent-core 自身依赖只有 `pi-ai / typebox / yaml / ignore`，**无任何 web 框架、无 `next/server`、无 React**。
  - （注：对 "next/react" 的全仓 grep 命中的是 `proxy.ts` 里 "reactivity" 注释和测试文件里的 "next" 单词，均为**误命中**，非真实依赖。）
- 核心入口 `.` **平台无关**；唯一带 Node 味的 `NodeExecutionEnv` 被隔离在 `./node` 子入口，且只在你用 `AgentHarness` 的文件/shell 能力时才需要。做分身对话 agent 用 `Agent` 类的话**完全不碰它**。
- pi-ai README 明确有 "Browser" 章节，env 访问藏在可注入的 `AuthContext` 之后 → 设计上就支持非 Node 宿主。

**能不能在 Next.js 里用 / 是否更顺？**
- 能用，且与其它 Node 后端（Hono / Express / Railway / Fastify）**无差别**——它就是个普通 ESM 库，在任意 server-side 运行时 `new Agent(...)` 即可。
- **没有为 Next 做任何特殊适配，也不需要**。在 Next 里它只会跑在 **server 侧**（Route Handler / Server Action / 自建 Node server），不能进 client bundle、不能进 Edge runtime（要 Node ≥22 + 可能加载原生 vendor SDK）。
- 黑客松对 Replica 而言：**用 Next API routes 也行，用独立 Node 服务（Hono/Express on Railway）也行**。若分身后端逻辑较重（流式、长任务、并发多分身），独立 Node 服务通常比塞进 Next serverless 更省心；但纯 Next 全栈也完全跑得通。**框架选择由你的整体架构决定，pi-agent-core 不构成约束。**

---

## 4. 核心 API / 用法（最小示例）

工具用 **TypeBox** 定义 schema；**无全局注册表**，工具挂在 `Agent.state.tools`。工具失败靠 **throw**（loop 捕获后产出 `isError:true`），不要把错误塞进 `content`。

```typescript
import { Agent, type AgentTool } from "@earendil-works/pi-agent-core";
import { getModel } from "@earendil-works/pi-ai"; // 或用 createModels()/builtinModels()
import { type Static, Type } from "typebox";

// 1) 定义一个工具
const schema = Type.Object({ expression: Type.String({ description: "math expression" }) });
const calculateTool: AgentTool<typeof schema, undefined> = {
  name: "calculate",
  label: "Calculator",                 // UI 标签
  description: "Evaluate mathematical expressions",
  parameters: schema,
  execute: async (_toolCallId, params) => {
    const result = new Function(`return ${params.expression}`)(); // 失败就 throw → isError
    return { content: [{ type: "text", text: `${params.expression} = ${result}` }], details: undefined };
  },
};

// 2) 定义 agent（注册工具 + system prompt + 模型）
const agent = new Agent({
  initialState: {
    systemPrompt: "你是张三的数字分身，用第一人称回答。需要时调用工具。",
    model: getModel("anthropic", "claude-sonnet-4-20250514"),
    tools: [calculateTool],
  },
  // 可选：工具调用前拦截（如禁用某些工具）
  beforeToolCall: async ({ toolCall }) =>
    toolCall.name === "bash" ? { block: true, reason: "bash disabled" } : undefined,
});

// 3) 跑一轮对话 + 拿输出（见 §5 流式）
await agent.prompt("17 * 23 等于多少？");
await agent.waitForIdle();
const finalMessages = agent.state.messages; // transcript（AgentMessage[]）
```

`Agent` 主要方法：`prompt(input, images?)` 启动一次 run；`continue()` 从 transcript 续跑；`steer(msg)`（run 中注入）/ `followUp(msg)`（停止后注入）；`subscribe(listener)→unsubscribe`；`abort()` / `waitForIdle()` / `reset()`；`get state()` / `get signal()`。

关键扩展回调（`AgentOptions`）：`convertToLlm`（有自定义消息角色时必填）、`transformContext`、`beforeToolCall` / `afterToolCall`、`prepareNextTurn`、`getApiKey(provider)`、`streamFn`（换 LLM 传输）、`onPayload` / `onResponse`。

---

## 5. 流式输出 —— 原生支持

**支持，且是 streaming-first 设计。** 通过 `agent.subscribe(listener)` 消费事件流：

```typescript
agent.subscribe((event) => {
  // 文本增量
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta")
    process.stdout.write(event.assistantMessageEvent.delta);
  // 工具执行结束
  if (event.type === "tool_execution_end")
    console.log(`\n[tool ${event.toolName}] isError=${event.isError}`);
});
await agent.prompt("...");
```

事件类型（`AgentEvent`）：`agent_start` / `agent_end{messages}` / `turn_start` / `turn_end{message,toolResults}` / `message_start` / `message_update{message,assistantMessageEvent}` / `message_end` / `tool_execution_start|update|end{result,isError}`。底层 pi-ai 的 `AssistantMessageEvent` 增量包括 `text_start/delta/end`、`thinking_start/delta/end`（推理过程）、`toolcall_start/delta/end`（工具参数增量，`partial-json` 解析）。

**接到 HTTP SSE 给前端**：在你的 Route Handler / Hono handler 里建一个 `ReadableStream`，在 `subscribe` 回调里把 `text_delta` 写成 SSE `data:` 行即可。pi-ai 底层传输本身支持 `transport: "sse" | "websocket" | "websocket-cached" | "auto"`。

**已内置"经服务器代理 LLM"的流式实现**：`src/proxy.ts` 的 `streamProxy()`——前端/客户端 `Agent` 把 `streamFn` 换成它，请求打到你自己的 `${proxyUrl}/api/stream`，服务器侧管 auth 并转发，事件以 SSE（`data: {...}`）回传、客户端重建 partial message。**这正是"前端 thin client + 后端持有 key"架构的现成方案**，对 Replica 很合适。

---

## 6. 多模态 —— 支持图片输入

`Agent.prompt` 有重载：`prompt(input: string, images?: ImageContent[])`（`agent.ts:326`）。底层 pi-ai 的 `UserMessage.content` 与 `ToolResultMessage.content` 都接受 `(TextContent | ImageContent)[]`，**连工具返回图片都支持**。

`ImageContent` 形状（`pi-ai/src/types.ts:338`）：
```typescript
interface ImageContent {
  type: "image";
  data: string;      // base64 编码的图片数据
  mimeType: string;  // 如 "image/jpeg" / "image/png"
}
```
用法：
```typescript
await agent.prompt("这张图里是什么？", [
  { type: "image", data: base64Str, mimeType: "image/png" },
]);
```
注意：是否真正解析图片取决于所选**模型**是否多模态（pi-ai 只收录支持工具调用的模型，多模态另看模型能力）。文本/音视频之外的模态目前以 image 为主。

---

## 7. LLM provider 配置 & OpenAI 兼容中转（cloudsway 等）

provider/模型由底层 **pi-ai** 管理，~35 个内置 provider（anthropic / openai / google / deepseek / xai / groq / openrouter / mistral / cloudflare ... ），外加**任意 OpenAI 兼容端点**（Ollama / vLLM / LM Studio 等）。

**配模型与 key 的常规姿势**：
```typescript
import { createModels } from "@earendil-works/pi-ai";
import { openaiProvider } from "@earendil-works/pi-ai/providers/openai";

const models = createModels();
models.setProvider(openaiProvider());                  // 默认从 OPENAI_API_KEY 解析 auth
const model = models.getModel("openai", "gpt-5.5")!;
// 把 model 放进 Agent.initialState.model；key 也可走 Agent 的 getApiKey(provider) 回调动态提供
```
auth 解析支持 env、注入的 `CredentialStore`、OAuth、AWS profile、gcloud ADC；`Agent` 还可用 `getApiKey(provider)` 回调按需提供 key。

**OpenAI 兼容中转（cloudsway 这类 base_url 转发）——支持**：
- 每个 `Provider` 有 `baseUrl` 字段（`models.ts:36/299/349`），`createProvider({ baseUrl, ... })` 可自定义。
- auth 解析时 `auth.baseUrl` 会**覆盖** model 的 baseUrl（`models.ts:247`：`requestModel = auth.baseUrl ? {...model, baseUrl: auth.baseUrl} : model`）。
- OpenAI 兼容 API 实现是 `src/api/openai-completions.ts`，`OpenAICompatibilityOptions`（`types.ts:688`）的兼容性怪癖"若未设则按 baseUrl 自动探测"。

**接 cloudsway 的推荐做法**（自建一个 OpenAI 兼容 provider）：
```typescript
import { createProvider } from "@earendil-works/pi-ai";
import { envApiKeyAuth } from "@earendil-works/pi-ai/auth/helpers"; // 路径以实际导出为准
// import openaiCompletions API 实现工厂

const cloudswayProvider = createProvider({
  id: "cloudsway",
  name: "Cloudsway Relay",
  baseUrl: "https://<你的cloudsway中转>/v1",   // OpenAI 兼容端点
  auth: { apiKey: envApiKeyAuth("Cloudsway API key", ["CLOUDSWAY_API_KEY"]) },
  models: [ /* 你要用的模型定义，api: "openai-completions" */ ],
  api: /* openaiCompletionsApi() */ undefined as any,
});
models.setProvider(cloudswayProvider);
```
> 注：本仓有 `api-relay-registry` / `cloudsway-api-skill` 两个 skill 记录中转站细节，接入时可让它们补全 base_url、模型命名与鉴权头。Cloudsway 还有自己的 Managed Agent API（OpenAI Responses 兼容），但作为 LLM 后端这里走 completions 兼容路径即可。

另：若走"后端持 key + 前端 thin Agent"，直接用 §5 的 `streamProxy`，key 永不下发到前端。

---

## 8. 怎么集成进 Replica（分身 agent 主体）

推荐形态（黑客松，轻量优先）：**后端 Node 服务里用 `Agent` 类**，每个分身一个 `Agent` 实例 / 每次会话构造一个。

1. **装依赖**：`npm i @earendil-works/pi-agent-core @earendil-works/pi-ai typebox`（Node ≥ 22.19）。
2. **建 provider/模型**：`createModels()` + `setProvider(...)`（或自建 cloudsway 兼容 provider，§7）。
3. **定义分身**：`new Agent({ initialState: { systemPrompt: <分身人设/记忆注入>, model, tools }, beforeToolCall, getApiKey } )`。
4. **接 HTTP**：在 Route Handler / Hono handler 里 `agent.subscribe(...)` → 把 `text_delta` 写成 SSE 返回前端；`await agent.prompt(userInput, images?)`。
5. **多分身**：每个 `Agent` 独立持有 transcript（`agent.state.messages`），互不干扰；并发跑多个实例即可。需要进程级 fleet 才看 `pi-orchestrator`（实验性，黑客松多半用不上）。
6. **持久化**：用 `Agent` 类时自己存 `agent.state.messages`（最简单，存 DB/JSON）；想要可分支 session + compaction + skills 再升级到 `AgentHarness` + 自定义 `SessionStorage`。

**必须遵守的不变量**（踩坑预防）：
- 工具失败用 **throw**，别把错误塞进 `content`。
- `convertToLlm` / `transformContext` / steering/follow-up getter **绝不能 throw**。
- 自定义 `streamFn` 要把失败**编码进返回流**（push `error` 事件）而非 reject。
- 单工具 `executionMode:"sequential"` 会强制**整批**顺序执行（默认 parallel）。
- 提前终止 run 需要一个工具批次里**每个**结果都 `terminate:true`。
- 用 `Agent` 类时 `message_end` 是工具 preflight 前的**屏障**，`beforeToolCall` 能看到含 assistant 消息的状态；裸 `agentLoop()` 流是观察性的，**不会** await 你的 handler。

---

## 9. memory / context 能力

**分两层看：**

- **`Agent` 类（轻量层）**：**自带 transcript（短期上下文）**，全程用 `AgentMessage[]`，只在调用 LLM 边界经 `transformContext`（可选）→ `convertToLlm`（必填，若有自定义角色）转成 LLM `Message[]`。提供 `transformContext` 钩子可做**上下文裁剪/注入检索结果（RAG）**。但**不自带跨会话长期记忆/向量库** —— 长期记忆要你自己接（存 DB、检索后用 `transformContext` 或拼进 systemPrompt 注入）。
- **`AgentHarness`（产品层）**：自带更完整的 context 管理：
  - **可分支 session 树**（`harness/session/session.ts`）：transcript 建模成可分支树，`buildContext()` 沿路径重建。可插拔 `SessionStorage`（内存 / JSONL 文件），可换成你的 DB。
  - **compaction（上下文压缩）**（`harness/compaction/`）：`DEFAULT_COMPACTION_SETTINGS = { enabled:true, reserveTokens:16384, keepRecentTokens:20000 }`，自动在接近上下文上限时压缩历史 + 生成分支摘要。
  - **skills / prompt 模板 / 丰富 hooks**。

**对 Replica 的建议**：分身的"记忆"= 人设 + 历史对话 + 知识库。短期对话上下文 pi-agent-core 已管；**长期记忆（员工知识、过往交流）需要自己建（DB/向量检索），通过 `transformContext` 或 systemPrompt 注入**。是否上 `AgentHarness` 取决于是否需要 session 分支 + 自动 compaction —— 黑客松初版用 `Agent` 类 + 自管存储通常更快。

---

## 关键文件路径速查

| 关注点 | 文件 |
|--------|------|
| `Agent` 类、`prompt(input, images?)` | `packages/agent/src/agent.ts`（`:326` prompt 重载，`:509` processEvents） |
| agent loop（核心驱动） | `packages/agent/src/agent-loop.ts`（`:155` runLoop） |
| 工具/事件/类型 | `packages/agent/src/types.ts`（`:371` AgentTool） |
| 经服务器代理的流式 streamFn | `packages/agent/src/proxy.ts`（`streamProxy`） |
| Node 执行环境（唯一 Node 耦合） | `packages/agent/src/node.ts` / `src/harness/env/nodejs.ts` |
| harness（session/compaction/skills/hooks） | `packages/agent/src/harness/agent-harness.ts` |
| LLM 底座：provider/模型/auth/baseUrl | `packages/ai/src/models.ts`（`:247` baseUrl 覆盖）、`src/providers/openai.ts` |
| 数据模型 ImageContent / Message / 兼容选项 | `packages/ai/src/types.ts`（`:338` ImageContent，`:688` OpenAI 兼容） |
| 已有前置调研 | `~/projects/pi-mono-research/docs/{pi-agent-core,pi-ai}.md` |

*调研日期：2026-06-27，基于 v0.80.2 源码静态分析，未实际运行。仓库内更深文档见 `packages/agent/docs/{agent-harness,hooks,models,observability,durable-harness}.md`。*
