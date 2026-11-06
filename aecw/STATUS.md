# STATUS · task-complete-toast（独立项目）

> 状态：current｜最后核对：2026-11-06
<!-- AECW-STATE {"stage":"grow-2/closed","release":"1.3.0/released","g4":"released/released","evolution":"EV-001/active","adoption":"provisional","evidence_debt":["ED-001","ED-002","ED-003","ED-004"]} -->
> **状态摘要（`state.json` 对账）**：stage `grow-2/closed`；release `1.3.0/released`；G4 `released/released`；EV-001 `active`；adoption `provisional`；证据债 `ED-001/002`（挂起）、`ED-003/004`（open）。验收矩阵见 [`criteria.md`](criteria.md)。

> **唯一当前状态页。** 最后更新：2026-11-06｜版本：1.3.0｜人类所有者：meo1102
> 所有者口径：按 **Git 提交人**记录（`meo1102@163.com`，2026-11-05 人类指令）。
> 规则：本页是当前状态；其他文档是证据/历史。冲突以本页为准；每次门禁/冻结/发布先更新本页。
> 证据等级：**E1** 运行事实（可复现）｜**E2** 人类目视（无截图）｜**E3** 文档主张（未复核）。
> **项目说明**：项目位于 **`D:\DSH\task-complete-toast-aecw`**（独立仓库；历史归档在 `DSH_end`）。**布局 v3：产品代码在仓库根（`../`）；AECW 治理在 `aecw/`**，两者不混放。本项目基于 `task-complete-toast` v1.2.0 复制；**当前发布 1.3.0**（G1/G2/G3 + G4 + G2 遮挡修复）。**已替换安装**：desktop profile 的 link/junction 指向 **`D:\DSH\task-complete-toast-aecw`**；原件保留在原路径，可回滚。结构迁移见 [`workspace/landing/migration-aecw-2026-11-05.md`](workspace/landing/migration-aecw-2026-11-05.md)；布局 v3 见 [`workspace/evidence/2026-11-06-layout-v3.md`](workspace/evidence/2026-11-06-layout-v3.md)。

---

## 1. 当前阶段

- 阶段：grow-2（closed）
- 阶段状态：closed
- 版本：1.3.0（已发布；G4/G2 修复包含在内）
- 当前目标：`grow-2` 已关闭；**布局 v3：产品在仓库根、AECW `aecw/`**；EV-001 运行态探针已激活（门禁/交付前必跑）；**1.3.0 已发布**；**红队整改 S1/S2/S3 已完成并冻结基线**，S4 进行中；
- 当前门禁：2026-11-05-release-v1.3.0（发布通过）；阶段门禁 `grow-2` 为历史

## 2. 当前证据

### 2.1 E1（运行事实，可复现）

> 2026-11-06 在布局 v3（产品在仓库根）复跑（作者自验；只表示可复现，不表示独立复核）：

- 自动化：10 个测试文件 → **tests 169 / pass 169 / fail 0**；`node --check` **17/17**；含介绍文案回归断言、G4 边界/联动/对比度/设置页/`configEditor` 合并测试、G2 遮挡推送（W16/W17）。
- G4 改动后源码哈希（2026-11-05）：
  - `client.js` `351080FC7314C3214506E8042C1FAB67B964CDED7D2D4334E69A01E2E0CF515D`
  - `lib/config.js` `7D11DC96006D81A726B8200F7AF7A0F8E345B49DD4230B0C3FD272B48D2E0A1F`
  - `lib/host.js` `0FC37D2D10AA8559FC8C818A38795245713B726D15209CA34760F34BC5F2F5B9`
  - `index.js` `7D90BC6CC88D12F106F268895F843B9414ABAF03BD2D367D23BBC7D291B09278`
  - `package.json` `C33D737C3A43B287B935229EC5FE8F71FB0D48FF5FEC43B108DDC2C32A6B1BB6`（1.3.0）
- 介绍文案：`locale/zh.json`、`locale/en.json` 已与 v1.2.0 能力对齐（F-031/F-032）。
- 设置探针：客户端有 `settings.plugins.tab` 槽；宿主有 `configEditor`（A 方案）；Theme tokens 只有颜色、无字体 token（F-033/F-036）。
- 编码：全项目 `.md/.js/.json/.yml/.svg` 无 `U+FFFD`。
- 结构：`node aecw/bin/aecw.mjs check aecw` → **FAIL 0｜WARN 0**（v0.9 对账见下）。
- **红队整改 S1（2026-11-06，工具 0.9.3）**：治理回归 **10/10**；开放 S1/S2 改为 FAIL（大小写统一）；通过类门禁拒绝自由文本，需 verify attestation + 人类签署；`init → check` 为 0/0；表格转义、DR/CR 分表、`nextId` 分表、accept/resolve/start 人类身份、多文件 journal 回滚。**S1 只改治理工具，不改产品行为**；证据 [`2026-11-06-s1-redteam.md`](workspace/evidence/2026-11-06-s1-redteam.md)，F-052。
- **红队整改 S2（2026-11-06，工具 0.9.4）**：新增 `verify`（check --strict → probe → 完整测试 → criteria → 开放 S1/S2 → 按 impact 证据债 → tree attestation）；`gate` 拒绝过期/失败/树变化的 attestation；`freeze` 写 direction/blueprint/criteria/product payload hash，`start` 重算并拒绝任一字节变化；`closed` 终态、`pause/resume/close`、唯一门禁名；criteria 增到期列。最终 clean-tree verify **PASS**（`VA-20261106033417-2e1420`，release tree `ABD389…`，check/probe/tests 全 pass）；治理回归 **10 + 7 = 17/17**；**S2 只改治理工具，不改产品行为**；证据 [`2026-11-06-s2-redteam.md`](workspace/evidence/2026-11-06-s2-redteam.md)，F-053。`check` 仍只是结构检查，不是授权/发布证明。
- **红队整改 S3（2026-11-06，工具 0.9.5）**：`fact`/`dissent`/`change`/`resolve`/`accept`/`log` 读写全程持 `.aecw-lock`；退出兜底释放；`withLock` 先恢复未完成 journal；32 路并发 `fact` × **10 轮**全部成功、ID 唯一、无截断/丢写。治理回归 **20/20**；**S3 只改治理工具，不改产品行为**；证据 [`2026-11-06-s3-redteam.md`](workspace/evidence/2026-11-06-s3-redteam.md)，F-054。
- 安装态：**已替换安装并随布局 v3 重装**（2026-11-06）：profile link/junction → **`D:\DSH\task-complete-toast-aecw`**；plugin `include:task-complete-toast` active；live 设置路由校验 200/400/422 符合预期；A 方案写入 `profiles/desktop/cordis.patch.yml`（F-038/F-047/F-051）。
- **G4 客户端 UI 已验收**：设置页入口/控件/预览/保存由人类目视接受（2026-11-05，E2，F-040）；`settings.plugins.tab` occupant 已确认（F-039）。截图缺口见 ED-001。

### 2.2 E2（人类目视，无截图）

- G1：**5/5**；G2：**7/8**（G2-8 挂起）；G3：**6/6**（G3-4b 未单独，计入 G3-4）。
- **G4 设置页**：人类目视后验收（“设置页效果符合预想”，2026-11-05，E2，无截图，F-040）。
- **G2 遮挡推送修复**：授权弹窗 → 最小化 DSH → Windows 通知出现 → 拒绝后消失（2026-11-05，E2，无截图，F-042）；随 1.3.0 发布（F-049）。
- **v1.3.0 发布**：G4 + G2 遮挡修复；截图/录屏要求人类挂起；见 [`gates/2026-11-05-release-v1.3.0.md`](gates/2026-11-05-release-v1.3.0.md)。
- 证据：[`真机复验-G2`](workspace/evidence/真机复验-G2-2026-11-04.md)、[`真机验收结果-G3`](workspace/evidence/真机验收结果-G3-2026-11-04.md)、[`2026-11-05-G4-live-host.md`](workspace/evidence/2026-11-05-G4-live-host.md)；均为人类口述 + 代理记录，**零截图**。

### 2.3 E3（文档主张，未复核）

- v1.1.0 历史：142/142、`node --check` 16/16、真机 10 通过 / 1 部分 / 13 挂账。
- DSH Desktop `0.2.1-rc.3`、Node v24.22.1（Node 已核验，DSH 版本未复核）。
- 100 次压测、13 项历史 V 项未验。

## 3. 已接受遗留

| 项 | 内容 | 接受者 | 证据 |
|---|---|---|---|
| G2-8 | 双会话并发/上限/顺序未测 | meo1102（F-028） | [`human/acceptance.md`](human/acceptance.md)；F-026 |
| G3-4b | 提醒卡不受 `durationMs` 未单独真机；结构由 `sticky`/不传 duration 保证 | meo1102（F-028） | [`human/acceptance.md`](human/acceptance.md)；F-027、P15 |
| G1 通知点击 | 不拉起/还原最小化窗口（R1 已知限制） | meo1102（F-022） | [`human/acceptance.md`](human/acceptance.md)；设计 §9 |

## 4. 未测 / 开放

| # | 项 | 状态 | 下一步 |
|---|---|---|---|
| 1 | G4 真机截图/录屏 | **挂起**（ED-001 waived，2026-11-05 人类指令） | 不再作为本轮发布条件；后续需要时再补 |
| 2 | 颜色对比度：只设一色或跟随 token 时无法计算 | 已用 4.5:1 守卫但仅双色场景 | 真机目视；必要时调阈值/提示 |
| 3 | **G2 遮挡推送修复** | **真机通过并随 1.3.0 发布**（E2，F-042/F-049）；截图挂起（ED-002 waived） | 后续需要时再补 |
| 4 | 13 项历史 V 项（V05、V08–V10、V14、V16、V18、V20、V22、V24–V27） | 未测；**无人裁决**（积压，不属 grow-2） | 后续阶段逐项做/接受/删除 |
| 5 | V01、V04、V23 | **账上缺失**（原始清单未定义） | 人类裁决删除或补定义 |
| 6 | DSH 版本 | 未复核 | 版本探针 |
| 7 | `notify.awaiting:false` 真机效果 | 仅单测 | 重启 + 真机一次 |
| 8 | G2 多标签浮层各显示一条 | 设计接受，未真机 | 双标签一次 |
| 9 | G3 窄窗 <300 px | 未测（只到 360 px） | 与 G4 设置页/预览一起窄窗验证 |
| 10 | 本项目安装/回滚 | **已替换安装**（profile link/junction → 仓库根） | 回滚 = remove_bundle 后 install_bundle 指向原件；已验证 host 路由 |
| 11 | 设置页在旧版 DSH 无 `settings.plugins.tab` 时 | 代码上不影响浮层主功能 | 真机/版本探针；文档写明版本要求 |

**已闭合**：

- **G4 设置页人类验收**：人类反馈“设置页效果符合预想，验收”（2026-11-05，E2 无截图，F-040）。
- **G2 遮挡推送真机通过**：最小化后 Windows 通知出现，拒绝后消失（2026-11-05，E2 无截图，F-042）。
- **`grow-2` 阶段关闭**：`gates/2026-11-05-grow-2.md`（有条件通过）。
- 人类所有者口径：按 Git 提交人记录 `meo1102`（2026-11-05，F-034）。
- charter G4/G3 修订：`direction.md` v1.2-aecw（2026-11-05 人类指令）。
- 蓝图 v2 批准、`freeze`、`start`：见 `gates/2026-11-05-charter-freeze.md`、`2026-11-05-start-order.md`。
- 旧 D/G2 编号与哈希映射：见 [`workspace/memory/history-mapping.md`](workspace/memory/history-mapping.md)。

## 5. 文档时效

| 文档 | 时效 | 说明 |
|---|---|---|
| [`../PROJECT.json`](../PROJECT.json) | 当前 | 项目清单：两个根、安装目标、命令、工具版本 |
| [`state.json`](state.json) | 当前 | 机器可读状态源（stage/release/evolution/adoption/evidence_debt） |
| [`criteria.md`](criteria.md) | 当前 | 验收矩阵：判据/证据/豁免/证据债 |
| `STATUS.md`（本页） | **当前** | 当前状态视图（与 state 对账） |
| `human/direction.md` | 当前（v1.2-aecw） | 方向/边界/S1–S4/停止；§7 工作方式原则；G4/G3 修订 |
| `human/decisions.md` | 当前 | 人类决策（方向/边界/阶段/维护/激活） |
| `human/acceptance.md` | 当前 | 人类验收/遗留接受 |
| `cluster/evolution.md` | 当前 | 进化台账（EV-001 active） |
| `cluster/maintenance.md` | 当前 | 维护泳道（v0.9 校准/迁移/分层） |
| `cluster/release.md` | 当前 | 发布泳道（1.3.0 已发布） |
| `BLUEPRINT.md` | 当前（v2，approved；阶段 closed） | 阶段 `grow-2`：外观设置 + 实时预览 |
| `workspace/evidence/blueprint-v1-steward-1.md` | 历史（未执行） | v1 `steward-1` 草案 |
| `ledger.md` | 当前 | 异议/事实/变更（DR/F/CR） |
| `cluster/` | 当前 | 名册/任务板/运行/学习/进化/维护/发布 |
| `gates/` | 历史 | 每道门当时的记录；含 charter-freeze / start-order / adoption / grow-2 / release-v1.3.0 |
| `workspace/evidence/` | 证据 | 原始记录与历史快照；单份文件头标 SUPERSEDED/HISTORICAL |
| [`workspace/evidence/2026-11-05-development-retrospective.md`](workspace/evidence/2026-11-05-development-retrospective.md) | 历史（复盘） | 本次开发过程全记录：需求/时间线/决策/失败/证据/未完成 |
| [`workspace/evidence/2026-11-05-v09-calibration.md`](workspace/evidence/2026-11-05-v09-calibration.md) | 历史 | v0.9 校准当时证据：PROJECT/state/criteria、check 对账、负控；随后 1.3.0 发布 |
| [`workspace/evidence/2026-11-05-release-v1.3.0.md`](workspace/evidence/2026-11-05-release-v1.3.0.md) | 历史（发布时布局 v2） | v1.3.0 发布证据：版本/tag/哈希/校验/豁免；v3 后路径以 STATUS 为准 |
| [`workspace/evidence/2026-11-05-v09-acceptance.md`](workspace/evidence/2026-11-05-v09-acceptance.md) | 当前 | v0.9 校准验收：13 处残留修复；check/probe/tests；两个已知 check 缺口 |
| [`workspace/evidence/2026-11-06-layout-v3.md`](workspace/evidence/2026-11-06-layout-v3.md) | 当前 | 布局 v3：取消 product 层，产品在仓库根；profile/清单/状态/探针写回 |
| [`workspace/evidence/2026-11-06-s1-redteam.md`](workspace/evidence/2026-11-06-s1-redteam.md) | 当前 | 红队整改 S1：P0-1 + P0-7；工具 0.9.3；负控与未做项 |
| [`workspace/evidence/2026-11-06-s2-redteam.md`](workspace/evidence/2026-11-06-s2-redteam.md) | 当前 | 红队整改 S2：P0-2 + P0-3；verify attestation、freeze payload、状态机 |
| [`workspace/evidence/2026-11-06-s3-redteam.md`](workspace/evidence/2026-11-06-s3-redteam.md) | 当前 | 红队整改 S3：P0-4；进程锁、journal 恢复、32 路并发 |
| `workspace/memory/` | 当前/参考 | 设计契约（§16 G4）、ADR、历史映射、V 项对账、设置方案 |
| `workspace/landing/` | 当前/历史 | 落地清单、交接说明、迁移说明 |
| [`../README.md`](../README.md) | 当前摘要 + 历史细节 | 产品功能/安装说明；状态以本页为准 |
| `AGENTS.md` | 当前 | AECW 治理/开发约定；仓库级见 [`../AGENTS.md`](../AGENTS.md) |

## 6. 下一步

**阶段 `grow-2` 已关闭（2026-11-05，有条件通过）。布局 v3：产品在仓库根、AECW `aecw/`，profile 指向仓库根。历史基线 commit `4aff41a` / tag `aecw-grow-2-2026-11-05`（`DSH_end` 归档）；独立仓库 initial `67809d0` / tag `aecw-standalone-2026-11-05`；**1.3.0 已发布**（tag `v1.3.0`）。**

**当前停点（2026-11-06）**：红队整改 **S1 已完成并冻结基线**（tag `aecw-s1-2026-11-06`，F-052）；**S2 已完成并冻结基线**（tag `aecw-s2-2026-11-06`，F-053）；**S3 已完成并冻结基线**（tag `aecw-s3-2026-11-06`，F-054）；**S4 进行中**，S5 未开始。

1. **v0.9 校准已验收（有条件通过）**（maintenance）：`PROJECT.json`、`state.json`、`criteria.md`；13 处残留当前文档矛盾修复；历史文档加状态头；`check` 增加路径/命令/状态/围栏/文档头检查。**未改产品行为。** 验收见 [`2026-11-05-v09-acceptance.md`](workspace/evidence/2026-11-05-v09-acceptance.md)，F-050。已知缺口：`check` 关键词硬编码、`commands.test` 只验路径不执行（已修为 `test/*.test.js`）。
2. **EV-001 已激活**：`node aecw/scripts/probe.mjs` 写入 AGENTS，门禁/交付前必跑；正控 7/7、负控 fail。分布外验证/真实回滚演练仍待做。
3. **v1.3.0 已发布**：G4 外观设置 + G2 遮挡推送修复；门禁 [`gates/2026-11-05-release-v1.3.0.md`](gates/2026-11-05-release-v1.3.0.md)；tag `v1.3.0`；截图/录屏要求按人类指令**挂起**（ED-001/ED-002 waived）。
4. **仍开放（不阻塞本次发布）**：
   - G2-8、G3-4b 仍为已接受遗留；13 项 V 项 + V01/V04/V23 未裁决；
   - G2 多标签、窄窗、自定义主题一致性未验；
   - adoption 仍 provisional（ED-003）；EV-001 分布外/回滚演练（ED-004）。
5. **下一阶段**：由人类决定；若进入下一阶段，先写新 `BLUEPRINT` 版本、`freeze`、`start`；不得沿用本阶段授权自动续跑。
6. **1.3.0 已发布**，但仍不得把“零截图/多标签未验”说成“全部通过”。
7. **布局 v3 已写回并推送**（2026-11-06，maintenance）：取消 `product/` 层，产品代码回到仓库根；profile 指向仓库根；`PROJECT.json`/`state.layout`/`state.install`/`state.remote`/probe 已同步；已推送 `origin/main` + tag `aecw-layout-v3-2026-11-06`。`check` 会校验 layout/install/remote 与 `PROJECT.json`、git origin 一致。见 [`2026-11-06-layout-v3.md`](workspace/evidence/2026-11-06-layout-v3.md)，F-051。

## 7. 阶段授权（冻结）

- 阶段：grow-2
- 蓝图：v2（批准：meo1102）
- 范围：外观设置：字体跟随系统正文；字号 12–18 px；卡片宽度 280–480 px；最小宽度联动；背景色/字体色 #RRGGBB + 对比度守卫；实时预览；不含 G2-8/G3-4b/V
- 预算：2 周 / 15 个有效 agent 回合
- 停止：S1 / 预算耗尽 / 需新增依赖或改宿主 / configEditor 不可用且人类不接受降级 / 连续两道门禁失败
- 验收：WP-0 有结论；设置页可调；字号/宽度边界与联动生效；颜色对比度守卫；预览即时；保存经 configEditor 可复现；160 项不回归；真机截图
- 冻结：2026-11-05；宪章确认：meo1102
- 集群只可执行本阶段；阶段结束必须停、报告、等下一道门。

## 8. 开工令

- 下达人：meo1102
- 日期：2026-11-05
- 首次报告点：WP-0 方案与 configEditor 探针后，或触发 S2 时
- 依据：2026-11-05-charter-freeze.md + BLUEPRINT.md v2
- 只授权本阶段；阶段结束或触发停止条件必须停、报告、等下一道门。
