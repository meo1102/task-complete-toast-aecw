# 任务板 · task-complete-toast

> 状态：current｜最后核对：2026-11-06
> 当前阶段：`grow-2`（**closed**，2026-11-05，有条件通过）。阶段外维持/进化/发布走独立泳道（见 §泳道）。
> 产品代码在仓库根（`../`）；本阶段不做 G2-8/G3-4b/V 项（见积压）。

| ID | 任务 | 负责人 | 状态 | 输入 | 输出 | 验收 |
|---|---|---|---|---|---|---|
| T-000 | AECW 结构迁移（副本初始化） | 单代理（人类指令） | done | 原件 v1.2.0；原型机 `agent-engineering-control/prototype` | 三域结构 + `bin/aecw.mjs` + 迁移门禁 | `gates/2026-11-05-adoption.md`；F-030 |
| T-001 | WP-0 设置可行性探针与方案裁决 | 集群管家 + 人类 | done | DSH Slots/Service/Theme 探针；F-033/F-036 | 方案结论：A（`configEditor`） | 宿主服务存在；真机行为待 WP-5 |
| T-002 | WP-1 设置契约与配置模型 | 实现者 | done | WP-0；现有 `appearance` | `lib/config.js` + 投影 + 单测 | 边界/联动/颜色校验；旧字段不回归 |
| T-003 | WP-2 设置页 UI（`settings.plugins.tab`） | 实现者 | done | WP-1；slots/locale | 设置页组件 + zh/en 文案 | 渲染测试通过；人类验收 F-040；截图 ED-001 |
| T-004 | WP-3 实时预览 | 实现者 | done | WP-2 | 设置页内样例卡预览 | 随设置页一起人类验收（F-040，E2） |
| T-005 | WP-4 持久化与生效（A 方案） | 实现者 | done（host 已验证） | WP-0；WP-1 | host 路由 + `configEditor.edit` | I22 + live 200/400/422 + `cordis.patch.yml`（F-038） |
| T-006 | WP-5 测试与真机矩阵 | 实现者 + 人类目视 | done（阶段关闭） | WP-2..4 | 真机记录 + 截图 | G4 验收（E2）+ G2 遮挡推送真机（E2）；截图仍为零，已在门禁列为缺口 |
| T-007 | WP-6 文档与介绍一致性 | 工作区策展 | done | 上述输出 | 契约 §16、README、AGENTS、STATUS | 无“骨架/占位”旧文案 |
| T-008 | 插件介绍文案修正（任务级，2026-11-05） | 单代理 | done | F-031 旧文案；v1.2.0 能力 | `locale/zh.json`、`locale/en.json`、README；smoke 回归断言 | F-032；当时 smoke 7/7、全量 160/160 |
| T-009 | EV-001 运行态探针（阶段外） | 单代理 + 人类 | done（active） | 学习账候选；F-043 基线 | `scripts/probe.mjs`；AGENTS 门禁前必跑 | 正控 7/7、负控 fail；F-044/F-045 |
| T-010 | 独立目录迁移 + 开发过程全记录（阶段外） | 单代理 + 人类 | done | 人类“独立文件夹/全量整理” | 独立仓库、迁移记录、复盘 | F-046；[`development-retrospective`](../workspace/evidence/2026-11-05-development-retrospective.md) |
| T-011 | 产品/AECW 分层（阶段外） | 单代理 + 人类 | done | 人类“产品代码统一放置” | `product/`、`aecw/`、profile 指向 product | F-047；探针 7/7、169/169 |
| T-012 | v0.9 校准（maintenance） | 单代理 + 人类 | done | 人类“按 REVIEW/PLAN 校准” | PROJECT/state/criteria；check 升级；文档真话修复 | F-048；`v0.9-calibration`；check FAIL 0 |
| T-013 | v1.3.0 发布（release） | 单代理 + 人类 | done | G4 + G2 修复；截图挂起指令 | package 1.3.0、tag `v1.3.0`、发布门 | F-049；`release-v1.3.0`；ED-001/002 waived |
| T-014 | 布局 v3：取消 product 层（maintenance） | 单代理 + 人类 | done | 人类“产品代码放在项目根目录” | 产品代码回根、profile 重装、PROJECT/state/probe 同步 | F-051；probe 7/7、169/169、check 0/0 |
| T-015 | 红队整改 **S1**：P0-1 + P0-7（maintenance） | 单代理 + 人类指令 | done（基线冻结） | 人类“按 PLAN v0.9.1 顺序整改，每阶段后冻结基线” | 工具 0.9.3；open S1/S2 FAIL；gate 需 attestation；init 自检；表格/ID/事务加固；治理回归 10/10 | F-052；[`s1-redteam`](../workspace/evidence/2026-11-06-s1-redteam.md) |
| T-016 | 红队整改 **S2**：P0-2 verify + P0-3 状态机/冻结哈希 | 单代理 + 人类 | **pending（等人类同意下一轮）** | S1 基线；人类批准 | `verify` attestation；阶段状态机；freeze payload hash | 未开始；不得提前改 |

## 积压（不进 `grow-2`，后续阶段处理）

| ID | 项 | 状态 | 说明 |
|---|---|---|---|
| B-001 | G2-8 双会话并发/上限/顺序 | 已接受遗留（F-028） | 后续补真机 |
| B-002 | G3-4b 提醒卡时长未单独真机 | 已接受遗留（F-028） | 后续补真机 |
| B-003 | 13 项历史 V 项 + V01/V04/V23 | 未裁决 | 需人类逐项做/接受/删除 |
| B-004 | 真机截图/录屏 | **deferred（ED-001/ED-002）** | 阶段已关闭；不再写“WP-5 会补”，按证据债到期处理 |

## 泳道（阶段外）

| 泳道 | 当前 | 授权/证据 |
|---|---|---|
| maintenance | v0.9 校准、布局 v2、路径/命令修复 | 人类校准指令；[`maintenance.md`](maintenance.md) |
| evolution | EV-001 运行态探针（active） | [`evolution.md`](evolution.md) |
| release | **v1.3.0 已发布**（G4 + G2 遮挡修复） | [`release.md`](release.md)；ED-001/ED-002 waived；ED-003 open |
| stage | `grow-2` closed | [`../gates/2026-11-05-grow-2.md`](../gates/2026-11-05-grow-2.md) |

## 说明

- 任务级变更（同一工作包内换实现/补测试）记 `cluster/runs.md`；改验收/范围/顺序必须走 `change --type blueprint`。
- S1/S2 一出现就停高风险动作，先 `dissent` 进 `inbox/`，再等人类裁决。
- 本阶段的前置：charter 级变更（G4/约束放宽）+ 蓝图 v2 批准 + `freeze` + `start`，四者缺一不可。
