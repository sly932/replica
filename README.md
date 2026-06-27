# Replica · 员工数字分身平台

> toB Agent 赛道参赛项目 · 单人 · 开发窗口 6/27 11:05 → 6/28 14:30

**一句话定位**：3 分钟创建你的数字分身，替你回答重复问题、答不出转真人、越用越聪明、越用越懂你；经验可沉淀、可交接、可流动。

## 目录结构

```
replica/
├─ docs/                      产品级文档（纲领 / 需求 / 调研 / 设计稿）
│  ├─ 产品定义与执行蓝图.md    项目纲领，所有决策以此为准
│  ├─ 需求规格.md             谁用、用来干什么、页面与流程、MVP 验收标准
│  ├─ 参赛说明/               赛题截图等参赛资料
│  ├─ 竞品调研/               赛道格局 + Lucius / QuestionBase / Viven 拆解
│  └─ ui-preview/             ui-preview skill 产出的 HTML 设计稿
├─ frontend/                  Vite + React 19 + TypeScript 前端工程
└─ mock/                      mock 数据方案（mock-plan.md）
```

## 前端开发

```bash
cd frontend
npm install
npm run dev      # 本地开发
npm run build    # 构建
npm run lint     # oxlint 检查
```

技术栈：Vite 8 + React 19 + TypeScript + oxlint。

## 约定

- 产品级文档统一进 `docs/`。
- UI 变更先走 ui-preview skill 出 HTML 设计稿，产物落在 `docs/ui-preview/`，确认后再写真实代码。
