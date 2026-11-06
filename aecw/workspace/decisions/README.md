# Decisions · 唯一的门

> 状态：current｜一个人类决定一个 JSON；agent 不得代写人类签名。

## 当前

- [`DR-2026-11-06-1.3.2.json`](DR-2026-11-06-1.3.2.json)：1.3.2 conditional 发布（routePath/限速/G4 宽度；9 条 release conditions 中远程已关闭，其余按 `workspace/conditions/` 生命周期管理）。
- 1.3.1/更早 decision 已归档到 [`../archive/decisions/`](../archive/decisions/)。

## 规则

- `facts` / `evidence` 不能为空；`conditions` 可以为空，但必须显式 `[]`。
- `human.name` 必须是 `state.owner.name`；`human.at` 是决定时间（回填时用原决定时间，并写 `backfilled_at`）。
- `attestation.tree_hash` 必须等于当前树；否则 `check` FAIL。
- 高风险必须写 `residual_risk`。
- `freeze` / `change` 记录也在本目录，但 `check` 只把 `kind: decision` 当作当前门。

## 历史

旧 `gates/*.md` 已归档到 [`../archive/gates/`](../archive/gates/)，只读；`gate` 命令只提示用 `decide`，不再生成空模板。
