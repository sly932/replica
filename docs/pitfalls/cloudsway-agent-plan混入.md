# 坑：cloudsway 把 agent 编排产物(plan/reasoning)混入流式输出

## 现象
分身流式回复正常，但**尾部偶发**冒出 JSON 垃圾，如：
`…尽管问我吧！"},"plan_update":{"plan_id":"plan-001",...},"reasoning_summary":"…"}`

## 根因
cloudsway 的 `POST /v1/responses` **不是纯 chat completions/responses，而是一个 agent API**（带 `plan` / `reasoning` / multi-step 编排、`max_steps` 1–10）。默认会做多步 agent 编排，某些回答里 `response.completed` 的 `output_text` 或编排事件会**把 plan/reasoning 元数据掺进文本**。

我们只想把 cloudsway 当**底层 LLM**用——真正的 agent 循环（工具调用等）由 **pi-agent-core** 负责，不该让 cloudsway 再套一层 agent。

## 修复（`web/lib/llm/cloudswayStream.ts`）
1. 请求 body 加 **`max_steps: 1`** —— 单步纯回答，关掉 cloudsway 的 agent 编排。
2. streamFn **只信任 `response.output_text.delta` 的逐字累加**；**不要**用 `response.completed` 的 `output_text` 去覆盖/补 tail（那是唯一能把非增量内容注入正文的路径）。仅当一个 delta 都没收到（acc 为空）时才用 completed 兜底。

## 教训
- 接第三方"OpenAI 兼容"端点前，先确认它是 **chat 级** 还是 **agent 级**。agent 级的默认编排会污染纯文本输出。
- 当底层 LLM 用时：`max_steps:1`，且解析只取 text delta，别信末尾汇总字段。
