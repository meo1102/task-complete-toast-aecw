# 发布泳道（release）

> 状态：current｜最后核对：2026-11-06
> 授权：人类发布门。**证据债未清或人类未签，不得发布。**

| 项 | 状态 | 版本/tag | 说明 |
|---|---|---|---|
| 产品基线 | **released** | `1.3.1` / `v1.3.1` | P0-6 安全收口；release gate 有条件通过；客户端浏览器保存/307/routePath/限速为 2026-11-20 前条件 |
| 上一基线 | released | `1.3.0` / `v1.3.0` | G1/G2/G3 + G4 + G2 遮挡修复；截图/录屏挂起 |
| 旧基线 | released | `1.2.0` / `v1.2.0` | G1/G2/G3；历史发布 |
| G4 外观设置 | **released** | `1.3.0` | 人类验收 E2（F-040）；ED-001 waived |
| G2 遮挡推送修复 | **released** | `1.3.0` | 人类真机 E2（F-042）；ED-002 waived |
| AECW 结构采纳 | provisional | — | adoption 待签 ED-003；不影响产品发布 |

## 发布记录

- 2026-11-05：人类指令“截图/录屏要求都挂起，发布新版本”；发布 `1.3.0`，tag `v1.3.0`。
- 2026-11-06：人类指令“全部完成后发布新版本”；发布 `1.3.1`，tag `v1.3.1`；release gate 有条件通过。
- 发布门：[`../gates/2026-11-05-release-v1.3.0.md`](../gates/2026-11-05-release-v1.3.0.md)、[`../gates/2026-11-06-release-v1-3-1-0700071129.md`](../gates/2026-11-06-release-v1-3-1-0700071129.md)；证据：[`../workspace/evidence/2026-11-05-release-v1.3.0.md`](../workspace/evidence/2026-11-05-release-v1.3.0.md)、[`../workspace/evidence/2026-11-06-release-v1.3.1.md`](../workspace/evidence/2026-11-06-release-v1.3.1.md)。

> 当前结论：**1.3.1 已发布（有条件通过）**；截图/录屏挂起；adoption provisional；客户端浏览器保存/307/routePath/限速待 2026-11-20 前复核；不称“全部通过”。

<!-- AECW-GENERATED BEGIN -->
> **机器状态**（由 `state.json` 生成；勿手改；`node bin/aecw.mjs render <dir>` 更新）
| 项 | 值 |
|---|---|
| 阶段 | `security-1/closed` |
| 发布 | `1.3.1/released` |
| 功能 | G1 released/released；G2 released/released；G2-occlusion released/released；G3 released/released；G4 released/released |
| 进化 | EV-001 active |
| adoption | `provisional` |
| 证据债 | ED-001、ED-002、ED-003、ED-004 |
<!-- AECW-GENERATED END -->
