# workspace/work

> 状态：historical｜最后核对：2026-11-06

任务产物、草稿、候选。候选不得当作已验收事实；当前状态见 [`../../STATUS.md`](../../STATUS.md)。

## 本项目的特殊约定

- 这是 DSH 插件：`package.json`、`index.js`、`client.js`、`lib/`、`locale/`、`cordis.patch.yml` 必须留在**仓库根**（安装入口要求），所以“已发布产品代码”不在本目录。
- 本目录用于：候选补丁、一次性脚本、实验记录、尚未过门禁的草稿。
- 任何候选进入产品代码，必须走：任务板 → 实现/测试 → 证据进 `../evidence/` → 门禁 → 人类接受。
- 当前阶段：`security-1` 已 closed（P0-6 安全收口）；`grow-2` 已 closed。候选仍必须先记 `cluster/board.md`，不得直接合并进产品代码。
