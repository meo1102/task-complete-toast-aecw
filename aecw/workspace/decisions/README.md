# Decisions · 唯一的门

> 状态：current｜一个人类决定一个 JSON；agent 不得代写人类签名。

## 当前

- [`DR-2026-11-06-1.3.1.json`](DR-2026-11-06-1.3.1.json)：1.3.1 本地发布（有条件接受，回填；新树 verify `VA-20261106084857-cc2880`；原始 `0700071129` + `fd647e` 作为证据）。

## 规则

- `facts` / `evidence` 不能为空；`conditions` 可以为空，但必须显式 `[]`。
- `human.name` 必须是 `state.owner.name`；`human.at` 是决定时间（回填时用原决定时间，并写 `backfilled_at`）。
- `attestation.tree_hash` 必须等于当前树；否则 `check` FAIL。
- 高风险必须写 `residual_risk`。
- `freeze` / `change` 记录也在本目录，但 `check` 只把 `kind: decision` 当作当前门。

## 历史

旧 `gates/*.md` 已归档到 [`../archive/gates/`](../archive/gates/)，只读；`gate` 命令只提示用 `decide`，不再生成空模板。
