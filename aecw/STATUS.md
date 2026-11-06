# STATUS · task-complete-toast-aecw

> 状态：current｜生成视图｜最后核对：2026-11-06
<!-- AECW-STATE {"project":"task-complete-toast-aecw","stage":"security-1/closed","release":"1.3.1/conditional","decision":"DR-2026-11-06-1.3.1","risk":"high","owner":"meo1102","evolution":[]} -->
> 本页由 `node aecw/bin/aecw.mjs render aecw` 生成；勿手改。

## 当前

| 项 | 值 |
|---|---|
| 项目 | task-complete-toast-aecw |
| 人类所有者 | meo1102 |
| 阶段 | `security-1/closed` |
| 发布 | `1.3.1/conditional`（有条件接受（回填原 1.3.1 发布决定；本次 decision 绑定 L2/并发加固后的简化树）） |
| 发布决定 | `DR-2026-11-06-1.3.1` |
| 风险 | `high` |
| 活跃进化 | — |
| 证据 | `aecw/workspace/evidence` |
| 当前阻塞项 | 9 项 |

## 当前阻塞项

- ED-003 adoption｜到期 2026-11-12｜meo1102｜来源 `DR-2026-11-06-1.3.1`
- ED-004 EV-001 OOD｜到期 2026-11-19｜meo1102｜来源 `DR-2026-11-06-1.3.1`
- 307 跨源重定向｜到期 2026-11-20｜meo1102｜来源 `DR-2026-11-06-1.3.1`
- 浏览器设置页保存真机复验｜到期 2026-11-20｜meo1102｜来源 `DR-2026-11-06-1.3.1`
- 远程 push main + v1.3.1｜到期 2026-11-20｜meo1102｜来源 `DR-2026-11-06-1.3.1`
- 自定义 routePath live｜到期 2026-11-20｜meo1102｜来源 `DR-2026-11-06-1.3.1`
- G1-P95｜到期 2026-11-20｜meo1102｜来源 `DR-2026-11-06-1.3.1`
- live 限速｜到期 2026-11-20｜meo1102｜来源 `DR-2026-11-06-1.3.1`
- WP-4-RELOAD｜到期 2026-11-20｜meo1102｜来源 `DR-2026-11-06-1.3.1`

## 生成视图

- 当前阻塞项：`criteria.md`（由 decisions 的 conditions 生成，只读）。
- 历史门禁/旧视图：`workspace/archive/`（只读，不参与当前状态）。

## 命令

```powershell
node aecw/bin/aecw.mjs check aecw
node aecw/bin/aecw.mjs verify aecw --reviewer "reviewer" --risk high
node aecw/bin/aecw.mjs decide aecw --scope "release 1.3.1" --risk high --by meo1102 --decision "有条件接受" --attestation aecw/workspace/evidence/attestations/VA-....json
node aecw/bin/aecw.mjs evolve aecw list
node aecw/bin/aecw.mjs render aecw
```

