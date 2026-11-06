# STATUS · task-complete-toast-aecw

> 状态：current｜生成视图｜最后核对：2026-11-06
<!-- AECW-STATE {"project":"task-complete-toast-aecw","stage":"product-hardening/active","release":"1.3.2/unreleased","decision":null,"risk":"high","owner":"meo1102","evolution":["EV-2026-11-06-01"]} -->
> 本页由 `node aecw/bin/aecw.mjs render aecw` 生成；勿手改。

## 当前

| 项 | 值 |
|---|---|
| 项目 | task-complete-toast-aecw |
| 人类所有者 | meo1102 |
| 阶段 | `product-hardening/active` |
| 发布 | `1.3.2/unreleased` |
| 发布决定 | —（回填中） |
| 风险 | `high` |
| 活跃进化 | `EV-2026-11-06-01` |
| 证据 | `aecw/workspace/evidence` |
| 当前阻塞项 | 8 项 |

## 当前阻塞项

- ED-003 adoption｜到期 2026-11-12｜meo1102｜来源 `DR-2026-11-06-1.3.2`
- ED-004 EV-001 OOD｜到期 2026-11-19｜meo1102｜来源 `DR-2026-11-06-1.3.2`
- 浏览器设置页保存真机复验｜到期 2026-11-20｜meo1102｜来源 `DR-2026-11-06-1.3.2`
- 307 跨源重定向｜到期 2026-11-20｜meo1102｜来源 `DR-2026-11-06-1.3.2`
- 自定义 routePath live｜到期 2026-11-20｜meo1102｜来源 `DR-2026-11-06-1.3.2`
- live 限速｜到期 2026-11-20｜meo1102｜来源 `DR-2026-11-06-1.3.2`
- G1-P95｜到期 2026-11-20｜meo1102｜来源 `DR-2026-11-06-1.3.2`
- WP-4-RELOAD｜到期 2026-11-20｜meo1102｜来源 `DR-2026-11-06-1.3.2`

## 生成视图

- 当前阻塞项：`criteria.md`（由 decisions 的 conditions 生成，只读）。
- 历史门禁/旧视图：`workspace/archive/`（只读，不参与当前状态）。

## 命令

```powershell
node aecw/bin/aecw.mjs check aecw
node aecw/bin/aecw.mjs verify aecw --reviewer "reviewer" --risk high
node aecw/bin/aecw.mjs decide aecw --scope "release <version>" --risk high --by meo1102 --decision "有条件接受" --attestation aecw/workspace/evidence/attestations/VA-....json
node aecw/bin/aecw.mjs evolve aecw list
node aecw/bin/aecw.mjs render aecw
```

