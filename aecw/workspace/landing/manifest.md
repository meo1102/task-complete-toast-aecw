# 落地清单 · task-complete-toast

> 状态：current｜最后核对：2026-11-06

> 对象：v1.3.0（2026-11-05 发布）。
> 这是落地事实清单，不是发布公告；发布口径见 [`../../gates/2026-11-05-release-v1.3.0.md`](../../gates/2026-11-05-release-v1.3.0.md) 与 [`../evidence/2026-11-05-release-v1.3.0.md`](../evidence/2026-11-05-release-v1.3.0.md)。

| 项 | 值 |
|---|---|
| 版本 | `1.3.0`（tag `v1.3.0`，本独立仓库发布；旧 `v1.2.0` 为原件基线） |
| 治理工具 | AECW `0.9.4`（S1+S2 红队整改，tag `aecw-s2-2026-11-06`；不改产品行为） |
| 位置 | `D:\DSH\task-complete-toast-aecw`（独立仓库，initial `67809d0`）；**产品代码在仓库根，AECW `aecw/`**；历史归档在 `DSH_end`（`4aff41a`/tag `aecw-grow-2-2026-11-05`） |
| 安装目标 | profile bundle 指向 **`D:\DSH\task-complete-toast-aecw`** |
| 可用 | v1.3.0：G1 5/5；G2 7/8（G2-8 遗留）；G3 6/6（G3-4b 遗留）；**G4 设置页（E2）**；**G2 遮挡推送（E2）**；截图/录屏挂起 |
| 可运维 | 零第三方运行时依赖、无构建链；安装/重装：`plugin_manager remove_bundle` + `install_bundle`；客户端改动刷新页面，宿主改动重启；G4 设置页依赖 DSH `settings.plugins.tab` 与宿主 `configEditor` |
| 可交接 | `PROJECT.json` + `STATUS.md` + `state.json` + `criteria.md` + `ledger.md` + `gates/` + `workspace/evidence/` + 本清单；渲染顺序：STATUS → state/criteria → direction → BLUEPRINT → ledger → 最近门禁 |
| 可审计 | 事实/异议/变更均有 ID；基线有 commit/tag + 三个 SHA-256；证据分 E1/E2/E3；证据债 ED-001–ED-004 |
| 证据债 | ED-001/ED-002 已挂起（waived）；ED-003 adoption 签署、ED-004 EV-001 分布外/回滚仍 open |
| 成本 | 本机零依赖、零外部服务；人类注意力：2026-11-04 真机约 40 min（未计入决策问答） |
| 已接受遗留 | G2-8、G3-4b、G1 通知点击不还原（R1）——见 [`../../human/acceptance.md`](../../human/acceptance.md) |
| G4 状态 | **设置页已人类验收**（E2，无截图，F-040）；**G2 遮挡推送真机通过**（F-042）；**随 1.3.0 发布**；截图/录屏挂起（ED-001/ED-002） |
| 照护者 | **meo1102**（Git 提交人：`meo1102@163.com`） |
| 退役 | 从 profile 移除 link/junction 与 bundles 条目 → 卸载 bundle → 删除本目录；不改 DSH 源码/安装目录；`cordis.patch.yml` 无残留配置 |
| 未证明（不得外推） | 外部用户、其他 Windows/DSH 版本、多 agent 场景、100 次压测、G2-8 上限/顺序、G3-4b 时长 |
| 项目边界 | **已替换安装**（2026-11-05）：desktop profile link/junction → 本项目仓库根；原件保留在原路径可回滚；与原件同包名 |
