# AGENTS.md · task-complete-toast-aecw（仓库级）

> 状态：current｜最后核对：2026-11-06

本仓库的硬规则：**产品代码在仓库根，AECW 治理在 `aecw/`，两者物理分离**。

- 产品代码在仓库根：`package.json`、`index.js`、`client.js`、`lib/`、`locale/`、`test/`、`cordis.patch.yml`、`icon.svg`。
- AECW 结构只在 [`aecw/`](aecw/)：`STATUS.md`、`state.json`、`criteria.md`、`BLUEPRINT.md`、`ledger.md`、`human/`、`cluster/`、`workspace/`、`gates/`、`inbox/`、CLI/模板、探针。
- 不要把治理文档放进仓库根的产品目录结构，也不要把产品源码/测试放进 `aecw/`。
- 开始任何治理/开发工作前：读 [`PROJECT.json`](PROJECT.json) → [`aecw/STATUS.md`](aecw/STATUS.md) → [`aecw/state.json`](aecw/state.json) → [`aecw/criteria.md`](aecw/criteria.md) → [`aecw/AGENTS.md`](aecw/AGENTS.md)；治理规则以 `aecw/AGENTS.md` 为准。

## 动作完成 = 状态写回

**任何改变布局、安装路径、版本、tag、发布、远程仓库、配置的动作，完成后的下一步必须先写回状态，再回复人类：**

1. 更新 [`aecw/state.json`](aecw/state.json)（`layout` / `install` / `release` / `features` / `updated`）；
2. 更新 [`aecw/STATUS.md`](aecw/STATUS.md) 的摘要与当前段；
3. 写证据文件（`aecw/workspace/evidence/`）并在 `ledger.md` 登记；
4. 跑 `node aecw/bin/aecw.mjs check aecw`，FAIL 不得结束回合。

只完成动作、不写回状态，视为**未完成**。`state.layout` / `state.install` 与 `PROJECT.json` 不一致时，`check` 会 FAIL。

## 命令位置

```powershell
# 探针（从仓库根）
node aecw/scripts/probe.mjs

# 单测（从仓库根）
node --test --test-isolation=none test/smoke.test.js test/integration.test.js test/store.test.js test/format.test.js test/dismiss.test.js test/notifier.test.js test/resolver.test.js test/wiring.test.js test/presentation.test.js test/interaction.test.js test/security.test.js

# AECW 治理回归（S1 + S2 + S3 + S5 红队；从仓库根）
node --test --test-isolation=none aecw/test/cli-s1.test.mjs aecw/test/cli-s2.test.mjs aecw/test/cli-s3.test.mjs aecw/test/cli-s5.test.mjs

# AECW 检查（治理目录是 aecw/）
node aecw/bin/aecw.mjs check aecw
```

- `aecw` 工具版本 **0.9.6**（S1：open S1/S2 = FAIL、gate 需 attestation、表格/ID/半事务；S2：`verify` attestation、freeze/start payload hash、closed 终态；S3：`.aecw-lock` 进程锁、journal 恢复、32 路并发回归；S4：probe health 身份、settings 写路由安全）。
- 当前阶段 `security-1`（P0-6 安全收口，closed）；`grow-2` 已 closed。产品行为变更需新蓝图 + `freeze`/`start`，不得静默扩范围。
- 当前发布口径 v1.3.0（G1/G2/G3 + G4 + G2 遮挡修复）；工作树为 **1.3.1 安全候选（未发布）**；截图/录屏要求人类挂起；E2 证据（无截图）不得写成 E1。
