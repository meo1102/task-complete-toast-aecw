# 维护泳道（maintenance）

> 状态：current｜最后核对：2026-11-06
> 授权：人类一次性指令/校准指令；**不改产品行为、不改验收、不改人类决策**。超范围即停。

| 日期 | 变更 | 范围 | 证据 |
|---|---|---|---|
| 2026-11-05 | 独立目录迁移（v1） | 从 `DSH_end/插件` 移到 `D:\DSH\task-complete-toast-aecw`；独立 Git；profile 重装 | F-046；[`../workspace/evidence/2026-11-05-standalone-migration.md`](../workspace/evidence/2026-11-05-standalone-migration.md) |
| 2026-11-05 | 布局 v2（产品/AECW 分层） | 产品 `product/`、治理 `aecw/`；profile 指向 `product/` | F-047；同一迁移记录 §1.1 |
| 2026-11-05 | v0.9 校准 | `PROJECT.json`、`state.json`、`criteria.md`；当前文档矛盾修复；历史文档状态头；`check` 升级 | F-048；[`../workspace/evidence/2026-11-05-v09-calibration.md`](../workspace/evidence/2026-11-05-v09-calibration.md) |
| 2026-11-05 | v0.9 校准验收 | 修复 13 处残留当前文档矛盾；G4-ENTRY 口径；`PROJECT.json` test 命令；`state.baseline`；验收报告 | F-050；[`../workspace/evidence/2026-11-05-v09-acceptance.md`](../workspace/evidence/2026-11-05-v09-acceptance.md) |
| 2026-11-06 | 布局 v3（取消 product 层） | 产品代码 → 仓库根；profile → 根；`PROJECT.json`/`state.layout`/`state.install`/probe/check 同步 | F-051；[`../workspace/evidence/2026-11-06-layout-v3.md`](../workspace/evidence/2026-11-06-layout-v3.md) |
| 2026-11-06 | 红队整改 **S1**（P0-1 + P0-7） | 治理工具 0.9.3：open S1/S2 = FAIL；通过类门禁拒绝自由文本；init 生成 PROJECT/state/criteria 并自检；表格转义/分表 ID/半事务 | F-052；[`../workspace/evidence/2026-11-06-s1-redteam.md`](../workspace/evidence/2026-11-06-s1-redteam.md) |
| 2026-11-06 | 红队整改 **S2**（P0-2 + P0-3） | 治理工具 0.9.4：`verify` attestation；gate 绑定 tree；freeze payload hash/start 重算；closed 终态/pause/resume/close；唯一门禁名；criteria 到期列 | F-053；[`../workspace/evidence/2026-11-06-s2-redteam.md`](../workspace/evidence/2026-11-06-s2-redteam.md) |
| 2026-11-06 | 红队整改 **S3**（P0-4） | 治理工具 0.9.5：.aecw-lock 进程锁、退出释放、journal 先恢复、32 路并发 ×10 轮 | F-054；[../workspace/evidence/2026-11-06-s3-redteam.md](../workspace/evidence/2026-11-06-s3-redteam.md) |

## 停止/回滚

- 不修改产品行为（产品代码在仓库根）；若必须改产品，升级为 stage（新蓝图 + freeze/start）。
- 文档变更可回滚到基线 commit/tag；不删除证据。
- 维护工作超出一条指令范围即停，等人类裁决。
