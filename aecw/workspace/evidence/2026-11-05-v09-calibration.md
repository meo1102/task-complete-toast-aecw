# v0.9 校准证据 · 2026-11-05

> 状态：current｜最后核对：2026-11-05
> 依据：[`REVIEW-task-complete-toast-aecw-2026-11-05.md`](../../../../agent-engineering-control/REVIEW-task-complete-toast-aecw-2026-11-05.md)、[`PLAN-v0.9-真实项目校准.md`](../../../../agent-engineering-control/PLAN-v0.9-真实项目校准.md)。
> 范围：maintenance 泳道；**未改产品行为/人类验收/发布决定**。

## 1. 落地内容

| 项 | 结果 |
|---|---|
| `PROJECT.json` | 两个根、安装目标 `product`、test/probe/check 命令、工具 `aecw@0.9.0` + hash |
| `state.json` | stage/release/features/evolution/adoption/evidence_debt/baseline |
| `criteria.md` | 25 行判据：G1–G4、WP、G2-8/G3-4b、adoption、EV-001、证据债 |
| `STATUS.md` | 顶部 `AECW-STATE` 摘要，与 state 对账；修复“UI 未确认”“EV-001 trial”等旧话 |
| 文档状态头 | 61 份 `.md` 加 `状态：current/historical/superseded`；历史证据/门禁标 historical |
| 四条泳道 | [`cluster/maintenance.md`](../../cluster/maintenance.md)、[`evolution.md`](../../cluster/evolution.md)、[`release.md`](../../cluster/release.md)、stage 门禁 |
| `check` v0.9 | PROJECT/state/criteria/文档头/围栏/链接/版本/进化台账/当前文档矛盾 |
| 产品 README | 修“G4 未真机/未安装/G2 待真机/旧目录树”等矛盾 |

## 2. 校验

```text
node aecw/bin/aecw.mjs check aecw
  ...
  OK   PROJECT.json
  OK   state.stage 与 STATUS 一致
  OK   release.version 与产品版本一致
  OK   state.evolution 与进化台账一致
  OK   criteria.md（25 行）
  OK   文档状态/围栏/链接检查（61 份）
结果：FAIL 0｜WARN 0
```

```text
node aecw/scripts/probe.mjs
AECW EV-001 probe: 7/7 passed
```

```text
cd product && node --test --test-isolation=none test/*.test.js
tests 169 / pass 169 / fail 0
```

## 3. 真话测试（负控）

按 PLAN v0.9 §7，在副本上实际执行并恢复：

| # | 注入 | `check` 结果（关键行） |
|---|---|---|
| 1 | `STATUS.md` 追加“客户端 UI 未确认” | `FAIL 当前文档矛盾：STATUS 仍写“客户端 UI 未确认”`（另有临时备份目录的坏链噪声；备份已删除） |
| 2 | `state.json` 的 `EV-001` 改为 `trial` | `FAIL STATUS 摘要 evolution 与 state 不一致`；`FAIL state.evolution 与 cluster/evolution.md 不一致` |
| 3 | `criteria.md` 增加 `met` 但证据为“无” | `FAIL criteria TEST-1 为 met 但没有证据` |

三次注入后均恢复；恢复后 `check` 回到 `FAIL 0｜WARN 0`。

> 注：负控时把备份放在 `aecw/workspace/work/_truthtest/`，被文档链接检查扫到产生额外坏链；这是测试夹具噪声，不是项目坏链。正式结果以恢复后的检查为准。

## 4. 剩余证据债

| ID | 项 | 影响 |
|---|---|---|
| ED-001 | G4 设置页/预览截图 | release |
| ED-002 | G2 遮挡推送截图/录屏 | release |
| ED-003 | adoption 门禁签署 | adoption |
| ED-004 | EV-001 分布外验证/回滚演练 | evolution |

## 5. 结论

- **结构绿灯不再等于事实绿灯**：`check` 现在对账 state/STATUS/criteria/路径/文档。
- **未发布**：G4/G2 修复仍 accepted/unreleased；版本 `1.2.0`。
- **adoption**：provisional；人类签署前不称“已采纳”。
- **产品代码未改**；只改治理/文档/检查器。
