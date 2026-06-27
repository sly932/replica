# Question Base 竞品深度调研

> 调研日期：2026-06-27
> 调研对象：Question Base（questionbase.com）—— Slack 原生的「答案自动捕获 + 知识沉淀」AI Answer Agent
> 调研目的：它把「答不出 → 转人工 → 答案沉淀复用」做成了闭环，是 Replica（员工数字分身平台）必须正面绕开、差异化的隐形对手。
> 来源标注：每个关键数据后附 URL。标「未找到」的为公开信息中未查到、未编造。

---

## 0. 一句话结论（给决策用）

Question Base = **「团队级、文档中心」的 Slack 自学习问答机器人**：在 Slack 里拦截重复问题，能答的直接答（基于 Confluence/Notion/Google Drive 等文档 + 历史问答），答不出/没把握就自动转给指定专家，专家在 thread 里回答后被捕获、经人工确认后沉淀进「Answer Bank」，下次自动复用。
它的「答不出→转人工→沉淀复用」闭环非常成熟，是它的核心壁垒。
**但它没有「每个员工各自的分身/人格」概念，没有多层用户记忆，也没有分身可转移/交接的概念**——它是一个**单一的、面向全公司的团队机器人**，知识是组织资产而非"某个人的分身"。这正是 Replica 的差异化立足点。

---

## 1. 一句话定位 + 公司背景

**定位（官网原话）**：
- "AI Answer Agent for Slack" / "Slack-First AI Answer Agent for Enterprises"
- "Train an AI agent on your company's docs, wikis & past chats to answer questions instantly in Slack."
- 早期被 Slack 称为 "Brilliant Bot"，帮 startup「在 Slack 工作流里沉淀知识、回答问题」。
- 来源：https://www.questionbase.com/

**公司背景**：
- 成立时间：2022 年（一说核心团队更早）。来源：https://tracxn.com/d/companies/questionbase/__3yw83OerOmw0WSGhw5U2q_-e9kIsuVWwGrPwBstiUfk
- 总部：美国佛罗里达州迈阿密（Miami, FL）。来源：Crunchbase https://www.crunchbase.com/organization/question-base
- 创始团队（3 人）：
  - **Kasper Pihl Tornøe** —— CEO
  - **Yana Tornoe** —— 联合创始人 / COO
  - **Stefan Vladimirov** —— 联合创始人 / CCO
  - 同一团队此前做过 **Swipes**（生产力 App，约 150 万下载量），是连续创业者。
  - 来源：https://www.questionbase.com/resources/blog/team/question-base-ai-tool-automates-repetitive-questions-slack ；https://theorg.com/org/question-base/org-chart/kasper-tornoe
- 融资：
  - **2023-09-12 Pre-Seed，约 $600K**（一说累计 ~$1.01M）。来源：https://www.crunchbase.com/funding_round/question-base-pre-seed--589bd957
  - 投资方：**Techstars**（毕业于其加速器）、**Zelda Ventures**、InnoFounder，以及来自 Salesforce / Google / Notion / Cisco / Airbnb / Carta / Stripe 的天使（Clara Liang、David Apple、Susan Kimberlin 等）。
  - 来源：上述 Crunchbase + 团队博客
- 规模与营收：
  - 2025 年 7 月：**ARR 约 $770K，团队约 7 人**（小而精的早期 SaaS）。来源：https://getlatka.com/companies/questionbase.com
- 里程碑：Techstars 毕业 → 关闭 pre-seed → 早期版本拿到 **Product Hunt「Product of the Day」**。来源：团队博客（同上）。

> 解读：这是一家**早期、小团队、营收百万美元以内**的创业公司，不是巨头。Replica 面对的是一个"成熟单点闭环 + 资源有限"的对手——它的闭环值得学，但它的产品边界（团队级、无分身、无记忆）短期内不太可能快速扩张到分身形态。

---

## 2. 目标客户 / 典型使用部门

- **客户画像**：成长型公司、中小到中型企业、远程/混合团队；也在向 Enterprise 延伸（有 Enterprise+ 套餐、HIPAA、白标、多 workspace）。
- **典型使用部门 / 场景**：
  - 内部支持 / IT / HR：员工重复问"流程怎么走、政策是什么"
  - 客户支持 / Customer Success：一线在 Slack 问二线/专家
  - 新员工 onboarding：替代反复问老员工
  - 销售/RevOps：销售在 Slack 问产品、定价、合规问题
- 宣传的企业级成果（官方）：3 个月内重复问题 ↓60%、每位专家每周省 6+ 小时、向资深员工的升级 ↓45%、新人 onboarding 快 3 倍。来源：https://www.questionbase.com/ ；https://clearfeed.ai/blogs/8-best-knowledge-base-bots-for-slack-in-2025

---

## 3. 核心痛点与价值主张

**它瞄准的痛点**：
- 专家被同样的问题反复打断，时间被重复 Q&A 吞掉
- 知识散落在文档/Slack 历史里，搜不到、过时、没人维护
- 新人 onboarding 慢、答案不一致

**价值主张**：
- "能答的瞬间答（3.2 秒），只在真正遇到新问题时才打扰专家" —— 主打 **90% 自动化率**。来源：https://www.questionbase.com/
- "把每天的 Q&A 变成一个自我改进的知识库（self-improving knowledge base）" —— 这是它和 Replica 飞轮叙事最像的一句。
- 不用从零搭知识库：直接接入既有文档源，5 分钟上线。

---

## 4. 核心功能模块（逐条）

来源主要为官网首页、Slack Marketplace 列表、官方博客。

| 模块 | 说明 |
|---|---|
| **Answers in Slack** | 员工在 Slack（频道或 DM）发问，bot 在 thread 内回答，延迟约 3.2s，带来源引用（citations） |
| **Knowledge Capture / Save Knowledge** | 一键把有价值的 Slack thread/专家回答存进知识库；专家可「Save for later」稍后精修 |
| **文档源接入** | Confluence、Notion、Google Drive、Jira、Salesforce、Zendesk、Intercom 等 10+ 源；Enterprise 可接 AWS Knowledge Base |
| **Smart Escalation（升级转人工）** | bot 遇到新问题 / 没把握时，自动升级给指定专家或支持频道 |
| **Human Verification（人工确认）** | 专家在 thread 内回答，QB 捕获后，**经人工 verify 才进入永久 Answer Bank**；强调"AI generated → Human verified" |
| **Set Tone of Voice / Answer Instructions** | 管理员给 bot 设"答案指令"，定制语气/人格——注意：这是**整个 bot 一个统一人格**，不是每个员工各自的人格 |
| **Track Automation Rate** | 仪表盘显示自动化率（AI vs 团队解决占比） |
| **Track Saved Time / Insights** | 显示节省工时、解决时长；New Questions 洞察暴露知识缺口、被差评的答案 |
| **权限感知检索** | 检索时尊重用户在源系统中的访问权限（permission-aware） |
| **安全/合规** | SOC 2 Type II、Slack SSO、RBAC；Enterprise 支持 HIPAA、白标、多 workspace、AWS 部署 |

**装在哪**：**Slack 优先（Slack-native）**。明确自我定位 "Slack-First"。未找到独立 Microsoft Teams 版本的明确证据（对比对象 Starmind 同时支持 Teams 与 Slack；QB 主打 Slack）。来源：https://slack.com/marketplace/A029XL66FSS-question-base

---

## 5. 「答不出 → 转人工 → 沉淀复用」闭环具体怎么运转（重点）

这是 QB 的核心机制，和 Replica「双路自进化飞轮」正面竞争。官方把它叫 **The Knowledge Loop**：

1. **Capture（捕获）**：员工在 Slack 发问，bot 通过语义检索识别意图，在所有接入的文档 + 历史问答里搜索（尊重权限）。
2. **Answer or Escalate（答 or 升级）**：
   - 答过的/有把握的 → **即时自动回答**（带来源，3.2s）。
   - 遇到新问题 / **置信度不足** → **自动升级**给指定专家或支持频道（"When Question Base encounters a new question or lacks confidence in the answer, it automatically escalates to designated experts"）。
3. **Expert Answers in Thread（专家在 thread 里答）**：专家直接在 Slack thread 回复，QB **捕获这条回答**。
4. **Human Verify（人工确认）**：回答经专家/团队 lead **verify**（查准确性、补缺失上下文、确认 action item）后，才进入永久 **Answer Bank**；官方称这种"AI 生成 + 人工确认"模式可达到很高准确率（宣传 99.99%，营销数字）。
5. **Refine（持续精修）**：答案可在 Slack 内被持续优化；Insights 暴露被差评/未评分的答案，提示去改。
6. **Reuse（复用）**：下次相似问题，bot 直接用沉淀好的答案自动回答——形成自学习循环。

来源：
- https://www.questionbase.com/
- https://slack.com/marketplace/A029XL66FSS-question-base
- https://www.questionbase.com/resources/blog/role-human-in-the-loop-ai-slack-workflows

> **闭环强在哪**：
> - 真正打通了「检测重复问题 → 没把握就转人工 → 人工答案被捕获并人工确认 → 自动复用」全链路，且**人工确认（verify）这一步是显式产品功能**，不是靠用户自觉。这保证了沉淀质量，是它最硬的壁垒。
> - 完全嵌在 Slack 既有工作流里，专家**零额外操作**（在 thread 里正常回答即可被捕获），冷启动/采用门槛低。
>
> **闭环的边界（对我们重要）**：
> - 沉淀单位是**组织级 Answer Bank**，一个公司一个共享知识库，知识与"谁回答的"弱绑定（专家只是临时被路由的人，回答归库后就脱离个人）。
> - 没有"按人建模"的概念：它学的是"这个公司对这个问题的标准答案"，不是"张三会怎么回答、李四的风格/职责边界是什么"。

---

## 6. 有没有「每个员工各自的分身/人格」？记忆/个性化？（重点确认缺失）

**结论：没有。这是它最明确的产品空白。**

- **无 per-employee 分身/人格**：QB 是**单一的、全公司共享的一个 bot**。唯一的"人格"是管理员通过 "Set Tone of Voice / Answer Instructions" 设的**全局统一语气**——是给整个机器人定调，不是给每个员工各建一个有自己人格的分身。多个来源（官网首页、Slack Marketplace、官方"how it works"）均**未提及** per-employee persona。来源：WebFetch 官网首页 / Slack Marketplace 抓取结论："No per-employee AI personas, memory systems, or individual user personalization are mentioned."
- **无多层用户记忆 / 越用越懂你**：未找到任何"记住提问者是谁、记住某员工的偏好/历史、按用户个性化回答"的功能。它的"学习"是**知识层面的学习**（积累问答对），不是**对个体用户的记忆建模**。它在频道级有 "Channel-Specific Customization"，但那是按频道/部门，不是按人。
- **无"了解每个用户"**：检索时只用到权限信息（你能看到什么），不构建"你是谁、你的角色、你在意什么"的用户画像。
- **无分身可转移/交接概念**：知识本就是组织共享资产，不存在"把某人的分身交接给接班人"这一叙事——因为它根本没有"某人的分身"这个对象。

> 一句话：QB 学的是 **"公司知道什么"**；Replica 学的是 **"每个具体的人是谁、知道什么、会怎么答"**。这是品类层面的差别，不是功能多寡的差别。

---

## 7. 技术亮点（公开范围）

- **RAG / 语义检索**：bot 分析问题文本 → 语义检索识别意图 → 在接入源 + 历史问答中检索 → 生成带引用的答案。属于典型的"文档 RAG + 历史问答增强"。
- **置信度判断 + 兜底**：明确有"低置信度则升级"的机制（confidence-based escalation），这是它闭环的关键开关。具体阈值/算法**未公开**。
- **权限感知检索**：检索尊重源系统权限（permission-aware retrieval），避免越权泄露。
- **人工确认作为质量闸门**：用 human-in-the-loop verify 兜住 LLM 幻觉（官方亦自承"LLMs can sometimes make mistakes, double-check sources"）。
- **底层模型**：仅称"使用 LLMs"，**具体用哪家模型未公开**（未找到）。
- 合规：SOC 2 Type II；Enterprise 提供 AWS 部署 / AWS Knowledge Base 接入 / HIPAA。
- 来源：https://www.questionbase.com/resources/blog/role-human-in-the-loop-ai-slack-workflows ；https://slack.com/marketplace/A029XL66FSS-question-base

---

## 8. 商业模式与定价

按席位订阅（per-user/month），偏年付。官方 pricing 页（抓取于 2026-06）：

| 套餐 | 价格 | 关键点 / 限制 |
|---|---|---|
| **Proof of Concept** | **$1,000 / 2 个月** | 落地支持、ROI 分析、SOC2、最多接入 10,000 页文档；单频道、仅 curated 文档、2 个月承诺 |
| **Annual Pro** | **$6,000 / 年（约合 $5/用户/月，年付）** | 落地实施、部门级访问、分析、直接支持、SOC2；每席位 200 页文档上限、不限提问数与频道、Slack Connect 支持 |
| **Enterprise+** | **$20,000 / 年（约合 $15/用户/月，年付）** | 自定义集成、AWS 部署、白标、AWS Knowledge Base、多 workspace、HIPAA、定制功能 |

- 来源：https://www.questionbase.com/pricing
- 注：第三方文章里有"免费 Starter / Pro $8（年付 $5）"等旧口径（来源：clearfeed、perfectwikiforteams），与官网当前 pricing 页存在出入——**以官网为准**。这说明它定价/打包在迭代，且**已从 PLG 自助小团队向"先 PoC 再年付 Enterprise"的销售型打法转**。

> 解读：客单价不高、走年付 + PoC 验证 ROI 的打法，典型早期 B2B SaaS。Replica 如果走"每人一个分身"，席位逻辑天然不同（QB 是"用 bot 的人"付费，Replica 可以是"被建分身的人"× "用分身的人"，定价想象空间更大）。

---

## 9. 明显短板 / 空白

1. **无个体分身、无个性化记忆**（见第 6 节）——最大空白。
2. **知识与人弱绑定**：专家只是被临时路由的"答案来源"，沉淀后即脱离个人；无法回答"找谁问"这类专家定位需求（这点 Starmind 反而强：Starmind 主打"实时专家网络/expertise location"）。
3. **平台单一**：Slack-First，Teams 支持弱/未明确；对纯 Teams 客户不友好。
4. **沉淀仍依赖人工 verify**：质量靠人把关，专家不配合就转不起来（双刃剑：质量高但有运营负担）。
5. **小团队、资源有限**：~7 人、ARR <$1M，产品扩张速度受限。
6. **品类天花板**：本质是"更聪明的团队问答机器人"，叙事天花板在"知识库自动化"，难自然延伸到"数字员工/人的延伸"。
7. **被平台原生能力挤压风险**：Slack AI、Glean、Notion AI 等都在做"企业内问答"，QB 的护城河主要是闭环捕获 + verify 流程，而非不可替代的技术。

---

## 10. 对 Replica 最关键的差异化（逐条评估是否成立）

Replica 的四个差异点 vs Question Base：

### ① 每人一个有人格的分身 —— ✅ 差异成立（QB 完全没有）
- QB：**全公司一个 bot，一个全局语气**。"Answer Instructions"只是给这一个 bot 调语气。
- Replica：**N 个员工 = N 个有各自人格的分身**，替本人答、带本人风格/职责边界。
- 结论：**这是品类级差异，不是换皮**。QB 在产品架构上就没有"个体"这个对象。
- 立足点话术："QB 学的是公司知道什么；Replica 学的是每个人是谁、会怎么答。"

### ② 多层记忆（越用越懂你）—— ✅ 差异成立（QB 没有用户记忆）
- QB：学习只发生在**知识层**（积累问答对），**不对提问者/被问者个体建模**，无跨对话的用户记忆/画像。
- Replica：分身对"它代表的人"和"来问它的人"都建模，越用越懂。
- 结论：成立。需注意把"记忆"做实（多层：本人知识 + 本人风格 + 对提问者的了解），否则容易被说成"也是 RAG 历史问答"。
- 风险提示：QB 的"历史问答复用"表面上也像"记忆"。**差异化要落在"对人的记忆"而非"对问答的复用"**，叙事要锐利区分这两者。

### ③ 双路自进化飞轮（答不出转真人 + 真人答完沉淀回分身）—— ⚠️ 部分成立，需小心
- **这一条恰恰是 QB 做得最成熟的地方**（第 5 节的 Knowledge Loop = 答不出→转人工→人工确认→沉淀复用）。
- 如果只讲"答不出转人工、答完沉淀"，**几乎等于 QB 的现成功能，容易被说成换皮**。
- Replica 的真差异**不在"有没有闭环"，而在"沉淀回哪里"**：
  - QB 沉淀进**组织共享 Answer Bank**（去个人化）。
  - Replica 沉淀回**那个人自己的分身**（强个人化，越来越像本人）。
- 结论：差异**成立但必须重新框定**——卖点是"沉淀回个人分身、让分身越来越像本人"，而不是"我们也有闭环"。
- 立足点话术："同样是答完沉淀，QB 沉淀成一本公司手册，Replica 沉淀成更聪明的你。"

### ④ 分身可转移 / 交接 —— ✅ 差异成立（QB 无此概念，但需求要验证）
- QB 没有"分身"对象，自然没有"交接分身"。员工离职后，其知识若已 verify 进 Answer Bank 则留存，但那是**去个人化的知识**，不是"接班人继承前任的分身"。
- Replica：分身是可交接的资产——员工离职/转岗，接班人继承一个"懂前任所有事"的分身。
- 结论：差异成立，是 QB 完全的空白区。**但这是"愿景型"卖点，真实付费需求需验证**（HR/交接场景的付费意愿）。

---

### 综合立足点（防"换皮"指控的两条最稳的线）

1. **「个体 vs 组织」的品类差异（最稳）**：QB 是组织级共享知识库机器人，Replica 是"每个人的数字分身"。这是架构层面的不同对象模型，QB 想追要重做数据模型（每人一套人格 + 记忆），不是加个开关。**主打这条，最难被反驳成换皮。**
2. **「沉淀回个人、越用越像本人」而非「沉淀进公司手册」**：把双路飞轮的落点从"组织知识库"改成"个人分身的自我进化 + 记忆"，正面区隔 QB 最强的闭环。

**要避免的陷阱**：不要把宣传重心放在"我们有答不出转人工再沉淀的闭环"——这是 QB 的主场，单讲这个 = 自动落入"换皮"叙事。差异必须时刻锚定在**"对人/个体的建模"**上。

---

## 附：主要来源清单

- 官网首页：https://www.questionbase.com/
- 定价页：https://www.questionbase.com/pricing
- Slack Marketplace 列表：https://slack.com/marketplace/A029XL66FSS-question-base
- Human-in-the-loop 博客：https://www.questionbase.com/resources/blog/role-human-in-the-loop-ai-slack-workflows
- 团队/创始人采访：https://www.questionbase.com/resources/blog/team/question-base-ai-tool-automates-repetitive-questions-slack
- Crunchbase：https://www.crunchbase.com/organization/question-base ；融资轮 https://www.crunchbase.com/funding_round/question-base-pre-seed--589bd957
- Tracxn：https://tracxn.com/d/companies/questionbase/__3yw83OerOmw0WSGhw5U2q_-e9kIsuVWwGrPwBstiUfk
- Getlatka（营收/团队）：https://getlatka.com/companies/questionbase.com
- The Org（高管）：https://theorg.com/org/question-base/org-chart/kasper-tornoe
- 第三方对比/榜单：https://clearfeed.ai/blogs/8-best-knowledge-base-bots-for-slack-in-2025 ；https://perfectwikiforteams.com/blog/top-ai-knowledge-agents-for-slack/
- Starmind（对照组）：https://www.starmind.com/how-starmind-works
