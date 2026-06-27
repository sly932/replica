# pi-agent-core / pi-ai 集成速查

> 本文所有 API 均**从已安装的类型定义/源码核实**（版本 `0.80.2`），不是猜测。
> 路径前缀：`web/node_modules/@earendil-works/`，下文简称 `pi-agent-core/`、`pi-ai/`。
> 用途：在 Next.js 里用 `Agent` 接 cloudsway 的 OpenAI Responses API，写 `lib/agent`。

---

## 0. 心智模型（先看这个）

`Agent` **不是**直接吃 `provider`/`tools` 的构造器。它的设计是：

- **模型 + systemPrompt + tools + messages** 全部放在 `initialState` 里（`AgentState`）。
- **怎么调 LLM** 由 `streamFn` 决定（`StreamFn` 类型）。默认是 `pi-ai/compat` 的 `streamSimple`（走内置 api-registry + 环境变量取 key）。
- 接**自定义 baseUrl + key** 的正路：自己造一个 `Model<"openai-responses">`（里面带 `baseUrl`），再要么用 `createProvider` + `createModels` 包一层，要么直接把 openai-responses 的 `streamSimple` 当 `streamFn`（显式传 apiKey）。

```
initialState.model : Model<"openai-responses">  ← 带 baseUrl 的模型描述
streamFn           : 决定怎么把 (model, context) 发给 LLM、key 从哪来
tools              : initialState.tools，AgentTool[]，schema 用 typebox
prompt()/subscribe : 跑 + 订阅流式事件
```

---

## 1. `Agent` 类怎么构造

来源：`pi-agent-core/dist/agent.d.ts:5-55`（`AgentOptions` + `class Agent`），状态结构 `pi-agent-core/dist/types.d.ts:279-304`（`AgentState`）。

```ts
import { Agent } from "@earendil-works/pi-agent-core";

const agent = new Agent({
  // —— 初始状态（systemPrompt / model / tools / messages 都在这里）——
  initialState: {
    systemPrompt: "你是 ...",           // string
    model,                              // Model<any>，见 §2
    thinkingLevel: "off",              // "off"|"minimal"|"low"|"medium"|"high"|"xhigh"
    tools: [searchKnowledgeTool],      // AgentTool<any>[]，见 §3
    messages: [],                      // AgentMessage[]，见 §6
  },
  streamFn,                            // StreamFn，见 §2（不传则用 compat.streamSimple）
  // 可选钩子：
  transformContext,                    // 注入记忆，见 §6
  convertToLlm,                        // 自定义消息→LLM 消息，见 §6
  beforeToolCall, afterToolCall,       // 工具拦截/改写
  toolExecution: "parallel",          // "parallel"(默认) | "sequential"
  sessionId: "conv-123",
});
```

`AgentOptions` 关键字段（`agent.d.ts:5-23`）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `initialState` | `Partial<Omit<AgentState, "pendingToolCalls"\|"isStreaming"\|"streamingMessage"\|"errorMessage">>` | 不能初始化只读运行态字段 |
| `streamFn` | `StreamFn` | `(model, context, options?) => AssistantMessageEventStream \| Promise<...>`。默认 `streamSimple`（`agent.js:115`） |
| `convertToLlm` | `(AgentMessage[]) => Message[] \| Promise<Message[]>` | 自定义消息类型时必填 |
| `transformContext` | `(AgentMessage[], signal?) => Promise<AgentMessage[]>` | 召回记忆注入点 |
| `getApiKey` | `(provider) => string \| undefined \| Promise<...>` | 动态 key（OAuth 续期用） |
| `beforeToolCall`/`afterToolCall` | 见 `types.d.ts:40-91` | 拦截/改写工具结果 |
| `sessionId` / `thinkingBudgets` / `transport` | | 转发给 provider |

> ⚠️ 没有 `provider:` / `apiKey:` 这种构造参数。Provider/key 通过 `model.baseUrl` + `streamFn` 体现。

构造后也能改状态（`README` 与 `agent.d.ts:72`）：
`agent.state.model = ...`、`agent.state.tools = [...]`、`agent.state.systemPrompt = "..."`（赋数组会拷贝顶层数组）。

---

## 2. 接 cloudsway（OpenAI Responses API）的确切写法

核心类型 `Model<TApi>`：`pi-ai/dist/types.d.ts:561-585`。`baseUrl` 直接喂给 OpenAI SDK 的 `baseURL`（`pi-ai/dist/api/openai-responses.js:168-170`），SDK 调 `client.responses.create` → 实际打到 `{baseUrl}/responses`。

> 所以 **cloudsway 的 `baseUrl` 要写到 `/v1` 这层**：`https://api.agentsway.dev/v1`，最终请求 `https://api.agentsway.dev/v1/responses`。（user 给的是 `https://api.agentsway.dev`，需补 `/v1`，上线前用 `onPayload`/抓包确认一次。）

### 2a. 先定义模型描述

```ts
import type { Model } from "@earendil-works/pi-ai";

const cloudswayModel: Model<"openai-responses"> = {
  id: "gpt-5",                       // cloudsway 上的模型名（按其文档填）
  name: "Cloudsway GPT-5",
  api: "openai-responses",           // 关键：走 Responses 协议
  provider: "cloudsway",             // 自定义 provider id
  baseUrl: "https://api.agentsway.dev/v1",
  reasoning: true,                   // 是否推理模型
  input: ["text", "image"],          // 支持多模态输入
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 200000,
  maxTokens: 32000,
  // 自定义 OpenAI 兼容端点可按需加 compat（OpenAIResponsesCompat, types.d.ts:427）
  // compat: { supportsDeveloperRole: true },
};
```

### 2b. 方式 A（推荐）：`createProvider` + `createModels`

`createProvider` 真实签名：`pi-ai/dist/models.d.ts:122`
`createProvider<TApi>(input: CreateProviderOptions<TApi>): Provider<TApi>`
`CreateProviderOptions`：`models.d.ts:95-115`（`{ id, name?, baseUrl?, headers?, auth, models, refreshModels?, api }`）。
`auth: ProviderAuth`（`pi-ai/dist/auth/types.d.ts:176`，至少含 `apiKey`），`envApiKeyAuth(name, envVars)` 是标准实现（`auth/helpers.d.ts:8`）。
api 实现走 lazy 包装：`openAIResponsesApi()`（`pi-ai/dist/api/openai-responses.lazy.d.ts`）。

```ts
import { createModels, createProvider, envApiKeyAuth, type StreamFn } from "@earendil-works/pi-ai";
// 注意：createModels/createProvider 等是从包根 "@earendil-works/pi-ai" 导出
import { openAIResponsesApi } from "@earendil-works/pi-ai/api/openai-responses.lazy";

const cloudsway = createProvider({
  id: "cloudsway",
  name: "Cloudsway",
  baseUrl: "https://api.agentsway.dev/v1",
  // 用环境变量取 key（存储凭据优先，其次第一个命中的 env）
  auth: { apiKey: envApiKeyAuth("Cloudsway API Key", ["CLOUDSWAY_API_KEY"]) },
  models: [cloudswayModel],
  api: openAIResponsesApi(),         // 单 api；混合 api 用 { "openai-responses": ..., ... } 映射
});

const models = createModels();
models.setProvider(cloudsway);

// 把 models.streamSimple 当作 Agent 的 streamFn
const streamFn: StreamFn = (model, context, options) =>
  models.streamSimple(model, context, options);
```

env 里设 `CLOUDSWAY_API_KEY=sk-...`，Bearer 由 OpenAI SDK 自动加。

### 2c. 方式 B（最省事，Server Route 里直接显式传 key）

openai-responses 实现模块直接导出 `streamSimple`（`pi-ai/dist/api/openai-responses.d.ts:12`），可绕过 provider auth、显式传 `apiKey`（README 第 1032 行明说允许）：

```ts
import { streamSimple as openaiResponsesStream } from "@earendil-works/pi-ai/api/openai-responses";
import type { StreamFn, Model } from "@earendil-works/pi-ai";

const streamFn: StreamFn = (model, context, options) =>
  openaiResponsesStream(model as Model<"openai-responses">, context, {
    ...options,
    apiKey: process.env.CLOUDSWAY_API_KEY!,   // 显式注入
  });
```

> 两种都行。方式 A 更“正统”（统一 auth/凭据），方式 B 在 Next.js 服务端最直接。`lib/agent` 建议用 B 起步，需要多模型/凭据管理再切 A。

`SimpleStreamOptions`（`types.d.ts:210-214`）支持 `reasoning`、`thinkingBudgets`，继承 `StreamOptions`（`temperature`/`maxTokens`/`signal`/`apiKey`/`headers`/`sessionId`/`onPayload`/`onResponse` 等，`types.d.ts:44-120`）。

---

## 3. 工具（tools）定义 —— schema 用 **typebox**

类型：`AgentTool`（`pi-agent-core/dist/types.d.ts:325-343`），基类 `Tool`（`pi-ai/dist/types.d.ts:312-316`）。
schema 用 **typebox**（`pi-agent-core` 依赖 `typebox@1.1.38`；`Type`/`Static`/`TSchema` 从 `@earendil-works/pi-ai` 根重导出，`pi-ai/dist/index.d.ts:1-2`）。**不是 zod、不是裸 JSON Schema**（typebox 产物本身即 JSON Schema 对象）。

```ts
import type { AgentTool } from "@earendil-works/pi-agent-core";
import { Type, type Static } from "@earendil-works/pi-ai";

const SearchParams = Type.Object({
  query: Type.String({ description: "检索关键词" }),
  topK: Type.Optional(Type.Number({ description: "返回条数", default: 5 })),
});

const searchKnowledgeTool: AgentTool<typeof SearchParams> = {
  name: "search_knowledge",          // 模型看到的工具名
  label: "Search Knowledge",          // UI 显示用（AgentTool 比基础 Tool 多这个）
  description: "在用户的知识库/记忆中检索相关内容",
  parameters: SearchParams,           // typebox schema
  // execute：成功返回 content；失败请 throw，别把错误塞进 content
  execute: async (toolCallId, params, signal, onUpdate) => {
    // params 已按 schema 校验，类型 = Static<typeof SearchParams>
    onUpdate?.({ content: [{ type: "text", text: "检索中…" }], details: {} });

    const hits = await fakeSearch(params.query, params.topK ?? 5); // TODO: 接真实检索
    return {
      content: [{ type: "text", text: hits.map(h => h.text).join("\n---\n") }],
      details: { count: hits.length },   // 任意结构，给日志/UI 用
      // terminate: true,                 // 可选：批内全部 terminate 才会停下一轮 LLM
    };
  },
};
```

返回类型 `AgentToolResult<T>`（`types.d.ts:306-316`）：`{ content: (TextContent|ImageContent)[]; details: T; terminate?: boolean }`。

**失败处理**：直接 `throw new Error(...)`（`types.d.ts:333` 注释 + README「Error Handling」）。Agent 会捕获并以 `isError: true` 的 toolResult 报给模型。**不要**自己返回错误文本当 content。

---

## 4. 流式：订阅事件 + 接 SSE

订阅用 `agent.subscribe(listener)`（`agent.d.ts:66`），返回取消订阅函数。事件类型 `AgentEvent`（`pi-agent-core/dist/types.d.ts:360-398`）：

`agent_start | agent_end | turn_start | turn_end | message_start | message_update | message_end | tool_execution_start | tool_execution_update | tool_execution_end`

**文本增量在 `message_update` 里**：它带 `assistantMessageEvent`（底层 `AssistantMessageEvent`，`pi-ai/dist/types.d.ts:330-383`），其 `type` 有 `text_start | text_delta | text_end | thinking_start/delta/end | toolcall_start/delta/end | done | error`。要 `text_delta` 就这样取：

```ts
agent.subscribe((event, signal) => {
  if (event.type === "message_update" &&
      event.assistantMessageEvent.type === "text_delta") {
    const chunk = event.assistantMessageEvent.delta;   // 新增文本片段
    // → 写进 SSE
  }
});
```

### 接 Next.js SSE（App Router, Route Handler）

```ts
// app/api/chat/route.ts
export async function POST(req: Request) {
  const { message } = await req.json();
  const agent = buildReplicaAgent();      // 见 §8

  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      const send = (data: unknown) =>
        controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));

      const unsub = agent.subscribe((event) => {
        if (event.type === "message_update" &&
            event.assistantMessageEvent.type === "text_delta") {
          send({ type: "delta", text: event.assistantMessageEvent.delta });
        } else if (event.type === "tool_execution_start") {
          send({ type: "tool", name: event.toolName });
        } else if (event.type === "agent_end") {
          send({ type: "done" });
        }
      });

      // prompt() 在 agent_end（含已 await 的监听器）后才 resolve
      agent.prompt(message).finally(() => { unsub(); controller.close(); });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
```

> `prompt()` 的 Promise 在 `agent_end` 及其 await 监听器全部 settle 后才完成（`agent.d.ts:96-100` `waitForIdle`）。错误不会从 streamFn 抛出，而是以 `message.stopReason==="error"`/事件流 error 出现（pi-ai README「Error Handling」）。

---

## 5. 多模态：`prompt(text, images)` 真实签名

重载（`agent.d.ts:104-105`）：

```ts
prompt(message: AgentMessage | AgentMessage[]): Promise<void>;
prompt(input: string, images?: ImageContent[]): Promise<void>;
```

`ImageContent` 确切字段（`pi-ai/dist/types.d.ts:236-240`）：

```ts
interface ImageContent {
  type: "image";
  data: string;       // base64（不带 data: 前缀）
  mimeType: string;   // 如 "image/jpeg" / "image/png"
}
```

> 字段是 `data` + `mimeType`，**没有** `url` 字段。用法：

```ts
await agent.prompt("这张图里是什么？", [
  { type: "image", data: base64Str, mimeType: "image/jpeg" },
]);
```

---

## 6. 对话状态 / 记忆

**transcript 就是 `agent.state.messages`**（`AgentMessage[]`，`AgentState` 在 `types.d.ts:279-304`）。`AgentMessage = Message | 自定义类型`，`Message = UserMessage | AssistantMessage | ToolResultMessage`（`pi-ai/dist/types.d.ts:265-293`）。

### 持久化
没有内置 DB。自己存：每轮结束读 `agent.state.messages` 序列化落库；恢复时 `new Agent({ initialState: { messages: 已存的数组, ... } })` 或 `agent.state.messages = restored`。
（pi-agent-core 另有 `harness/session/*`：`jsonl-repo` / `memory-repo` 等会话存储工具，`index.d.ts:8-12`，需要文件级会话再看。）

### 注入外部召回记忆 —— 用 `transformContext`
`transformContext(messages, signal) => Promise<AgentMessage[]>`（`agent.d.ts:8`，契约见 `agent-loop.d.ts:143-163`）。它在每次 LLM 调用前、`convertToLlm` 之前跑，**适合把检索到的记忆插进上下文**（不污染落库的真实 transcript）：

```ts
const agent = new Agent({
  initialState: { systemPrompt, model, tools },
  transformContext: async (messages, signal) => {
    const lastUser = [...messages].reverse().find(m => m.role === "user");
    const memory = await recall(lastUser);   // 你的向量召回
    if (!memory.length) return messages;
    const memoryMsg: AgentMessage = {
      role: "user",
      content: `【相关记忆】\n${memory.join("\n")}`,
      timestamp: Date.now(),
    };
    return [memoryMsg, ...messages];          // 不要 throw，失败就原样返回
  },
});
```

> 静态人设放 `systemPrompt`（可随时 `agent.state.systemPrompt = ...`）；**动态召回放 `transformContext`**。契约：`transformContext`/`convertToLlm` 都**不能 throw**，失败要返回安全兜底值。

---

## 7. embedding：pi-ai **没有** embedding 接口（已确认）

`pi-ai/dist` 全量 `grep -ri "embedding"` 无任何命中，README 同样无。pi-ai 只覆盖 **chat（stream/complete）+ image generation（generateImages）**。
→ embedding 走你的独立 OpenAI 兼容服务（自己 `fetch {base}/v1/embeddings`），**与 pi-ai 无关**，符合既定方案。

---

## 8. 最小可用 ReplicaAgent（cloudsway + 1 工具 + 流式）

`lib/agent.ts`：

```ts
import { Agent, type AgentTool } from "@earendil-works/pi-agent-core";
import { Type, type Static, type Model, type StreamFn } from "@earendil-works/pi-ai";
import { streamSimple as openaiResponsesStream } from "@earendil-works/pi-ai/api/openai-responses";

// —— 1) cloudsway 模型描述（OpenAI Responses 协议）——
const cloudswayModel: Model<"openai-responses"> = {
  id: "gpt-5",
  name: "Cloudsway GPT-5",
  api: "openai-responses",
  provider: "cloudsway",
  baseUrl: "https://api.agentsway.dev/v1",   // SDK 会打到 /v1/responses
  reasoning: true,
  input: ["text", "image"],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 200000,
  maxTokens: 32000,
};

// —— 2) streamFn：显式注入 Bearer key（方式 B）——
const streamFn: StreamFn = (model, context, options) =>
  openaiResponsesStream(model as Model<"openai-responses">, context, {
    ...options,
    apiKey: process.env.CLOUDSWAY_API_KEY!,
  });

// —— 3) 工具：searchKnowledge stub（typebox schema）——
const SearchParams = Type.Object({
  query: Type.String({ description: "检索关键词" }),
  topK: Type.Optional(Type.Number({ default: 5 })),
});

const searchKnowledgeTool: AgentTool<typeof SearchParams> = {
  name: "search_knowledge",
  label: "Search Knowledge",
  description: "在用户知识库中检索相关内容",
  parameters: SearchParams,
  execute: async (_id, params: Static<typeof SearchParams>) => {
    // TODO: 接真实检索 / 向量召回
    const text = `（stub）未接入检索，query=${params.query}`;
    return { content: [{ type: "text", text }], details: { stub: true } };
  },
};

// —— 4) 工厂 ——
export function buildReplicaAgent() {
  return new Agent({
    initialState: {
      systemPrompt: "你是用户的数字分身，用第一人称、贴合其语气作答。",
      model: cloudswayModel,
      tools: [searchKnowledgeTool],
      messages: [],
    },
    streamFn,
    // 记忆注入：transformContext: async (m) => [...recall, ...m]
  });
}
```

用法（流式见 §4 的 Route Handler）：

```ts
const agent = buildReplicaAgent();
agent.subscribe((e) => {
  if (e.type === "message_update" && e.assistantMessageEvent.type === "text_delta")
    process.stdout.write(e.assistantMessageEvent.delta);
});
await agent.prompt("你好");                      // 纯文本
// await agent.prompt("看看这张图", [{ type:"image", data: b64, mimeType:"image/png" }]);
```

---

## 9. 速记（写 lib/agent 直接抄）

- 构造：`new Agent({ initialState:{ systemPrompt, model, tools, messages }, streamFn })` —— 没有 `provider`/`apiKey` 参数。
- provider：`createProvider({ id, baseUrl, auth:{ apiKey: envApiKeyAuth(...) }, models, api: openAIResponsesApi() })` + `createModels().setProvider()`；或直接 `openai-responses` 模块的 `streamSimple` 当 `streamFn` 显式传 `apiKey`。
- 模型：`Model<"openai-responses">`，`api:"openai-responses"`，`baseUrl` 含 `/v1`。
- 工具：`AgentTool`，schema = typebox（`Type.Object`），失败 `throw`，成功返回 `{ content, details }`。
- 流式：`agent.subscribe`，取 `event.type==="message_update" && event.assistantMessageEvent.type==="text_delta"` → `.delta`。
- 多模态：`prompt(text, ImageContent[])`，`ImageContent = { type:"image", data:base64, mimeType }`。
- 记忆：transcript = `agent.state.messages`；召回注入用 `transformContext`（不能 throw）。
- embedding：pi-ai 没有，走外部服务。
