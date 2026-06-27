---
title: Token 续期与会话机制说明
mis_id: linwan01
owner: 林晚
team: 账号与权限中台组
updated: 2026-06-20
---

# Token 续期与会话机制说明

> 本文讲清楚中台签发的 access token / refresh token 的有效期、刷新逻辑、过期与登出策略，以及滑动续期的灰度开关。业务方一般只需照「标准刷新流程」对接即可；涉及滑动续期边界的部分较绕，**有疑问休假期间找章远，但其中几处只有我（林晚）清楚，已在文中标注。**

## 1. Token 形态与有效期

中台签发两类 token，都是 JWT，签名算法 RS256，公钥走 JWKS 端点 `GET /oauth2/jwks` 暴露。

| token | 默认有效期 | 存储建议 | 用途 |
|-------|-----------|---------|------|
| access_token | **30 分钟** | 内存 / 前端不落盘 | 调业务接口鉴权 |
| refresh_token | **14 天** | 后端安全存储（HttpOnly） | 换新的 access_token |

access_token 的 `exp`、`iat`、`sub`(mis_id)、`scope`、`aud`(client_id) 都在 payload 里，业务方可本地校验签名免去每次回中台。

## 2. 标准刷新流程

access_token 过期（或将过期）时，用 refresh_token 换新：

```
POST /oauth2/token
grant_type=refresh_token&
refresh_token=<rt>&
client_id=...&client_secret=...
```

返回新的 `access_token`，以及（视灰度策略）新的 `refresh_token`。建议业务方在 access_token 剩余有效期 **< 5 分钟** 时提前刷新，不要等到 401 再刷，避免请求抖动。

报错：

- `invalid_grant`：refresh_token 过期 / 已被吊销 / 已被轮换作废 → 需重新走完整登录。
- `token_expired`：传的是过期 access_token，不是刷新报错，检查调用姿势。

## 3. 过期与登出策略

- **绝对过期**：refresh_token 签发起 14 天硬过期，到点必须重新登录，不受滑动续期影响。
- **主动登出**：调 `POST /oauth2/revoke` 吊销当前 refresh_token，加入吊销名单（Redis，TTL 与 token 一致）。
- **全端登出**：按 `sub` 吊销该用户全部 refresh_token，用于改密 / 安全事件。

## 4. 滑动续期（sliding refresh）与灰度

为减少活跃用户被迫重登，中台对 refresh_token 做**滑动续期**：每次成功刷新时，如果距上次签发已过半个生命周期，则轮换出一个新的 refresh_token 并把旧的作废（rotation），新 token 重置 14 天窗口。是否启用由灰度开关控制：

```
配置项：sso.refresh.sliding.enabled        # 总开关
        sso.refresh.sliding.gray_clients   # 灰度 client_id 名单
        sso.refresh.rotation.enabled       # 是否轮换 rt
```

目前灰度名单只放了 `lingxi-console` 和 `wukong-app`，磐石侧还没放量。

> ⚠️ **边界留白（只有我清楚）**：滑动续期有两个坑还没沉淀成文档——
> 1. **并发刷新**：同一个 refresh_token 在轮换窗口内被前端并发打两次，理论上第二次应命中「旧 token 已作废」报 `invalid_grant`，但我加了一个很短的**宽限期（grace window）**让并发的第二次也能拿到同一批新 token，这个宽限期的时长、判定 key 是怎么设计的，代码里有但没写文档。
> 2. **灰度回滚**：如果 `sliding.enabled` 从 true 关回 false，那些已经处于「轮换后中间态」的 refresh_token 会怎样、会不会导致一批用户集体被登出，我心里有数但**没验证过、也没写回滚预案**。休假前没来得及补，谁要动这个开关一定先找我或等我回来。

## 5. 联系人

标准刷新流程对接问题找章远。涉及第 4 节滑动续期边界的，章远不一定清楚，紧急情况按《休假交接清单》里的方式联系我。
