# Landing Page 示例图片（生成资产）

> 用 **oFoxAI**（中转，见 `~/.claude/skills/api-relay-registry`）调用 **`google/gemini-3-pro-image-preview`**（Nano Banana Pro）生成。
> 接口：`POST https://api.ofox.ai/v1/images/generations`，返回 `b64_json`。
> 主题统一：**数字分身 / 经验长成分身**（replica 产品母题）。每种风格独立子文件夹。
>
> **主方向已定：古典神话叙事（明亮）`04-classical-myth/`**。其余三路（圣经/写实/矢量）作补充素材，全部走「明亮、开阔」基调。

### 画幅标准（重要）

| 用途 | 比例 | size 参数 |
|---|---|---|
| Footer 满宽横幅 | **~2.4:1（约 21:9）** | `2048x768` |
| Hero（带天际线/广角） | 16:9 | `1792x1024` |
| 中央演示 / 一般叙事图 | 3:2 | `1536x1024` |

### 当前主方向：古典神话叙事（明亮）

`04-classical-myth/` —— **明亮新古典史诗画**（提埃波罗/普桑通透蓝天，非暗调）。
口味校准（用户反馈）：**简洁 · 开阔 · 多天空/广角 · 淡雅和谐配色 · 寓意深远 · 元素少 · 不封闭**。Footer 用宽幅。

| 文件 | 神话 | 尺寸比 | 与产品的呼应 / 用途 |
|---|---|---|---|
| `sisyphus.png` | 西西弗斯推石上山 | 3:2 | 把重复劳作交给分身 ✅ 用户喜欢 |
| `sisyphus-wide.png` | 同上·**宽幅全景** | 2.4:1 | **footer 底部专用**，开阔淡雅 |
| `icarus.png` | 伊卡洛斯飞向太阳 | 16:9 | 满幅天空·极简·冲向高处 |
| `atlas.png` | 阿特拉斯擎天（星座天球） | 3:2 | 承载知识/宇宙·纪念碑式 |
| `prometheus-simple.png` | 普罗米修斯独自举火 | 3:2 | 点亮智慧之火·留白多 |
| `dioscuri-twins.png` | 双子 Castor & Pollux（一凡一神） | 3:2 | **「你+数字分身」隐喻最贴**·左侧留白放标题 |

> 已删：`pygmalion.png`（柱子封闭、不够开阔）、旧 `prometheus.png`（元素太多、杵三人）。

### 补充风格（均已改为明亮版）

**`05-biblical/` 明亮圣经/神授** —— 文艺复兴古典油画，改亮：
| 文件 | 画面 | 比例 |
|---|---|---|
| `creation-of-adam.png` | 创造亚当式神授生命 | 3:2 |
| `jacobs-ladder.png` | 雅各天梯·开阔天空 | 3:2 ⚠️自带金色画框，需加 `no frame/border` 重画 |
| `divine-light.png` | 神光降临·孤身 | 3:2 |
| `divine-light-wide.png` | 神光横幅 | 2.4:1 |

**`02-photoreal/` 写实（按位置区分，不一律用室内）：**
| 文件 | 用途 | 比例 |
|---|---|---|
| `hero-skyline.png` | 顶部·城市天际线+天空 | 16:9 |
| `footer-grassland.png` | 底部·开阔草地+天空 | 2.4:1 |
| `footer-sea.png` | 底部·大海+天空（备选） | 2.4:1 |
| `demo-indoor.png` | 中央演示·室内（复用首版） | 3:2 |

**`03-minimal-vector/` 极简矢量（多变体）：** `variant-01`(复用首版) / `variant-02` 人+分身 / `variant-03` 记忆核连多渠道 / `variant-04` 双人分身。3:2。

> ~~`01-warm-3d/`~~ ❌ 已删。

## 生成方式（复现 / 续画）

脚本与 job 清单在临时 scratchpad；核心调用：

```bash
curl -s -X POST https://api.ofox.ai/v1/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OFOXAI_API_KEY" \
  -d '{"model":"google/gemini-3-pro-image-preview","prompt":"...","size":"1536x1024"}'
# -> .data[0].b64_json，base64 解码写 PNG
```

注意：
- **不要传 `n` 字段**（gemini 通道会报 `numberOfImages` unknown field 400）。
- 备选模型：`openai/gpt-image-2`、`volcengine/doubao-seedream-5.0-lite`（均 OpenAI 兼容、返回 b64）。
- key 见环境变量 `OFOXAI_API_KEY`（旧 key `sk-of-NOI…` 已失效，现用 `sk-of-lQN…`）。

## 各插图位置（计划，对应 `../视觉方案.md` 页面结构）

第一步只画了 ① Hero。选定风格后扩展其余 5 个位置：

| 位置 | 文件名 | 画面 |
|---|---|---|
| ① Hero 主视觉 | `hero.png` ✅ 已生成 | 见上表 |
| ② 怎么工作·01 创建分身 | `step-01-create.png` | 人对着分身轮廓，知识流入 |
| ③ 怎么工作·02 答重复问题 | `step-02-answer.png` | 分身在多渠道气泡间自动回应 |
| ④ 怎么工作·03 转真人 | `step-03-handoff.png` | 分身把问题优雅交接给真人 |
| ⑤ 能力/集成 Bento | `bento-integrations.png` | 中央记忆库 + 线缆连各渠道 |
| ⑥ Footer 氛围图 | `footer-ambient.png` | 抽象暖光/记忆星河，衬暗底大字 |
