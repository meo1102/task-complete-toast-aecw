# 人类决策记录 · task-complete-toast

> 状态：historical｜最后核对：2026-11-05

> 只记“决定 / 理由 / 影响”。S1/S2 见 `ledger.md` 与 `inbox/`；技术决策（ADR-001–023）见 [`workspace/memory/adr-001-023.md`](../workspace/memory/adr-001-023.md)。
> **署名口径（2026-11-05 人类指令）**：人类按 **Git 提交人**记录 = `meo1102`（`meo1102@163.com`）。原记录中的「本会话发起人 / 人类本人」统一对应此人，不再写“待确认”。

| 日期 | 决策 | 理由 | 影响 |
|---|---|---|---|
| 2026-11-04 | 批准宪章 **v1.0**（仅批准生效，无条款实质变更） | 提供项目总约束：方向/边界/停止/红线 | 阶段 0 门禁；F-020 |
| 2026-11-04 | G1 系统通知点击**不承诺**拉起/还原最小化窗口，接受为 R1 已知限制 | 还原窗口需宿主 `BrowserWindow.restore()/show()`，越界「不改宿主」 | 设计 §9 与 README 口径收窄；F-022 |
| 2026-11-04 | G2 **不要求常驻**：进入会话即收起卡片并关闭系统通知；不引入 `noticePosition` | 从根上消除遮挡；不做定时消失，避免后台关闭通知导致漏授权 | **CR-001**（blueprint 级）；G2 编号重排；F-025；G2 7/8 |
| 2026-11-04 | 接受 **G2-8**（双会话并发/上限/顺序）未测 | 构造成本 > 当前收益；已写清不可外推 | 作为已接受遗留；F-028 |
| 2026-11-04 | 接受 **G3-4b**（提醒卡不受 `durationMs`）未单独真机 | 结构由 `sticky`/不传 duration 保证，P15 有断言 | 作为已接受遗留；F-028 |
| 2026-11-04 | 批准发布 **v1.2.0** | 核心项通过；遗留已写明，不称「全绿」 | `package.json` 1.2.0；tag `v1.2.0`；F-028/F-029 |
| 2026-11-05 | 指令：复制本项目，并按 AECW 原型机（`agent-engineering-control/prototype`）架构改造副本 | 用真实项目验证原型结构：三域、单一 STATUS、蓝图/冻结/开工、台账/门禁 | 本副本 `task-complete-toast-aecw`；迁移门禁 `gates/2026-11-05-adoption.md`；CR-002 |
| 2026-11-05 | 人类所有者口径：**按 Git 提交人记录**（`meo1102` / `meo1102@163.com`） | 避免“未具名/待确认”阻断冻结与发布声明 | `STATUS.md`、`human/acceptance.md`、`cluster/roster.md` 统一口径；F-034 |
| 2026-11-05 | 宪章增补 §7 **工作方式原则**：先相信工具、不符预期时再质疑；不节省 token | 人类指令；减少“先怀疑工具再绕开”的浪费，也禁止为省 token 缩水证据 | `human/direction.md` v1.1-aecw；CR-003 |
| 2026-11-05 | 后续升级计划：① 插件介绍改为与 v1.2.0 相符的文案（当前 locale 仍是“骨架/空占位”旧文案）；② 新增外观设置（字体、字号、卡片大小、背景色、字体色），手动调整可实时预览 | 人类指令；旧介绍与事实不符；外观配置目前只能改 patch + 重启 | 介绍文案已修正（F-031/F-032）；设置计划写入 `BLUEPRINT.md` v2（`grow-2`，draft）；需 charter 级确认（G4 + G3 约束放宽） |
| 2026-11-05 | 外观设置约束：**字体跟随系统/DSH 正文字体**（不提供字体选择）；**字号、卡片大小给定 min/max**（提案：字号 12–18 px、卡片宽度 280–480 px）；背景色/字体色去留未定 | 收窄字体与尺寸风险；把“任意颜色”留作单独决定 | 写入 [`appearance-settings-design.md`](../workspace/memory/appearance-settings-design.md) §4、[`g4-charter-impact.md`](../workspace/memory/g4-charter-impact.md) §10、`BLUEPRINT.md` v2；F-035 |
| 2026-11-05 | **批准 `grow-2`**：走 **G4**；持久化 **A 方案**（宿主 `configEditor`）；边界就用 **字号 12–18 px、卡片宽度 280–480 px**；**最小宽度随字号联动**（`max(280, fontSize×18)`） | 人类明确选择；A 方案有宿主服务支持（F-036） | `direction.md` v1.2-aecw；`BLUEPRINT.md` v2 **approved**；进入 `freeze` + `start`；CR-004/CR-005 |
| 2026-11-05 | **安装方式：替换原件**——把 desktop profile 的 link/junction 指向本副本（原件保留在原路径，可回滚） | 人类选择 1；不新增第二个包名 | profile/junction 已指向副本；plugin active；回滚 = remove_bundle 后 install_bundle 指向原件；F-038 |
| 2026-11-05 | **同意做一次进化试验**：EV-001 运行态探针，低风险只读试用；**不自动晋升**为每道门必跑/共享规则 | 人类“基线冻结，先做个进化试试” | 正控 7/7、负控 fail；见 [`cluster/evolution.md`](../cluster/evolution.md)、[`ev-001-runtime-probe.md`](../workspace/memory/ev-001-runtime-probe.md)；激活待人类批准 |
| 2026-11-05 | **激活 EV-001**：`node scripts/probe.mjs` 写入 AGENTS，作为门禁/交付前必跑；FAIL 不得开门禁 | 人类“激活” | 进化台账状态 active；只读、可回滚；分布外验证/回滚演练仍待做 |
| 2026-11-05 | **项目迁至独立目录/仓库**：`D:\DSH\task-complete-toast-aecw`；不再从 `DSH_end`/原型机目录内管理 | 人类“项目文件整理到独立文件夹，不要和原型机文件混在一起” | profile 重装指向新路径；旧历史归档 `DSH_end`；见 [`2026-11-05-standalone-migration.md`](../workspace/evidence/2026-11-05-standalone-migration.md) |
| 2026-11-05 | **产品/AECW 分层**：产品代码统一 `product/`，AECW 治理统一 `aecw/`，不混放；profile 指向 `product/` | 人类“AECW 结构的文件和产品代码不要混杂在一起，产品代码统一放置” | 见 [`standalone-migration`](../workspace/evidence/2026-11-05-standalone-migration.md) §1.1；F-047 |
| 2026-11-05 | **按 REVIEW/PLAN v0.9 校准**：maintenance 泳道；加 PROJECT/state/criteria；修文档矛盾；升级 check；**不改产品行为/人类验收/发布决定** | 人类“先按照这两个文档校准项目” | 见 [`v0.9-calibration`](../workspace/evidence/2026-11-05-v09-calibration.md)；F-048；adoption 仍 provisional |
| 2026-11-05 | **发布 v1.3.0**：G4 外观设置 + G2 遮挡推送修复；**截图/录屏要求全部挂起**（ED-001/ED-002 waived）；adoption 仍 provisional | 人类“截图/录屏的要求都挂起，发布新版本” | 见 [`release-v1.3.0`](../gates/2026-11-05-release-v1.3.0.md)、[`2026-11-05-release-v1.3.0.md`](../workspace/evidence/2026-11-05-release-v1.3.0.md)；F-049 |
| 2026-11-06 | **取消 product 层**：产品代码放在项目根目录；AECW 仍在 `aecw/` | 人类“取消 product 层，产品代码放在项目根目录” | 布局 v3；profile 指向仓库根；见 [`layout-v3`](../workspace/evidence/2026-11-06-layout-v3.md)；F-051 |
| 2026-11-06 | **按 `PLAN-v0.9.1-红队整改` 分阶段整改**；S1 完成并冻结基线后停，等人类同意再开 S2 | 人类原话：“按顺序整改，每完成一个阶段后冻结基线，等我同意下一轮后再继续” | 工具 0.9.3；S1 只改治理工具，不改产品行为；S2–S5 未开始；F-052 |
| 2026-11-06 | **同意开始红队整改 S2**（P0-2 verify + P0-3 状态机/冻结哈希）；完成后冻结基线并停，等人类同意 S3 | 人类原话：“开始s2” | 工具 0.9.4；S2 只改治理工具；S3–S5 未开始；F-053 |
| 2026-11-06 | **同意同时开始 S3 与 S4**：S3 原子台账/并发；S4 探针/写路由安全（需新 stage + freeze/start） | 人类原话：“开始s3和s4” | 工具 0.9.5→0.9.6；S4 改产品安全行为；S5 未开始；F-054/F-055 |
| 2026-11-06 | **开始 S5 并在全部完成后发布 1.3.1**；接受 G1-P95、WP-4-RELOAD 作为发布后补证 | 人类原话：“开始后面的改造，全部完成后发布新版本” | 工具 0.9.6；1.3.1 发布；F-056/F-057 |
| 2026-11-06 | **同意 EV-001 复核后重新激活**：先降 trial，正/负控通过后 active | 人类“开始 s3 和 s4”及发布指令；S4 复核证据 | F-055；EV-001 active；ED-004 仍 open |

## 阶段外事项（已完成 / 待人类）

| # | 事项 | 时点 | 说明 |
|---|---|---|---|
| 1 | ~~`grow-2` 阶段验收与遗留接受~~ | 已处理 | 2026-11-05 有条件通过；G4 F-040、G2 F-042；门禁 `grow-2` |
| 2 | 真机截图（ED-001/ED-002） | 已处理 | 2026-11-05 人类指令挂起；随 1.3.0 发布，不称“截图完成” |
| 3 | adoption 门禁签署（ED-003） | 2026-11-12 | 当前 provisional；签署后转 accepted |
| 4 | G4 发布决定（版本/tag/发布说明） | 已处理 | 2026-11-05 发布 `1.3.0` / tag `v1.3.0`（F-049） |
| 5 | EV-001 分布外验证/回滚演练（ED-004） | 2026-11-19 | active；到期复核 |
