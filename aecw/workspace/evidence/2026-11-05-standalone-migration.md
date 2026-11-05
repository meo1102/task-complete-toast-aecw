# 独立目录迁移 · 2026-11-05

> 状态：current｜最后核对：2026-11-05

> 目的：把 `task-complete-toast-aecw` 从 `DSH_end/插件/` 中移出，成为独立项目目录/仓库，避免与指南仓、原插件、原型机材料混在一起管理。
> **布局 v2（同日，人类指令“AECW 文件与产品代码不要混杂”）**：产品代码统一到 `product/`，AECW 治理到 `aecw/`；profile 改指 `...\product`。见 §1.1。
> 证据等级：**E1**（命令/输出可复现）。

## 1. 路径

| 项 | 旧 | 新 |
|---|---|---|
| 项目目录 | `D:\DSH\DSH_end\插件\task-complete-toast-aecw` | **`D:\DSH\task-complete-toast-aecw`** |
| Git | `DSH_end` 仓库内（commit `4aff41a`/`f336f1e`/`d48df65`） | **独立仓库**（initial `67809d0`，tag `aecw-standalone-2026-11-05`） |
| profile link | `link:D:/DSH/DSH_end/插件/task-complete-toast-aecw` | `link:D:/DSH/task-complete-toast-aecw` |
| junction | 指向旧目录 | 指向新目录 |

原 `DSH_end` 仓库中的历史仍保留（tag `aecw-grow-2-2026-11-05` → `4aff41a`），删除提交 `5d3865c` 只移出目录，不改写历史。

## 1.1 布局 v2（同日）

| 项 | 布局 v1（历史） | 布局 v2（当前） |
|---|---|---|
| 产品代码 | 仓库根混放 | **`D:\DSH\task-complete-toast-aecw\product`** |
| AECW 结构 | 仓库根混放 | **`D:\DSH\task-complete-toast-aecw\aecw`** |
| profile link | `...\task-complete-toast-aecw` | **`...\task-complete-toast-aecw\product`** |
| 测试入口 | 根目录 | `cd product` 后运行 |
| AECW CLI | `node bin/aecw.mjs` | `node aecw/bin/aecw.mjs check aecw` |

迁移后探针（布局 v2）：**7/7 PASS**（`profile link`/`junction target` 均指向 `...\product`）。

## 2. 迁移步骤（布局 v1 历史）

```powershell
# 1) 目录移动（旧路径已不存在）
Move-Item 'D:\DSH\DSH_end\插件\task-complete-toast-aecw' 'D:\DSH\task-complete-toast-aecw'

# 2) 重装 profile（同一包名，指向新目录）
plugin_manager remove_bundle @local/task-complete-toast
plugin_manager install_bundle D:\DSH\task-complete-toast-aecw

# 3) 独立仓库
cd D:\DSH\task-complete-toast-aecw
git init
git add -A
git commit -m "import(task-complete-toast-aecw): standalone repo from DSH_end AECW grow-2 baseline"
git tag -a aecw-standalone-2026-11-05 -m "standalone import"
```

结果：

- profile：`"@local/task-complete-toast": "link:D:/DSH/task-complete-toast-aecw"`；
- junction 目标：`D:\DSH\task-complete-toast-aecw`；
- plugin：`include:task-complete-toast` active，版本 `1.2.0`；
- 旧目录不存在；`DSH_end` 仓库只保留删除提交，历史 tag 可追溯。

## 3. 迁移后运行态探针（EV-001 正控）

```text
PASS  宿主 package.json — @local/task-complete-toast@1.2.0
PASS  profile dependency link — link:D:/DSH/task-complete-toast-aecw
PASS  profile bundles — @local/task-complete-toast
PASS  junction target — D:\DSH\task-complete-toast-aecw
PASS  profile patch config — task-complete-toast + appearance
PASS  HTTP outcome route (expect 400) — 400
PASS  HTTP settings route (expect 400/422, no write) — 400

AECW EV-001 probe: 7/7 passed · http://127.0.0.1:36574
exit=0
```

## 4. 代码/证据是否变化

- 产品代码、测试、配置：**未改**；哈希与 [`baseline-2026-11-05-grow-2.md`](baseline-2026-11-05-grow-2.md) 一致。
- `bin/aecw.mjs` + `core/`：是从 `agent-engineering-control/prototype` 复制的 **AECW CLI/模板副本**，随项目自包含；不是原型机实例/示例数据。
- 旧目录中的历史证据（`2026-11-05-G4-live-host.md`、`ev-001-probe-2026-11-05.md`）保留旧路径，作为“迁移前”证据；迁移后正控见本文件。

## 5. 回滚

1. `Move-Item D:\DSH\task-complete-toast-aecw D:\DSH\DSH_end\插件\task-complete-toast-aecw`
2. `plugin_manager remove_bundle` + `install_bundle` 指向旧路径；
3. 独立仓库可删除（历史仍在 `DSH_end` tag/commit 中）。

回滚触发：新目录无法加载、profile 权限异常、独立仓库损坏。**未做真实回滚演练**，列为后续评估项。
