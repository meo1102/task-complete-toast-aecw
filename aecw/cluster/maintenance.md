# 维护泳道（maintenance）

> 状态：current｜最后核对：2026-11-05
> 授权：人类一次性指令/校准指令；**不改产品行为、不改验收、不改人类决策**。超范围即停。

| 日期 | 变更 | 范围 | 证据 |
|---|---|---|---|
| 2026-11-05 | 独立目录迁移（v1） | 从 `DSH_end/插件` 移到 `D:\DSH\task-complete-toast-aecw`；独立 Git；profile 重装 | F-046；[`../workspace/evidence/2026-11-05-standalone-migration.md`](../workspace/evidence/2026-11-05-standalone-migration.md) |
| 2026-11-05 | 布局 v2（产品/AECW 分层） | 产品 `product/`、治理 `aecw/`；profile 指向 `product/` | F-047；同一迁移记录 §1.1 |
| 2026-11-05 | v0.9 校准 | `PROJECT.json`、`state.json`、`criteria.md`；当前文档矛盾修复；历史文档状态头；`check` 升级 | F-048；[`../workspace/evidence/2026-11-05-v09-calibration.md`](../workspace/evidence/2026-11-05-v09-calibration.md) |

## 停止/回滚

- 不修改 `product/` 产品行为；若必须改产品，升级为 stage（新蓝图 + freeze/start）。
- 文档变更可回滚到基线 commit/tag；不删除证据。
- 维护工作超出一条指令范围即停，等人类裁决。
