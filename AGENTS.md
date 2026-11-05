# AGENTS.md · task-complete-toast-aecw（仓库级）

> 状态：current｜最后核对：2026-11-05

本仓库的硬规则：**产品代码与 AECW 治理结构物理分离**。

- 产品代码只在 [`product/`](product/)：运行时文件、测试、`package.json`、`cordis.patch.yml`、`locale/`、`icon.svg`。
- AECW 结构只在 [`aecw/`](aecw/)：`STATUS.md`、`BLUEPRINT.md`、`ledger.md`、`human/`、`cluster/`、`workspace/`、`gates/`、`inbox/`、CLI/模板、探针。
- 不要把治理文档放进 `product/`，也不要把产品源码/测试放进 `aecw/`。
- 开始任何治理/开发工作前：读 [`PROJECT.json`](PROJECT.json) → [`aecw/STATUS.md`](aecw/STATUS.md) → [`aecw/state.json`](aecw/state.json) → [`aecw/criteria.md`](aecw/criteria.md) → [`aecw/AGENTS.md`](aecw/AGENTS.md)；治理规则以 `aecw/AGENTS.md` 为准。

## 命令位置

```powershell
# 探针（从仓库根）
node aecw/scripts/probe.mjs

# 单测（在 product/ 内；PACKAGE_ROOT = product）
cd product
node --test --test-isolation=none test/smoke.test.js test/integration.test.js test/store.test.js test/format.test.js test/dismiss.test.js test/notifier.test.js test/resolver.test.js test/wiring.test.js test/presentation.test.js test/interaction.test.js

# AECW 检查（治理目录是 aecw/）
cd ..
node aecw/bin/aecw.mjs check aecw
```

- 当前阶段 `grow-2` 已 closed；产品代码变更需新蓝图 + `freeze`/`start`，不得静默扩范围。
- 当前发布口径 v1.3.0（G1/G2/G3 + G4 + G2 遮挡修复）；截图/录屏要求人类挂起；E2 证据（无截图）不得写成 E1。
