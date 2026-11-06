# AECW 精简化 · 基线（W0）

> 状态：historical｜日期：2026-11-06｜记录人：本会话 agent
> 回滚点：tag `pre-simplify-2026-11-06`（commit `06ca61c`）

## 1. 改造前现状

| 指标 | 基线 | 口径 |
|---|---|---|
| 当前手写状态/视图 | **6** | `STATUS.md`、`criteria.md`、`cluster/board.md`、`cluster/release.md`、`workspace/landing/manifest.md`、`BLUEPRINT.md` |
| 1.3.1 发布门 | **2** | 首次 release gate `0700071129` + final `0711355f20`（最终门正文为空） |
| 活 criteria 行 | **32** | 旧 `criteria.md` |
| 常设 gate 模板 | 六段 | 通过/有条件通过可留空正文 |
| 证据债 ID | 4 | ED-001–004；SEC-E2E/G1-P95/WP-4-RELOAD 未入 state |
| 人类预批 | 每阶段/门 | S1–S5 逐段批准 + 发布门签字 |
| 已知假 PASS | **1** | `check 0/0` 接受空 final gate + 删除的阶段 attestation |
| 人类分钟/变更 | **未 instrument** | 本轮没有可比的计时数据；不虚构下降比例 |
| 产品测试 | 174/174 | 改造前 |
| 治理测试 | 25/25 | 旧 S1/S2/S3/S5 |

## 2. 旧当前值的问题（本次审计）

- final release gate 正文为空，但 `check` 0/0；
- 阶段 gate 的唯一 verify `VA-20261106060831-fa31ea` 被删除；
- `README` 仍写 1.3.1 未发布、1.3.0、169/169；
- `STATUS`/board/manifest/ledger 仍指向旧门/旧版本；
- `criteria` 32 行含过期数字，due 不生效。

## 3. 回滚点

- 分支：`simplify-aecw-2026-11-06`
- tag：`pre-simplify-2026-11-06` @ `06ca61c`
- 旧工具：`workspace/archive/bin/aecw-0.9.6.mjs`
- 旧 gates/当前视图/测试：`workspace/archive/`

## 4. 不做

- 不改产品代码/产品版本/1.3.1 发布结论；
- 不删除旧证据；归档只读；
- 不伪造人类分钟或 L1 自主率。
