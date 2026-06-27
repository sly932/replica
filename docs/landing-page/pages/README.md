# Replica 落地页 · 四主题设计稿

> 纯原生 HTML/CSS/JS（vanilla），零构建，每个主题一个子目录，`index.html` 用 `file://` 直接打开。
> 设计语言学自 matrix.build / luciusai.com（见 `../references/`）：
> **Instrument Serif 衬线大标题 + 单词斜体强调 · DM Mono 小标签 · 全屏 Hero 文字叠加 · sticky scroll-spy 滚动叙事 · 宽幅图 footer**。
> 图片复用 `../assets/<风格>/`。四页**结构/文案完全一致**，只换主题色板 + 图片 + 比喻语气。

## 四个主题

| 目录 | 主题 | 色板 | Hero 图 | Footer |
|---|---|---|---|---|
| `classical-myth/` | 古典神话（标杆） | 奶油 + 暖金 `#B0763A` | 双子 dioscuri | 宽幅西西弗斯 |
| `biblical/` | 圣经 / 神授 | 羊皮纸 + 圣金 `#C39A3E` | 神光降临 divine-light | 神光横幅 divine-light-wide |
| `photoreal/` | 写实摄影 | 白 + 墨蓝 `#2F4BFF` | 城市天际线 | 开阔草地 |
| `vector/` | 极简矢量 | 米 + 青绿 `#1FA980` | 矢量 variant-04（contain 不裁切） | CSS 青绿渐变（无宽幅图） |

## 统一页面结构

1. **Nav**（透明浮于 hero，滚动加底）
2. **Hero**：全屏图 + 文字叠加左侧 + 邮箱胶囊
3. **信任行**
4. **怎么工作**：左 sticky 目录(01–04 高亮) + 右分段（scroll-spy，`IntersectionObserver`）
   - 01 创建分身 / 02 替你答重复问题 / 03 答不出转真人 / 04 越用越聪明
5. **能力 Bento**
6. **Footer CTA**：宽幅图/渐变背景 + 最终 CTA + 链接

## 主题差异实现要点

- **改主题只动 `style.css` 的 `:root` 九个变量**（+ scrim/nav 里几处硬编码底色 rgb）+ index.html 的图片路径。
- **古典神话/圣经/写实/矢量步骤配图数量不同**：圣经只 step01 配图（创造亚当），写实只 step02（室内演示），其余步骤做纯文字卡（删 `.step-media`）。
- **矢量特殊**：插画不能 cover 裁切 → hero `object-fit:contain`；footer 无宽幅图 → CSS 渐变 + `.cta::before` 浅色 scrim。

## 下一步

选定主题后，按 ui-preview 流程移植进 `frontend/`（Vite + React）作为正式落地页路由。
