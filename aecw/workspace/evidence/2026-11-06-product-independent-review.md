# Independent product review · task-complete-toast 1.3.2

> 状态：current｜日期：2026-11-06｜reviewer：`product-1.3.2-independent-review`（workflow fresh-context，只读）
> 审视对象：branch `product-1.3.2-2026-11-06`，commit `47c1cef`（后续 follow-up 见 §处置）
> 结论：**conditional**（非 clean pass；blocking=false）

## 结论

三项修复是真实且基本正确的：

- routePath 外部解析在 host Config、client guard、resolver 三层被同一规则拒绝；resolver 对不安全值回退默认同源路径，不 fetch 外部。
- settings 限速移到 Host/Origin/CSRF/Content-Type 之后；未认证失败不再消耗合法用户配额；已认证 30/10s 仍生效。
- G4 `min-width: max(280px, fontSize*18)` 与 JS `minCardWidth` 契约一致，toast 与预览共用同一 CSS。

独立 reviewer 复跑：产品 176/176、resolver+security 38/38、integration+smoke 34/34、`aecw check` 0/0、live probe 7/7（1.3.2）。

## Findings（原始，按严重度）

| # | 级别 | 发现 | 处置 |
|---|---|---|---|
| 1 | medium | reserved-endpoint 只做 exact/descendant；`routeKind: prefix` 的 `/dsh-task`、`/dsh-task-complete/h` 仍可 shadow health/settings/token | **已修**：Config 增加 `isReservedPrefix`；prefix 模式拒绝 reserved 前缀；新增 integration 负控 |
| 2 | low | probe routePath validator 与 Config/client 不完全一致（长度/点段/白名单/routeKind） | 未完全统一；probe 仍独立实现，保留 false red/一致性风险 |
| 3 | low | G4 min-width 可超过 max-width，窄视口/预览列可能溢出 | **已修**：`min-width: min(max(...), calc(100vw - 48px))`；smoke 断言更新 |
| 4 | low | 新限速测试只覆盖 bad Origin，未覆盖无 token/text-plain | **已修**：增加 31 次无 token 403 + 31 次 text/plain 415，再合法 200 |
| 5 | low | client guard/probe 负控不足；CSS 测试是文本断言 | 部分修：新增 readClientConfig 安全/不安全/保留路径测试、resolver redirect 测试；probe 仍无单测 |
| 6 | low | L2 active freeze 放宽（只 frozen 比较 tree）未在 evidence 说明 | 补记：本 review/decision 记录该语义；final verify 绑定当前树 |
| 7 | low | 版本/文档漂移（security fixture 1.3.1、README 1.3.2 tag 措辞、示例 scope、Config.pattern） | 部分修：fixture/示例/宽度说明更新；pattern 仍宽 |
| 8 | low | 归档 1.3.1 conditions 后当前 criteria 0，1.3.2 需承接仍开放条件 | 1.3.2 decision 承接浏览器/307/routePath/live/G1-P95/WP-4/remote 等条件 |
| 9 | low | resolver fetch 默认 follow redirects；307 仍可外发 sessionId | **已修**：resolver fetch `redirect:'error'` + 3xx 降级测试 |

## 复核后 follow-up

- prefix reserved guard、G4 viewport cap、rate-limit CSRF/text 变体、resolver redirect、client guard 测试已补。
- probe 仍独立实现 validator；probe reserved prefix 未必与 Config 完全一致。
- `Config.properties.bridge.routePath.pattern` 仍是 `^/`，schema UI 只做宽校验；运行时更严。
- 独立 reviewer 未复跑 follow-up 后的完整 suite；主会话已复跑产品 178/178、治理 10/10、check 0/0、probe 7/7、verify ed5b55。
- 1.3.2 release decision 必须承接 1.3.1 仍开放的 browser/307/routePath/live/G1-P95/WP-4/remote 条件。

## 结论口径

- 不称“clean pass”；release decision 可用 **有条件通过**。
- 不把本 review 当独立执行的 verify；verify 的 `--independent` 是记录位，reviewer 仍是主会话 agent。
- 产品代码从 1.3.1 到 1.3.2 有实质修改；1.3.1 的 release evidence/decision 已归档，不沿用。
