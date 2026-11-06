# 施工蓝图 · task-complete-toast

> 状态：current｜最后核对：2026-11-06

- 版本：v3
- 阶段：security-1
- 日期：2026-11-06
- 状态：approved
- 批准人：meo1102

> 这是“怎么做”的共享基线，不是方向。方向见 [`human/direction.md`](human/direction.md)。
> 上一阶段 `grow-2` 已 closed；本阶段只做红队 P0-6 安全收口，不扩大产品功能。

## 1. 本阶段目标

- 对应宪章目的：让“任务完成/等待授权提示”在真实宿主里可用、可运维，同时不成为跨源写入口。
- 本阶段可观察结果：插件提供只读 health 身份端点；settings 写路由拒绝无凭证/恶意 Origin/text-plain/空 patch；probe 不再用“任意 400”证明健康；EV-001 复核后恢复 active。
- 本阶段非目标：任意 CSS、字体选择、新依赖、改 DSH 宿主、发布新版本、截图补证。

## 2. 工作包

| ID | 工作包 | 负责人 | 输入 | 输出 | 验收判据 | 依赖 |
|---|---|---|---|---|---|---|
| SEC-1 | 只读 health 端点 | 实现者 | `lib/host.js`、`index.js` | `GET /dsh-task-complete/health` 返回 plugin/version/instance/capabilities/routePath | 200 JSON；非 loopback Host 403；无写副作用 | - |
| SEC-2 | settings 写路由防护 | 实现者 | 现有 `createSettingsHandler` | Host/Origin/CSRF/Content-Type/非空 patch/速率限制 | 恶意 Origin、无 token、text/plain、`{}`、非 loopback Host 均 4xx；合法请求 200 | SEC-1 |
| SEC-3 | 客户端取 CSRF token | 实现者 | `client.js` 设置页保存 | 保存前 GET token，POST 带 `x-aecw-csrf` | 设置页保存仍可用；token 失败显示保存失败 | SEC-2 |
| SEC-4 | probe 改版 | 实现者 | `aecw/scripts/probe.mjs` | canonical URL、health 身份、outcome 错误体；删除 settings 写 POST | 假 400/错误版本/跨源/query/fragment/重定向不 PASS；正控 7/7 | SEC-1 |
| SEC-5 | 安全回归与文档 | 实现者 + 策展 | 上述 | 单测/集成 + 路由矩阵记录 | 测试全绿；证据记录恶意/合法请求矩阵 | SEC-1–4 |
| SEC-6 | EV-001 复核 | 实现者 + 人类 | probe 新版 | 先降级 trial，修复后正/负控再激活 | state/evolution 与 probe 结果一致 | SEC-4 |

## 3. 接口与契约

| 接口 | 谁提供 | 谁消费 | 契约（输入/输出/错误） | 兼容策略 |
|---|---|---|---|---|
| `GET /dsh-task-complete/health` | 宿主 | probe | 200 `{plugin,version,instance,routePath,capabilities}`；非 GET 405；非 loopback 403 | 新增，不影响旧路由 |
| `GET /dsh-task-complete/settings-token` | 宿主 | 客户端 | 200 `{token,instance}`；Host/Origin 不合法 403 | 新增 |
| `POST /dsh-task-complete/settings` | 宿主 | 设置页 | JSON + `x-aecw-csrf` + same-origin；空 patch 400；text/plain 415；限速 429 | 旧客户端无 token 会被拒绝；同版本客户端同步更新 |

## 4. 未知与假设

| # | 未知/假设 | 影响 | 怎么验证 | 什么时候必须有答案 |
|---|---|---|---|---|
| 1 | DSH 设置页 fetch 是否带 Origin | 若不带，严格 Origin 会误拒 | 集成测试 + 真机保存 | SEC-3 完成前 |
| 2 | 重装后宿主是否加载新路由 | probe 可能 404 | `plugin_manager` 重装 + probe | SEC-4 完成前 |
| 3 | 限速阈值是否误伤正常保存 | 连续保存可能 429 | 设 30/10s，测试 31 次 | SEC-2 完成前 |

## 5. 本阶段不做

- 不发布 1.3.1 版本/tag（本阶段只做候选代码与门禁；发布由后续决定）。
- 不改 G1/G2/G3/G4 的视觉/通知逻辑。
- 不新增第三方依赖、不构建。
- 不把 EV-001 的 health 检查说成“独立安全审计”。

## 6. 阶段验收

- 聚合判据：SEC-1–5 全部有 E1 证据；EV-001 正控 7/7、至少 3 个负控 fail。
- 证据要求：单测/集成输出、恶意/合法请求矩阵、probe 输出、`check` 0/0；截图不要求。
- 允许的遗留：旧客户端无 token 的兼容问题（同版本同步更新）、限速阈值为经验值、真实浏览器端到端未做（需人类目视）。

## 7. 变更记录

| 版本 | 日期 | 变更 | 理由 | 批准人 |
|---|---|---|---|---|
| v2 | 2026-11-05 | grow-2 外观设置 | 人类批准 G4 | meo1102 |
| v3 | 2026-11-06 | security-1：P0-6 安全收口 | 人类“开始 s3 和 s4”；红队报告 P0-6 | meo1102 |
