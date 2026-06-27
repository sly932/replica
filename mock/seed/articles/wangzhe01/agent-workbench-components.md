---
title: 坐席工作台组件库说明
mis_id: wangzhe01
owner: 王哲
team: 灵犀组
updated: 2026-06-16
---

# 坐席工作台组件库说明

> 坐席工作台（workbench）是给真人坐席用的：当对话引擎答不出或用户要求转人工时，会话被转到这里，由坐席接管。本文讲工作台的核心业务组件、组件库使用规范和主题定制。工程结构、状态管理方案见《灵犀前端工程结构说明》。

## 1. 整体布局

工作台是经典三栏布局，对应三个核心区域组件：左侧会话列表、中间消息流、右侧上下文面板。

```
apps/workbench/src/
├── components/
│   ├── SessionList/      # 会话列表
│   ├── MessageStream/    # 消息流
│   ├── ContextPanel/     # 上下文面板
│   ├── QuickReply/       # 快捷回复
│   └── TransferButton/   # 转接按钮
├── stores/               # Zustand store
└── pages/Workbench.tsx   # 三栏装配
```

## 2. 核心业务组件

- **SessionList（会话列表）**：展示分配给当前坐席的会话，按「待接入 / 进行中 / 已结束」分组，未读消息打红点。数据来自 `useSessionStore`，会话状态变更通过 WebSocket 推送（`VITE_WS_URL`）实时更新。点击某条会话切换当前活跃会话。
- **MessageStream（消息流）**：中间主区，渲染当前会话的完整消息列表。区分三种消息来源：用户消息、机器人消息（转人工前对话引擎的自动回复，灰色标注）、坐席消息。长列表用虚拟滚动（`@lingxi/ui` 的 `VirtualList`）保证万条消息不卡。底部是输入框 + 发送。
- **ContextPanel（上下文面板）**：右侧，展示坐席接管这通会话需要的全部上下文——用户档案、历史工单、机器人转人工前识别到的意图与命中的知识条目。意图/知识数据由 agent-gateway 透传，口径找吴桐。
- **QuickReply（快捷回复）**：坐席常用话术模板，支持分组和变量占位（如 `{用户名}`）。点击插入到 MessageStream 的输入框。模板数据来自后端，坐席可在控制台维护。
- **TransferButton（转接按钮）**：把当前会话再转给其他坐席组或转回机器人。点击弹出转接目标选择弹窗，确认后调用 agent-gateway 接口。转接的分配逻辑和坐席组规则在后端，前端只负责发起。

## 3. 组件库使用规范

工作台和控制台共用自研组件库 **`@lingxi/ui`**（`packages/ui`），基于 React 18 + TypeScript 写，无第三方 UI 库依赖。规范：

- 优先用 `@lingxi/ui` 的基础组件（`Button`、`Modal`、`Input`、`Drawer`、`VirtualList`、`Avatar` 等），**不要私自引入 antd / MUI**，避免风格割裂和包体膨胀。
- 业务组件放各 app 自己的 `components/`，只有被两个 app 复用的才下沉到 `packages/ui`。
- 所有组件 props 必须有完整 TS 类型，导出 `xxxProps` interface。

## 4. 主题定制

`@lingxi/ui` 用 CSS 变量做主题，token 定义在 `packages/ui/src/theme/tokens.css`，分颜色、间距、圆角、字号几类（如 `--lx-color-primary`、`--lx-radius-md`）。工作台默认用浅色主题；坐席长时间盯屏，已支持深色主题，通过给根节点切 `data-theme="dark"` 切换。自定义主题不要硬编码色值，统一改 token。组件样式用 CSS Modules，命中 token 变量即可自动适配主题。
