# AGENTS.md · task-complete-toast-aecw

> 状态：current｜最后核对：2026-11-06

## 硬规则

- **产品代码在仓库根**：`package.json`、`index.js`、`client.js`、`lib/`、`locale/`、`test/`、`cordis.patch.yml`、`icon.svg`。
- **治理只在 `aecw/`**：`state.json`、`STATUS.md`、`criteria.md`、`workspace/{evidence,decisions,conditions,evolution,memory,archive}`、`bin/aecw.mjs`。
- **一个源**：`aecw/state.json` 是唯一当前状态；`STATUS.md`/`criteria.md` 由 `aecw render` 生成，**不要手改**。
- **一个门**：当前发布/阶段决定只在 `aecw/workspace/decisions/<id>.json`；`gate` 已废弃，不再生成 gate 文件。
- **一个验证**：`aecw verify` 绑定 tests/probe/tree/日志/reviewer；`aecw decide` 只接受 `workspace/evidence/attestations/` 下的成功 verify。
- **一个进化闭环**：候选 → 评估 → 采纳/淘汰；E1 自动、E2 人类 + 独立复核；失败候选 retired，不删除负记忆。
- **按风险分级**：L0/L1 不 freeze；L2（安全边界/发布/不可逆/外部副作用/并发共享写/预算超限）才 freeze + 独立验证 + 一次人类决定。
- **人类保留位**：方向/边界/停止、阶段或发布的一次决定、S1/S2 例外、真实使用验收；不替集群写方案、不逐单审批、不维护台账、不在空模板上签字。
- **单写者**：只有编排者写 mainline 与 state；worker 隔离实现，不写 state/mainline。
- **不删除证据**：旧门禁/旧视图进 `aecw/workspace/archive/`，只读；回滚点 tag `pre-simplify-2026-11-06`。
- **未测就写未测**：E2 不写成 E1；不称“全部通过”；无截图就标证据缺口。
- **UTF-8**：写回后断言无 `U+FFFD`；不要用默认编码改中文文件。
- **不改产品行为**：产品代码变更需按风险分级；L2 必须 freeze + 独立验证 + 人类决定。

## 开工前

1. 读 [`aecw/state.json`](aecw/state.json) → [`aecw/STATUS.md`](aecw/STATUS.md) → 最近的 [`aecw/workspace/decisions/`](aecw/workspace/decisions/)。
2. 读 [`aecw/workspace/memory/direction.md`](aecw/workspace/memory/direction.md)（方向/边界/风险分级）。
3. 需要历史时读 [`aecw/workspace/archive/`](aecw/workspace/archive/)；不要把归档 gate 当当前门。
4. 门禁/交付前运行 `node aecw/bin/aecw.mjs check aecw` 与 `node aecw/scripts/probe.mjs`；FAIL 不得继续。

## 命令

```powershell
# 产品
node --test --test-isolation=none test/*.test.js
node aecw/scripts/probe.mjs

# 治理
node --test --test-isolation=none aecw/test/*.test.mjs
node aecw/bin/aecw.mjs check aecw
node aecw/bin/aecw.mjs render aecw
node aecw/bin/aecw.mjs verify aecw --reviewer "reviewer" --risk high
node aecw/bin/aecw.mjs decide aecw --attestation <verify.json> --scope "release 1.3.2" --risk high --by meo1102 --decision "有条件接受"
node aecw/bin/aecw.mjs condition aecw list
node aecw/bin/aecw.mjs evolve aecw list
```

## 完成定义

- 行为变更：有 `check` + tests/probe 证据；L2 另有独立验证与人类 decision。
- 证据：日志/attestation 写进 `aecw/workspace/evidence/`；事实/决定写进 `aecw/workspace/decisions/`。
- 状态：先 `render`，再 `check`；`STATUS.md`/`criteria.md` 必须与 state/decisions 一致。
- 发布：`verify` → 人类 `decide` → `state.release.decision` 指向 decision；不手写 gate。
- 当前发布口径：1.3.1 已发布（conditional）；**1.3.2 conditional 发布**（routePath/限速/G4 宽度修复；tag `v1.3.2`）；远程已推送；已知限制见 README。
