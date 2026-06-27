---
title: 灵犀前端工程结构说明
mis_id: wangzhe01
owner: 王哲
team: 灵犀组
updated: 2026-06-09
---

# 灵犀前端工程结构说明

> 本文是灵犀前端的入口文档，新同学先读这篇把工程结构、技术栈、本地启动和对接约定搞清楚，再去看具体业务模块的子文档。前端有两块业务：商家控制台（console）和坐席工作台（workbench），坐席工作台的组件细节单独见《坐席工作台组件库说明》。

## 1. 仓库形态：单 monorepo

灵犀前端是**一个 monorepo**，用 pnpm workspace 管理，没有拆多仓。这样做的主要原因是 console 和 workbench 复用大量自研组件和请求层，分仓维护成本太高。仓库名 `lingxi-web`，根目录结构：

```
lingxi-web/
├── apps/
│   ├── console/          # 商家控制台
│   └── workbench/        # 坐席工作台
├── packages/
│   ├── ui/               # 自研组件库 @lingxi/ui
│   ├── hooks/            # 通用 hooks
│   ├── request/          # 请求层封装（axios + 拦截器）
│   └── shared/           # 类型、常量、工具函数
├── pnpm-workspace.yaml
└── package.json
```

两个 app 各自独立构建、独立部署，但共享 `packages/` 下的内部包，内部包通过 `workspace:*` 引用。

## 2. 技术栈

- **React 18.2** + **TypeScript 5.3**，全量函数组件 + hooks，不写 class 组件。
- **Vite 5.1** 作为构建和 dev server。
- **状态管理**：全局状态用 **Zustand 4.5**，按业务域拆 store（如 `useSessionStore`、`useAuthStore`）；服务端数据缓存用 **TanStack Query 5**，不要把接口数据塞进 Zustand。
- **路由**：React Router 6。
- **样式**：CSS Modules + 自研 ui 库的设计 token，不引入 Tailwind。
- 包管理统一 **pnpm 8.15**，请勿用 npm/yarn，会破坏 lockfile。

## 3. 本地启动与构建

```bash
pnpm install              # 根目录安装所有依赖
pnpm --filter console dev # 启动控制台，默认 5173 端口
pnpm --filter workbench dev
pnpm --filter console build
pnpm lint && pnpm typecheck
```

## 4. 与后端 console-api 的对接约定

前端所有请求走 `packages/request` 的统一实例，baseURL 由环境变量注入。对接约定：

- 接口走 RESTful，统一前缀 `/api/v1`，鉴权用请求头 `Authorization: Bearer <token>`。
- 响应体统一包一层 `{ code, data, msg }`，拦截器里 `code !== 0` 抛业务错误。
- 接口契约以后端维护的 OpenAPI（Swagger）为准，前端用脚本 `pnpm gen:api` 生成 TS 类型。**console-api 的字段含义、分页约定有疑问找陈昊**；转人工/坐席相关接口（agent-gateway）找吴桐，需求口径找林悦。

## 5. 环境配置

环境变量放 `.env.{mode}`，Vite 约定 `VITE_` 前缀才会注入。关键变量：`VITE_API_BASE`（后端网关地址）、`VITE_WS_URL`（坐席工作台长连接地址）、`VITE_ENV`（dev/staging/prod）。本地开发拷 `.env.example` 改即可，敏感配置不进仓库。

## 6. 灰度发布与前后端版本对齐

> ⚠️ 这块目前没有形成稳定文档。灰度发布时前端如何与后端版本对齐、前端自己怎么做灰度（按商家维度还是按流量）当前是和运维、陈昊临时对齐的，没有沉淀成规范。后续补。
