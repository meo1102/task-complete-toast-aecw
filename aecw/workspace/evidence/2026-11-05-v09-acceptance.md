# v0.9 校准验收 · 2026-11-05

> 状态：current｜最后核对：2026-11-05
> 范围：maintenance 泳道；只改治理/文档/清单，**未改产品行为、人类验收、发布决定**。
> 结论：**有条件通过**——v0.9 结构可用；验收中发现并修复了 13 处残留当前文档矛盾；仍有 3 个已知检查/证据缺口（见 §4）。

## 1. 验收对象

| 项 | 结果 |
|---|---|
| `PROJECT.json` | 两个根、安装目标、test/probe/check 命令、工具版本 + hash |
| `state.json` | stage/release/features/evolution/adoption/evidence_debt/baseline |
| `criteria.md` | 25 行判据：G1–G4、WP、G2-8/G3-4b、adoption、EV-001、证据债 |
| `STATUS.md` | 顶部 `AECW-STATE` 摘要；当前门禁/发布状态与 state 对账 |
| 文档状态头 | 63 份文档纳入状态/围栏/链接检查 |
| 四条泳道 | stage / maintenance / evolution / release |
| `check` v0.9 | 路径/命令/state/STATUS/criteria/围栏/链接/历史状态头/关键词矛盾 |

## 2. 验收命令与结果

```text
node aecw/bin/aecw.mjs check aecw
  OK   PROJECT.json
  OK   PROJECT.json roots 存在
  OK   PROJECT.json install.target 存在
  OK   工具版本一致：0.9.0
  OK   工具哈希一致
  OK   state.stage 与 STATUS 一致
  OK   release.version 与产品版本一致
  OK   state.evolution 与进化台账一致
  OK   criteria.md（25 行）
  OK   文档状态/围栏/链接检查（63 份）
  OK   当前文档关键词一致性
结果：FAIL 0｜WARN 0
```

```text
node aecw/scripts/probe.mjs
AECW EV-001 probe: 7/7 passed
```

```text
cd product
node --test --test-isolation=none test/*.test.js
tests 169 / pass 169 / fail 0

node --check（product 下 17 个 .js）
17/17
```

```text
产品版本：1.3.0
tag v1.3.0 -> commit ba72f8f
PROJECT.json tool.hash == aecw/bin/aecw.mjs SHA-256
```

## 3. 验收中发现并修复的残留

> 这些残留都在 `check` 绿灯时存在，说明“结构绿灯”仍需人工真话核对；以下为 maintenance 修复，不改产品。

| # | 位置 | 残留 | 修复 |
|---|---|---|---|
| 1 | `STATUS.md` | “当前门禁 grow-2”“等人类决定发布”与已发布 1.3.0 冲突 | 改为 current gate = release-v1.3.0，阶段门禁标历史；目标改为等下一阶段 |
| 2 | `STATUS.md` §5 | `cluster/release.md` 仍写“G4/G2 未发布” | 改为“1.3.0 已发布” |
| 3 | `cluster/board.md` | release 泳道“G4/G2 未发布” | 改为“v1.3.0 已发布” |
| 4 | `human/decisions.md` | 阶段外事项仍写“截图发布前”“G4 accepted/unreleased；未发布” | 标为已处理：截图挂起、1.3.0 发布 |
| 5 | `workspace/memory/README.md` | design contract “G4 未发布、未真机”；appearance “真机未验” | 改为随 1.3.0 发布；人类验收 E2；截图挂起 |
| 6 | `workspace/memory/design-contract-v1.2.0.md` | §16 “未发布” | 改为“随 1.3.0 发布” |
| 7 | `workspace/memory/appearance-settings-design.md` | 头部“真机未验、未发布”；“未验前不得声明可用” | 改为已发布；保留方案阶段未验记录并注明后续覆盖 |
| 8 | `workspace/landing/manifest.md` / `README.md` | 对象仍 v1.2.0；G4 “未发布”；发布口径指向旧验收报告 | 改为 v1.3.0；指向 release gate/evidence；迁移记录标历史 |
| 9 | `workspace/evidence/baseline-*.md` / `standalone-migration.md` / `v09-calibration.md` | 历史文档标 current，且仍写 1.2.0/未发布/未安装 | 标 historical；校准结论注明“随后 1.3.0 发布” |
| 10 | `aecw/AGENTS.md` / `cluster/learning.md` | 产品基线仍 v1.2.0；“真机是下一步硬门禁” | 改为 v1.3.0（v1.2.0 历史）；学习项标已由 F-038/F-040 覆盖 |
| 11 | `criteria.md` | `G4-ENTRY` 写“无 agent 指路下找到”，但 F-040 不支持该表述 | 改为“入口可达并经人类确认”；注明独立发现未验、不追溯改写发布结论 |
| 12 | `PROJECT.json` | `commands.test` 为 `node --test ... test`，实际报 `ERR_UNSUPPORTED_DIR_IMPORT` | 改为 `test/*.test.js`，实测 169/169 |
| 13 | `state.json` | `baseline.commit=4589b91`（布局 v2）却标 `product_version=1.3.0` | 当前 baseline 改为 `ba72f8f` / `v1.3.0`；布局基线另立 `layout_baseline` |

## 4. 仍未闭合 / 已知检查缺口

1. **`check` 的关键词矛盾检查仍是硬编码**（只覆盖 `客户端 UI 未确认`、`EV-001 trial`、`本副本未安装`、`G2 待真机`、`board`、`memory trial`、`EV 未激活`）。本次“未发布”残留是人工读出来的，不是 `check` 抓的。下一版应改为“当前文档中状态词/版本词与 state 的通用对账”，或至少扫描 `未发布|未真机|trial|未激活`。
2. **`check` 只验证命令指向的路径存在，不执行命令**。因此 `commands.test` 写错（目录导入）仍能绿灯；本次验收实际执行才发现并修复。manifest 的 `commands` 需要“可执行 smoke”或至少 `--check-commands`。
3. **`G4-ENTRY` 的“独立发现”未验**：人类在被告知入口后确认设置页可用；不等于“无 agent 指路也能找到”。已在矩阵注明，不列为 met 的强主张，也不追溯改写 1.3.0 发布结论。
4. **证据债仍开放**：ED-003 adoption 人类签署、ED-004 EV-001 分布外/回滚演练；ED-001/002 截图/录屏已由人类挂起（waived），不等于完成。
5. **adoption 仍 provisional**：结构已在使用，但门禁人类签署未完成；不得称“AECW 已采纳”。

## 5. 验收结论

- **v0.9 校准结构：通过。** `PROJECT.json` / `state.json` / `criteria.md` / 四条泳道 / 文档状态 / check 对账均可工作；工具哈希、发布版本、tag、安装探针一致。
- **真话状态：有条件通过。** 本次修复了 13 处残留矛盾；但 `check` 仍不是“自然语言全量一致性”的证明，当前文档结论仍需人工抽样。
- **产品/发布：不因本次验收改变。** 1.3.0 已按人类发布决定发布；截图/录屏挂起；adoption provisional；G2-8/G3-4b/V 项仍未闭合。
- **下一步**：先修 `check` 的两个缺口（通用状态词对账、命令可执行 smoke），再开下一阶段；adoption 签署前不称“已采纳”。

> 本验收是 agent 侧维护验收；人类发布/采纳决定保持不变，adoption 仍需 `meo1102` 签署。
