# task-complete-toast-aecw

DSH 持久化插件（完成提示 / 授权提醒 / 外观设置）的独立项目。仓库按“产品代码”和“AECW 治理结构”分层，**两者不再混放**。

## 目录

```text
.
├─ product/     # 产品代码（可安装包；package.json 在此）
│  ├─ index.js / client.js / lib/ / locale/ / test/
│  ├─ package.json / cordis.patch.yml / icon.svg
│  └─ README.md              # 功能、安装、已知限制
└─ aecw/        # AECW 治理结构与工具（不参与插件运行）
   ├─ STATUS.md / BLUEPRINT.md / ledger.md
   ├─ human/ / cluster/ / workspace/ / gates/ / inbox/
   ├─ bin/aecw.mjs + core/    # AECW CLI/模板
   ├─ scripts/probe.mjs       # EV-001 运行态探针
   └─ AGENTS.md               # 治理/开发规则
```

## 入口

- 当前状态：[`aecw/STATUS.md`](aecw/STATUS.md)
- 开发/治理规则：[`aecw/AGENTS.md`](aecw/AGENTS.md)
- 产品说明：[`product/README.md`](product/README.md)
- 独立目录迁移：[`aecw/workspace/evidence/2026-11-05-standalone-migration.md`](aecw/workspace/evidence/2026-11-05-standalone-migration.md)
- 开发过程全记录：[`aecw/workspace/evidence/2026-11-05-development-retrospective.md`](aecw/workspace/evidence/2026-11-05-development-retrospective.md)

## 常用命令

```powershell
# 运行态探针（门禁/交付前）
node aecw/scripts/probe.mjs

# 单测（在 product/ 内）
cd product
node --test --test-isolation=none test/smoke.test.js test/integration.test.js test/store.test.js test/format.test.js test/dismiss.test.js test/notifier.test.js test/resolver.test.js test/wiring.test.js test/presentation.test.js test/interaction.test.js

# AECW 结构检查（治理目录是 aecw/）
cd ..
node aecw/bin/aecw.mjs check aecw
```

## 安装

profile 的 bundle 指向 **`D:\DSH\task-complete-toast-aecw\product`**（不是仓库根）；`package.json`、`cordis.patch.yml`、`locale/` 等都在 `product/`。迁移/回滚见 [`aecw/workspace/evidence/2026-11-05-standalone-migration.md`](aecw/workspace/evidence/2026-11-05-standalone-migration.md)。

> 当前版本 `1.2.0`；G4 设置页已人类验收（E2，无截图），G4 未发布；已知遗留以 `aecw/STATUS.md` 为准。
