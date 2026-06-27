---
title: SSO 接入手册
mis_id: linwan01
owner: 林晚
team: 账号与权限中台组
updated: 2026-06-18
---

# SSO 接入手册

> 账号中台是全公司统一身份底座，灵犀 / 磐石 / 悟空所有业务组的登录鉴权都走这里。本文给业务方讲清楚怎么接 SSO：注册应用、配回调、要 scope、对接 OAuth2 授权码流程，以及常见报错怎么排查。**接入前先在飞书找我（林晚）开应用，我休假期间找章远。**

## 1. 接入总览

中台 SSO 基于标准 **OAuth2 授权码模式（authorization_code）** + OIDC，统一网关域名 `https://sso.stellaris.internal`。业务方接入分三步：

1. 在身份控制台（`https://sso.stellaris.internal/console`）注册应用，拿到 `client_id` / `client_secret`。
2. 配置回调地址（redirect_uri）白名单，申请所需 scope。
3. 业务后端对接授权码换 token 接口，前端只负责把用户重定向到授权端点。

## 2. OAuth2 授权码流程

核心三个端点：

| 端点 | 路径 | 用途 |
|------|------|------|
| 授权端点 | `GET /oauth2/authorize` | 用户登录、下发 code |
| Token 端点 | `POST /oauth2/token` | code 换 access_token / refresh_token |
| 用户信息 | `GET /oauth2/userinfo` | 凭 access_token 拿用户身份 |

授权请求示例：

```
GET /oauth2/authorize?
  response_type=code&
  client_id=lingxi-console&
  redirect_uri=https://console.lingxi.internal/cb&
  scope=openid profile org:read&
  state=<csrf-token>
```

换 token：

```
POST /oauth2/token
grant_type=authorization_code&code=<code>&
redirect_uri=<同上必须完全一致>&
client_id=...&client_secret=...
```

> ⚠️ `redirect_uri` 在 authorize 和 token 两步必须**字符串完全一致**（含尾斜杠、query），否则报 `invalid_redirect_uri`。

## 3. redirect_uri 白名单规则

- 白名单按 `client_id` 维度配置，支持多条，但**不支持通配符**（安全要求）。
- 必须 https；本地联调用 `http://localhost:<port>` 需在控制台单独勾「dev 例外」。
- 改白名单实时生效，无需重启。

> ⚠️ **历史遗留留白**：磐石的老应用 `pangu-legacy-portal` 的白名单里配了两条看起来不规范的回调（一条 http、一条带特殊 query 参数 `?sso_compat=1`），是为了兼容 2024 年那版还没下线的旧门户。**为什么必须保留、`sso_compat=1` 这个兼容分支具体绕过了哪段校验逻辑，只有我清楚，还没来得及写进文档。动这条白名单前务必先确认，不要直接删。**

## 4. scope 说明

| scope | 含义 |
|-------|------|
| `openid` | 必填，OIDC 基础 |
| `profile` | 姓名、头像、mis_id |
| `org:read` | 读组织架构、部门归属 |
| `perm:read` | 读 RBAC 权限点 |

`org:read` / `perm:read` 属敏感 scope，需账号中台审批后开通。组织架构同步口径找方棠，权限模型细节找章远。

## 5. 常见报错码与排查

| 报错码 | 含义 | 排查 |
|--------|------|------|
| `invalid_redirect_uri` | 回调地址不在白名单或两步不一致 | 比对 authorize 与 token 的 redirect_uri 是否逐字符相同；查白名单是否含该条 |
| `invalid_client` | client_id/secret 错或被禁用 | 确认 secret 没过期、应用未被下线 |
| `invalid_grant` | code 已用过或过期（默认 60s） | code 一次性，过期重新走授权 |
| `token_expired` | access_token 过期 | 用 refresh_token 续期，逻辑见《Token 续期与会话机制说明》 |
| `insufficient_scope` | 调接口缺对应 scope | 控制台补申请 scope 并重新授权 |
| `access_denied` | 用户未授权或被组织策略拦截 | 查该用户是否在应用授权范围内 |

## 6. 接入支持

接入问题先看本文，搞不定在飞书找我（林晚）。**休假期间（2026-07 起约 3 个月）接口人转章远**；组织架构 / 部门同步相关找方棠；灵犀侧接入由陈昊对接。
