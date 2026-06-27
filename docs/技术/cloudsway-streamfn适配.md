# cloudsway Responses API 自定义 streamFn 适配

> 解决「分身 chat 流式解析不出文本」的 bug。
> 相关文件：`web/lib/llm/cloudswayStream.ts`、`web/lib/llm/chat.ts`。

## 根因

分身 agent 用 cloudsway 做 chat（base `https://api.agentsway.dev`，`POST /v1/responses`，
声称 OpenAI Responses 兼容）。原实现 `chat.ts` 直接把 pi-ai 的
`openai-responses` 的 `streamSimple` 当 streamFn，结果：assistant message 的 `content`
是空数组，但 `usage.output` 有 token。

cloudsway 的 Responses **SSE 流省略了 OpenAI 的标准结构事件**——没有
`response.output_item.added` / `response.content_part.added` / `response.output_text.done`。
pi-ai 内部用的 OpenAI SDK 累加器靠这些事件组装文本块，缺了就组装不出 → content 为空。

## cloudsway SSE 真实格式（curl 实测）

每行 `data: {...}`，对象有 `type`：

- `{"type":"response.output_text.delta","delta":"我",...}` ← **文本增量在 `delta`**
- `{"type":"response.reasoning.stopped","thought":"...",...}` ← 思考（MVP 忽略）
- `{"type":"response.completed","response":{"output_text":"完整文本","output":[...],"usage":{"input_tokens":..,"output_tokens":..}}}` ← 末尾全量 + usage
- 其余 created / in_progress / model.* / step.* / plan.* 对取文本无用

## 方案

新建 `web/lib/llm/cloudswayStream.ts`，**绕过 OpenAI SDK**，直接 `fetch` + 手解析 SSE：

1. 请求体把 pi 的 `Context` 转成 cloudsway 格式：
   `{ model, input, stream:true, instructions? }`。
   - `systemPrompt` → `instructions`（不进 input）。
   - `messages` → `input` 多模态数组：user 文本 `{type:'input_text'}`、图片
     `{type:'input_image', image_url:'data:<mime>;base64,<data>'}`（与 OpenAI Responses 等价，
     已对照 pi-ai `openai-responses-shared.ts` 的 `convertResponsesMessages`）；历史 assistant
     文本回放为 `{type:'output_text'}`。toolResult 暂不回放（TODO）。
2. `fetch(`${model.baseUrl}/responses`, { Bearer key, Accept: text/event-stream })`，
   key 取自 `options.apiKey`（`chat.ts` 显式注入 `CHAT_API_KEY`）。
3. 按行读流，解析 `data:` JSON：
   - `response.output_text.delta` → 首次 emit `text_start`，随后每次 emit `text_delta`，
     并累加到 partial assistant message 的 text 块。
   - `response.completed` → 取 `output_text` 兜底补差量、读 `usage`（input/output tokens）。
   - 流结束 → emit `text_end` + `done`（带最终 assistant message）。
4. 返回 pi 期望的 `AssistantMessageEventStream`。

### 关键坑：AssistantMessageEventStream 被 export type 遮蔽

`@earendil-works/pi-ai` 主入口里 `AssistantMessageEventStream` 被 `export type` 重导出，
当值用会报 `TS1362`。改用同模块导出的工厂函数 `createAssistantMessageEventStream()` 拿运行时值，
类型仍从主入口 `import type`。

### MVP 边界

- 仅纯文本输出。cloudsway 流里的 tool 事件留 TODO 注释，不处理也不崩。
- reasoning/thinking 事件忽略。

## 验证

1. `cd web && npx tsc --noEmit` 通过。
2. 端到端：
   ```
   curl -N -s -X POST http://localhost:3000/api/chat \
     -H 'Content-Type: application/json' \
     -d '{"message":"用一句话介绍自己"}' --max-time 45
   ```
   实际输出（逐字流式 + done）：
   ```
   data: {"type":"delta","text":"你好"}
   data: {"type":"delta","text":"，"}
   data: {"type":"delta","text":"我是你"}
   data: {"type":"delta","text":"的数字分身，"}
   ...
   data: {"type":"done"}
   ```
