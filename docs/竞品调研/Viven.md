# 竞品调研：Viven（员工 AI 数字分身平台）

> 调研日期：2026-06-27
> 调研对象确认：真实产品名为 **Viven**，官网 [viven.ai](https://viven.ai/)。拼写不是 Vivenue / Vivian。注意官网上个人版产品叫 **AskSila**，公司主体是 Viven。
> 一句话：Eightfold 两位联合创始人新创办的企业级"员工 AI 数字分身"平台，让你在同事不在线时，直接问他的 AI 分身拿到答案。

---

## 1. 一句话定位 + 公司背景

**定位**：为企业里每一个员工创建一个个性化 AI 数字分身（Digital Twin），分身基于该员工的邮件、文档、会议、聊天记录训练，能模仿他"怎么想、怎么沟通、怎么做事"。当本人不在/太忙时，同事、客户可以直接和这个分身对话，异步拿到这个人掌握的知识，沉淀组织记忆。官网 slogan：**"AI versions of your expertise and the experts you depend on"**、**"Digital Twins turn tacit expertise into infrastructure that the whole organization can rely on."**

**公司背景**：
- **创始人**：Ashutosh Garg（CEO）和 Varun Kacholia（CTO）——两人是招聘 AI 独角兽 **Eightfold AI** 的联合创始人（Eightfold 曾估值约 $2.1B、服务 100+ 财富 500 强）。两人有 Google / IBM / Eightfold 多年推荐引擎、个性化算法背景。两人同时仍在管理 Eightfold。来源：[TechCrunch](https://techcrunch.com/2025/10/15/eightfold-co-founders-raise-35m-for-viven-an-ai-digital-twin-startup-for-querying-unavailable-coworkers/)
- **孵化关系**：Viven 是从 Eightfold 内部孵化出来的独立公司（co-venture），现为独立运营。来源：[Eightfold 博客](https://eightfold.ai/blog/meet-viven-ai/)
- **融资**：2025 年 10 月 15 日带 **$35M 种子轮** 走出隐身（emerged from stealth）。领投：**Khosla Ventures、Foundation Capital**；参投：**FPV Ventures、Operator Collective** 及多位天使。来源：[PR Newswire](https://www.prnewswire.com/news-releases/viven-emerges-from-stealth-with-35m-in-funding-to-bring-ai-digital-twins-to-the-enterprise-302585135.html)
- **成立时间**：2025 年早期已在内部使用（Eightfold 各团队从 2025 年初起用），2025 年 10 月公开。
- **总部**：美国加州 Santa Clara。
- **团队规模**：**未找到**公开数字（属早期种子阶段团队）。

---

## 2. 目标客户

- **客户规模/类型**：**大型企业（Enterprise）** 为主。已部署客户包括 **Genpact（约 14 万员工的全球 IT/BPO 巨头）、Josh Bersin Company、Prodapt、Red Crackle、Eightfold** 自身，以及多家未具名的财富 500 强。来源：[官网](https://viven.ai/) / [Eightfold 博客](https://eightfold.ai/blog/meet-viven-ai/)
- **面向人群**：定位是**全员（every employee）**，不局限于某个部门。但叙事里高频出现的场景偏向：知识管理 / 跨部门协作 / 高管决策 / 销售客户团队 / 知识传承（员工离职时保留其知识）。HR 是其中一条线（Eightfold 基因 + Josh Bersin 这种 HR 分析师背书），但产品本身定位比 HR 更宽，是"组织知识基础设施"。
- 官网把客户分三层：**Individuals（AskSila，个人建分身）→ For Business（团队级）→ For Enterprise（定制部署，需预约 demo）**。

---

## 3. 核心痛点与价值主张

它说自己解决的核心问题（投资方 Foundation Capital 的论述最直白）：
- **"员工 30% 的时间花在重复性工作上——回答同样的问题、反复解释背景、找信息。"** 来源：[Foundation Capital](https://foundationcapital.com/ideas/announcing-our-investment-in-viven-a-personalized-ai-for-every-employee/)
- **关键知识锁在个人脑子里**，员工离职/请假/跨时区时，知识随之消失或不可达。
- **协作靠开会和等人**，效率低。

价值主张关键词：
- 让专家知识"**变成基础设施**"，可被全组织复用（turn tacit expertise into infrastructure）。
- **Human amplification（人的放大），而非自动化替代**——本人始终 in the loop。
- "让工作以思考的速度运转，而不是开会的速度"（work at the speed of thought, not the speed of meetings）。
- 知识**永久化、可规模化、随时可达**；员工离职后知识仍在。

---

## 4. 核心功能模块

来源主要是 [官网](https://viven.ai/) 和媒体报道，逐条列：

1. **个性化数字分身（Digital Twin）**：为每个员工训练一个**专属 LLM**，喂入其邮件、文档、代码、聊天、会议记录，学习其思考方式、决策上下文与沟通风格。
2. **Tacit Knowledge Encoding（隐性知识编码）**：捕捉 playbook、权衡取舍、例外情况、决策逻辑——不只是文档检索，而是"为什么这么决定"。
3. **Knowledge Assistants（知识助手）**：基于精选资料源 + 机构知识构建的领域专用助手。
4. **Team Twin（团队级分身）**：把多个个人分身的专长合并成一个团队统一视图。例：CEO 开会前问"某全球大客户团队"（含销售、FDE、PM、支持）的团队分身，拿到客户整体最新进展。
5. **Agentic Workflows（智能体工作流）**：把对话转成可执行动作——状态更新、审批、交接、自动化任务。
6. **Personas（人设/分场景共享）**：可针对不同受众（同事 / 客户 / 上级）定制分身共享的上下文和口径。
7. **Always-On Availability**：分身 7×24 处理重复问题，本人腾出时间。
8. **会前简报 / 跨渠道对话提炼**：分身能在开会前给你简报，提炼跨 Slack/邮件/会议的对话。
9. **隐私与权限模块（重点，见第 6 节）**：pairwise privacy、RBAC、完整审计日志、查询历史可见。

**知识从哪来 / 集成在哪**（官网列出的连接器，覆盖面广）：
Box、Clari、Confluence、GitHub、Gmail、Google Calendar、Google Drive、Google Meet、Jira、OneDrive、Outlook、Outlook Calendar、Salesforce（Case/Deal）、SharePoint、**Slack、Microsoft Teams、Webex、Zoom**。
→ 既能在 Slack/Teams 里用，也有独立 Web App 对话界面。

---

## 5. 产品形态与用户流程（0 到用起来）

典型路径（综合官网与报道）：
1. **接入数据源**：员工/管理员授权连接邮箱、Slack/Teams、Google Drive、会议记录等。
2. **训练分身**：系统基于这些数据为该员工建专属模型 + 知识图谱，学习其知识、经验、专长与沟通风格。
3. **设置隐私/人设**：员工设定谁能访问自己的分身、对不同人共享什么口径（admin 级 + 个人级双层隐私设置）。
4. **共享分身**：分享后，同事/客户可随时与之对话（"no scheduling, no waiting"），本人 in the loop。
5. **提问与纠偏**：同事像和真人聊天一样提问；本人能收到对话记录（chat transcript），可纠正分身的错误回答，分身用强化学习持续改进。
6. **审计**：本人随时能看到自己分身的**查询历史（谁问了什么）**。

部署落地速度参考：**Genpact 在全球领导层部署用了约 8 周**；Brian Baral（Genpact）说"本来要几个月的交接，几天就无缝完成"。来源：[官网](https://viven.ai/)

---

## 6. 技术亮点（公开信息）

- **Per-employee 专属 LLM**：不是一个大模型 + 检索，而是强调"为每个人定制 LLM"，学习个人风格。来源：[Inc](https://www.inc.com/ben-sherry/viven-says-ai-clones-of-your-employees-will-boost-productivity-heres-how/91253251) / [SiliconANGLE](https://siliconangle.com/2025/10/15/ai-startup-viven-raises-35m-create-digital-twins-fill-absent-team-members/)
- **知识图谱 + LLM（降低幻觉）**：用知识图谱给 LLM 回答做接地（grounding），图谱连接三个维度——**knowledge（信息）、experience（交互模式）、expertise（领域精通）**，并捕捉上下文随时间演化、分析"为什么问这个问题"。来源：[diginomica](https://diginomica.com/could-employee-digital-twins-streamline-collaboration-viven-co-founder-ashutosh-garg-thinks-so)
- **Pairwise Context and Privacy（成对上下文与隐私，核心专有技术）**：LLM 能根据"**谁在问**"精确判断哪些信息可共享、哪些不能；只共享双方**都有权访问**的信息。
- **强化学习持续改进**：每次交互后用 RL 提升准确度；本人纠错反哺。
- **隐私/权限方案**：
  - 细粒度 **RBAC（基于角色的访问控制）** + 完整审计日志 + **回答带来源引用（source citations）**。
  - 安全护栏：屏蔽敏感话题（医疗、财务、家庭等个人隐私），阻止泄露未授权机密数据（PII、信用卡号等）。
  - **查询历史对本人可见**（who asked what）——作为"问不当问题"的威慑机制。
  - 双层隐私设置（admin + 个人）。
- **部署形态**：SaaS（托管）/ VPC（私有）/ On-Premises（BYOC，自带云），企业级数据隔离与加密，合规就绪。来源：[官网](https://viven.ai/) / [PR Newswire](https://www.prnewswire.com/news-releases/viven-emerges-from-stealth-with-35m-in-funding-to-bring-ai-digital-twins-to-the-enterprise-302585135.html)
- **底层基础模型**（用的是 OpenAI/Anthropic 还是自训）：**未找到**明确说明，只强调"为每个员工定制 LLM"。

---

## 7. 商业模式与定价

- **模式**：企业级 SaaS（按席位/企业订阅，推测），分 AskSila（个人）/ For Business（团队）/ For Enterprise（定制，需 Book a Demo）三层。
- **具体定价**：**全部未公开**。官网无价目表，企业层级一律"预约 demo / 联系销售"。多个媒体均确认无公开价格。

---

## 8. 差异化亮点 vs 短板/空白

### 差异化亮点
- **创始团队背书强**：Eightfold 两位创始人 + 顶级 VC（Khosla、Foundation），自带企业级销售渠道与财富 500 强信任。
- **隐私是核心卖点而非补丁**：pairwise privacy + 查询历史可见 + 双层权限，直面"AI 分身泄露隐私/被滥用"这个最大顾虑，做得比一般知识库深。
- **知识图谱 + 个性化 LLM**：不止 RAG 检索，强调捕捉"决策逻辑/隐性知识/个人风格"，定位比"企业搜索"高一层。
- **Team Twin + Agentic Workflows**：从"问个人"升级到"问团队"再到"触发动作"，叙事完整。
- **集成面广**：覆盖几乎所有主流企业 SaaS 数据源。

### 明显短板 / 空白（重点：它没做好或没做的地方）
- **极早期、仍在调试**：分析师 George Lawton 指出产品仍在"语气、微调、RL"的活跃实验期，更像早期部署而非成熟产品。来源：[diginomica](https://diginomica.com/could-employee-digital-twins-streamline-collaboration-viven-co-founder-ashutosh-garg-thinks-so)
- **"Creepy / 信任"门槛**：媒体普遍提到"让人能问到当面不敢问的问题"有点瘆人（creepy），存在把沟通委托给 AI 代理的心理障碍。这是采纳的最大软阻力。来源：[TechCrunch](https://techcrunch.com/2025/10/15/eightfold-co-founders-raise-35m-for-viven-an-ai-digital-twin-startup-for-querying-unavailable-coworkers/)
- **准确性/答错责任未量化**：分身答错谁负责、准确率多少、"不知道时怎么办"——官方无指标，仅靠本人事后纠错。
- **重 Enterprise、对中小团队不友好**：8 周部署、需 demo、无自助定价，SMB / 中小团队几乎进不去；个人版 AskSila 的成熟度和独立价值不清晰。
- **冷启动依赖数据量**：新员工/数据稀疏的人，分身没东西可学，价值低（恰恰新人最需要问问题）。
- **定价完全黑盒**，决策周期长。
- **偏英文/北美企业生态**，无中文/本地化、无国内 IM（飞书/钉钉/企业微信）集成。
- **同步实时性弱**：偏"异步答重复问题"，不解决需要本人实时判断的复杂决策。

---

## 9. 可参考的截图 / Demo 链接

- 官网（产品页、功能、集成列表、客户证言）：https://viven.ai/ ；关于页 https://viven.ai/about
- Eightfold 官方介绍博客：https://eightfold.ai/blog/meet-viven-ai/
- TechCrunch 报道：https://techcrunch.com/2025/10/15/eightfold-co-founders-raise-35m-for-viven-an-ai-digital-twin-startup-for-querying-unavailable-coworkers/
- SiliconANGLE（技术细节）：https://siliconangle.com/2025/10/15/ai-startup-viven-raises-35m-create-digital-twins-fill-absent-team-members/
- diginomica（创始人访谈 + 知识图谱细节 + 分析师视角）：https://diginomica.com/could-employee-digital-twins-streamline-collaboration-viven-co-founder-ashutosh-garg-thinks-so
- Foundation Capital 投资论述：https://foundationcapital.com/ideas/announcing-our-investment-in-viven-a-personalized-ai-for-every-employee/
- Josh Bersin 分析师文章：https://joshbersin.com/2025/10/arriving-now-the-digital-twin/
- Inc 报道：https://www.inc.com/ben-sherry/viven-says-ai-clones-of-your-employees-will-boost-productivity-heres-how/91253251
- **公开 Demo 视频**：**未找到**独立的 YouTube 产品演示视频；演示需在官网 "Book a Demo" 预约。

---

## 10. 对我们的启发（黑客松同类产品）

**可避开的同质化 / 差异化方向：**

1. **打 Viven 进不去的市场：中小团队 + 自助化 + 中国本地生态。** Viven 重 Enterprise、8 周部署、无自助定价、无飞书/钉钉/企业微信集成。我们可以做"**5 分钟自助建分身、原生集成飞书/企微/钉钉**"的轻量版，直接吃它够不到的中小团队和国内市场。

2. **正面解决它的两个最大软肋：信任(creepy) 和 冷启动。**
   - **信任**：把"本人可控"做到极致——分身回答前可设"草稿模式/本人审核后才发"、回答永远带来源引用、被问敏感问题主动转人工。把"透明可控"做成产品的第一卖点而非合规附录。
   - **冷启动**：对数据稀疏的新人，做"**主动访谈式建分身**"（AI 定期问本人几个问题来补全知识），而不是被动等数据。这是 Viven 叙事里的空白。

3. **聚焦"重复问题沉淀"这个最小可用且高频的场景，别一上来铺 Team Twin / Agentic Workflows。** 黑客松资源有限，Viven 摊子大但都半成品；我们做窄做深——**"同事问 → 分身答 → 答不出转本人 → 本人回答自动沉淀进分身"** 这个闭环跑通就赢。把"答不出/不确定"的优雅降级（转人工 + 沉淀）做成核心体验，正是 Viven 没讲清楚的地方。

4. **可借鉴但要做得更轻**：pairwise 权限（只答双方都有权看的信息）、查询历史对本人可见——这两个隐私机制是对的，值得抄，但用更简单的权限模型实现即可。

---

### 关键事实速查表

| 维度 | 内容 | 来源 |
|---|---|---|
| 公司/产品 | Viven（个人版 AskSila），viven.ai | 官网 |
| 创始人 | Ashutosh Garg (CEO)、Varun Kacholia (CTO)，Eightfold 联创 | TechCrunch |
| 融资 | $35M 种子轮（2025-10），Khosla / Foundation Capital 领投 | PR Newswire |
| 总部 | 加州 Santa Clara | PR Newswire |
| 目标客户 | 大型企业（Genpact 14万人等），全员定位 | 官网 |
| 核心技术 | per-employee 定制 LLM + 知识图谱 + pairwise privacy + RL | SiliconANGLE / diginomica |
| 集成 | Slack/Teams/Gmail/Drive/Salesforce/Jira/Zoom 等 20+ | 官网 |
| 部署 | SaaS / VPC / 本地（BYOC） | 官网 |
| 定价 | 未公开，需预约 demo | 多源 |
| 最大短板 | 早期不成熟、creepy 信任门槛、重 Enterprise、冷启动、无国内生态 | diginomica / TechCrunch |
