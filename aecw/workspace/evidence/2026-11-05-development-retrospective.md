# 开发过程全记录 · task-complete-toast-aecw（2026-11-05）

> 状态：historical｜最后核对：2026-11-05
> 说明：历史记录，不参与当前结论；当前以 `aecw/STATUS.md` 为准。

> 对象：`task-complete-toast` v1.2.0 的 AECW 结构副本（现独立项目 `D:\DSH\task-complete-toast-aecw`）。
> 范围：2026-11-05 从“复制 + 按原型机架构改造”到“G4 设置页 / G2 遮挡推送修复 / 阶段门禁 / 基线冻结 / EV-001 进化 / 独立目录迁移”的完整过程。
> 用途：交接、审计、复盘；**不是发布公告**。当前状态以 [`../../STATUS.md`](../../STATUS.md) 为准；事实以 [`../../ledger.md`](../../ledger.md) 的 F/DR/CR 编号为准。
> 证据等级：E1 运行事实（可复现）｜E2 人类目视（无截图）｜E3 文档主张（未复核）。

---

## 0. 摘要

| 项 | 结果 |
|---|---|
| 起点 | 原插件 `DSH_end/插件/task-complete-toast` v1.2.0；160/160；已有试点文档，但没有 AECW 三域结构 |
| 终点 | 独立项目 `D:\DSH\task-complete-toast-aecw`；**产品代码 `product/`、AECW 治理 `aecw/` 物理分离**；三域 + 单一 STATUS + 台账 + 门禁 + 基线 + 进化台账 |
| 代码 | G1/G2/G3 原样；新增 **G4 外观设置 + 实时预览**；修复 **G2 遮挡时无系统通知** |
| 测试 | 起点 160/160 → **169/169**；`node --check` 17/17 |
| 真机 | G4 设置页人类验收（E2，无截图）；G2 遮挡推送人类真机通过（E2，无截图） |
| 阶段 | `grow-2` **closed**，门禁有条件通过；基线 commit `4aff41a` / tag `aecw-grow-2-2026-11-05`（历史归档），独立仓库 initial `67809d0` / tag `aecw-standalone-2026-11-05` |
| 进化 | EV-001 运行态探针：trial 正控 7/7、负控 fail → 人类**激活**，写入 AGENTS 门禁前必跑 |
| 未完成 | 真机截图/录屏零；G2-8、G3-4b、13 项 V 未裁决；G4 未发布；EV-001 分布外/回滚演练未做 |

**一句话**：这次不是“把插件重写”，而是把真实试点项目装进 AECW 的责任结构，并在结构内完成一次功能演进（G4）、一次缺陷修复（G2）、一次阶段门禁、一次基线冻结和一次低风险进化试验（EV-001）。

---

## 1. 起点与目标

### 1.1 起点

- 原插件：`D:\DSH\DSH_end\插件\task-complete-toast`，v1.2.0，160/160 测试；G1/G2/G3 已发布；G2-8、G3-4b 已接受遗留；零截图。
- 原型机：`D:\DSH\agent-engineering-control\prototype`，零依赖 AECW 原型（三域 / 六接口 / CLI / demo）。
- 原始需求：复制插件项目，按原型机架构改造副本；改造完成后停、等指示。

### 1.2 目标（按人类指令逐步追加）

1. 三域结构、单一 STATUS、蓝图/冻结/开工、台账/门禁；
2. 人类所有者按 Git 提交人记录；
3. 章程增补“先相信工具 / 不节省 token”；
4. 插件介绍与 v1.2.0 事实对齐；
5. 外观设置（字体跟随系统、字号/宽度边界、颜色）+ 实时预览；
6. 走 G4、A 方案、最小宽度随字号联动；
7. 替换安装、真机验收；
8. 修复“DSH 被遮挡时授权没有推送”；
9. 基线冻结 + 一次进化试验；
10. 激活 EV-001、项目独立目录、全量整理开发过程。

---

## 2. 时间线（按阶段）

> 时间来自会话上下文采样，约到分钟；不是精确审计日志。

| 时间（+08:00） | 阶段 | 动作 | 产物/证据 |
|---|---|---|---|
| 11:34 | 复制 + 结构改造 | 复制原件到 `DSH_end/插件/task-complete-toast-aecw`；复制原型 CLI/模板；三域重排；`docs/` 拆入 human/cluster/workspace/gates/inbox | 49 文件复制；160/160；check PASS；F-030 |
| 14:19 | 口径与章程 | 所有者按 Git 提交人 `meo1102`；direction v1.1 §7；介绍文案修正（原 locale 仍是“骨架/空占位”） | F-031/F-032/F-034；CR-003 |
| 14:33 | G4 影响分析 | 回答 G4/G3 约束放宽的影响；A/B/C 持久化方案；风险与建议条文 | `g4-charter-impact.md` |
| 14:43 | 约束细化 | 字体跟随系统；字号/卡片大小边界；颜色待定 | F-035；`appearance-settings-design.md` |
| 15:00 | 批准与实现 | G4/A 方案/12–18/280–480/联动；direction v1.2；蓝图 v2 approved；freeze + start；实现配置/设置页/预览/A 路径 | F-036/F-037；gates charter-freeze/start-order |
| 15:13 | 替换安装 | `remove_bundle` + `install_bundle` 指向副本；profile link/junction 更新；live 路由 200/400/422；A 方案写入 `cordis.patch.yml` | F-038；`2026-11-05-G4-live-host.md` |
| 15:24 | 设置页验收 | 人类：设置页效果符合预想；**接受**（E2，无截图） | F-040；`human/acceptance.md` |
| 15:55 | G2 缺陷 | 人类场景：DSH 被遮挡、前台别的应用，Windows 通知中心无推送；定位“会话内直接 dismiss”吞掉系统通知；改 hidden 条目 + 失焦/隐藏补发；W16/W17 | F-041；169/169 |
| 16:05 | G2 真机 | 授权弹窗 → 最小化 → Windows 通知 → 拒绝后消失；**接受**（E2，无截图） | F-042；`human/acceptance.md` |
| 16:05 | 阶段关闭 | `grow-2` 门禁有条件通过；STATUS 阶段 closed；commit `4aff41a` + tag `aecw-grow-2-2026-11-05` | `gates/2026-11-05-grow-2.md`；F-043 |
| 16:15 | 进化试验 | EV-001 运行态探针 trial：正控 7/7、负控 fail；提案六项齐全 | F-044；`cluster/evolution.md` |
| 16:26 | 激活 + 独立目录 | EV-001 写入 AGENTS；项目迁至 `D:\DSH\task-complete-toast-aecw`；独立仓库；profile 重装；迁移后探针 7/7 | F-045/F-046；`2026-11-05-standalone-migration.md` |
| 16:30+ | 全量整理 | 本文件；索引/STATUS/README 同步 | 本文件 |
| 16:40 | 产品/AECW 分层 | 产品统一 `product/`，治理统一 `aecw/`；profile 重装指向 `product/`；探针 7/7 | F-047；`2026-11-05-standalone-migration.md` §1.1 |

---

## 3. 需求追踪（人类指令 → 交付 → 证据）

| # | 人类指令 | 交付 | 证据 |
|---|---|---|---|
| 1 | 复制插件项目，按 prototype 架构改造 | 三域结构 + CLI + 台账/门禁/蓝图；`docs/` 迁入三域 | F-030；`workspace/landing/migration-aecw-2026-11-05.md` |
| 2 | 人类按 Git 提交人记录 | 所有者 `meo1102`；STATUS/decisions/acceptance/roster 统一 | F-034 |
| 3 | 章程增补“先相信工具、不符预期再质疑；不节省 token” | direction v1.1 §7 + 沿革 | CR-003；`human/direction.md` |
| 4 | 更新插件介绍 | locale/README 与 v1.2.0 对齐；smoke 回归断言 | F-031/F-032 |
| 5 | 后续升级：外观设置 + 实时预览 | G4 设置页、五类控件、预览、保存 | F-037；`design-contract-v1.2.0.md` §16 |
| 6 | G4、A 方案、边界、最小宽度联动 | 配置/校验/对比度；`configEditor`；`max(280, fontSize×18)` | CR-004/CR-005；F-036/F-037 |
| 7 | 替换安装并真机 | profile/junction → 副本；设置页验收 | F-038/F-040 |
| 8 | 授权没有推送（遮挡场景） | hidden + 失焦补发；W16/W17；真机通过 | F-041/F-042 |
| 9 | 基线冻结，做一次进化 | commit/tag；EV-001 trial | F-043/F-044 |
| 10 | 激活 + 独立文件夹 + 全量整理 | AGENTS 探针；独立目录/仓库；产品/AECW 分层；本文件 | F-045/F-046/F-047 |

---

## 4. 关键决策（人类）

| 日期 | 决策 | 影响 |
|---|---|---|
| 2026-11-05 | 所有者按 Git 提交人 `meo1102` | 解除“未具名”对 freeze/发布声明的阻断 |
| 2026-11-05 | 章程增补工作方式原则 | direction v1.1；不改变目标/非目标 |
| 2026-11-05 | G4；A 方案；12–18 px / 280–480 px；最小宽度联动 | direction v1.2；grow-2 范围；设置页实现 |
| 2026-11-05 | 替换原件安装 | profile 指向副本；原件可回滚 |
| 2026-11-05 | 接受 G4 设置页 | F-040；阶段验收核心项 |
| 2026-11-05 | 接受 G2 遮挡推送修复 | F-042；缺陷关闭 |
| 2026-11-05 | 基线冻结 + 试一次进化 | 4aff41a/tag；EV-001 trial |
| 2026-11-05 | 激活 EV-001 | AGENTS 门禁前必跑 |
| 2026-11-05 | 项目迁至独立目录 | D:\DSH\task-complete-toast-aecw；独立 git |

---

## 5. 失败、误判与修正（重点）

| # | 现象 | 根因 | 修正 | 证据/教训 |
|---|---|---|---|---|
| 1 | 插件介绍仍写“骨架版本，仅注册空占位” | 早期骨架文案未随 G1/G2/G3 更新 | locale/README 更新 + smoke 禁止旧文案 | F-031/F-032；文档漂移 |
| 2 | 设置页“找不到” | 侧边栏“插件”页的插件卡片 ≠ **设置 → 插件** 的自定义页签；页面刚迁移无自动刷新 | 给出正确入口；加错误边界/诊断；slot 账本确认 occupant | F-039；导航/上下文 |
| 3 | DSH 被遮挡时授权无 Windows 通知 | 原逻辑“已进入会话 → 直接 dismiss”，系统通知一并被吞 | hidden 条目 + 页面不可见/失焦补发；pending 解决关闭；W16/W17 | F-041/F-042；**抑制卡片 ≠ 抑制通知** |
| 4 | `configEditor` 显示 `unsupported`，疑似不能保存 | 配置目录状态不等于服务能力；`configEditor` 服务实际可用 | live 路由 200/400/422 + 写入 `cordis.patch.yml` | F-033/F-036/F-038；先探针再下结论 |
| 5 | 安装后目录搬动导致静默未加载 | profile link/junction/bundles 三处不同步 | 用 plugin_manager remove + install；迁移后重跑探针 | F-003/F-008/F-038/F-046 |
| 6 | 文档/哈希短时不一致 | 代码/文档连续迭代，哈希与行号会漂移 | 每次基线重算哈希；STATUS 只留当前值 | F-043；不许引用过期行号 |
| 7 | 旧编号混淆（D-001/D-002、G2-6/G2-8） | 试点期重编号 | DR-001/DR-002 映射；history-mapping | `workspace/memory/history-mapping.md` |
| 8 | 截图始终为零 | 真机验收靠口述，未建立截图流程 | 验收标 E2/证据缺口；不写成 E1 | F-040/F-042；诚实标注 |

---

## 6. 证据与校验（截至 2026-11-05）

| 项 | 值 | 等级 |
|---|---|---|
| 自动化 | 169/169；`node --check` 17/17 | E1 |
| 结构检查 | `node bin/aecw.mjs check .` → FAIL 0｜WARN 0；阶段 closed | E1 |
| 迁移后探针 | `node scripts/probe.mjs` → 7/7；坏 URL → 5/7 exit 1 | E1 |
| A 方案 | live 路由 200/400/422；`cordis.patch.yml` 保存 | E1 |
| G4 设置页 | 人类“效果符合预想” | E2（无截图） |
| G2 遮挡推送 | 最小化 → 通知 → 拒绝消失 | E2（无截图） |
| 历史 G1/G2/G3 | 2026-11-04 人类目视 | E2（无截图） |
| v1.1 历史 | 142/142、10/1/13 | E3（未复核） |

> 证据分级规则：E1 可复现运行事实；E2 人类目视无截图；E3 文档主张。**E2 不得升级为 E1。**

---

## 7. 交付物地图（当前）

```text
D:\DSH\task-complete-toast-aecw\        # 独立项目 / 独立 git 仓库
├─ README.md                            # 仓库地图（本文件入口）
├─ AGENTS.md                            # 仓库级分离规则
├─ product/                             # 产品代码（可安装包，profile 指向这里）
│  ├─ index.js / client.js / lib/ / locale/ / test/
│  ├─ package.json / cordis.patch.yml / icon.svg
│  └─ README.md                         # 产品功能/安装/限制
└─ aecw/                                # AECW 治理结构与工具
   ├─ STATUS.md                         # 唯一当前状态（阶段 closed）
   ├─ BLUEPRINT.md                      # grow-2 蓝图（approved，closed）
   ├─ ledger.md                         # DR/F/CR 台账
   ├─ human/                            # direction v1.2 / decisions / acceptance
   ├─ cluster/                          # roster/board/runs/learning/evolution
   ├─ workspace/
   │  ├─ evidence/                      # 基线/迁移/设置/G2/EV-001 证据
   │  ├─ memory/                        # 设计契约 §16、ADR、EV-001 提案
   │  ├─ work/                          # 产物/草稿
   │  └─ landing/                       # manifest/交接/迁移
   ├─ gates/                            # 阶段 0–2、adoption、freeze、start、grow-2
   ├─ inbox/                            # DR-002 / CR-001
   ├─ bin/aecw.mjs + core/              # 自包含 AECW CLI/模板（从 prototype 复制）
   ├─ scripts/probe.mjs                 # EV-001 运行态探针（已激活）
   └─ AGENTS.md                         # AECW 治理规则
```

关键文件：

- 状态：[`../../STATUS.md`](../../STATUS.md)
- 台账：[`../../ledger.md`](../../ledger.md)
- 阶段门禁：[`../../gates/2026-11-05-grow-2.md`](../../gates/2026-11-05-grow-2.md)
- 基线：[`baseline-2026-11-05-grow-2.md`](baseline-2026-11-05-grow-2.md)
- 独立迁移：[`2026-11-05-standalone-migration.md`](2026-11-05-standalone-migration.md)
- 产品说明：[`../../../README.md`](../../../README.md)
- 设置契约：[`../memory/design-contract-v1.2.0.md`](../memory/design-contract-v1.2.0.md) §16
- 进化：[`../../cluster/evolution.md`](../../cluster/evolution.md)；[`../memory/ev-001-runtime-probe.md`](../memory/ev-001-runtime-probe.md)

---

## 8. 未完成 / 不能声称

- **零截图**：G4/G2 都是 E2 人类口述，没有图片/录像。
- **G4 未发布**：版本仍 `1.2.0`，未打新 tag；README 不称“正式发布/全部通过”。
- **G2-8、G3-4b** 仍为已接受遗留；13 项 V 项 + V01/V04/V23 未裁决。
- **G2 多标签、窄窗、自定义主题一致性**未验。
- **EV-001 只测单机单 profile**；分布外验证、真实回滚演练未做。
- **AECW adoption 门禁**仍待人类签署（`gates/2026-11-05-adoption.md`）。
- 不能外推到其他 Windows/DSH 版本、其他用户、多 agent 场景。

---

## 9. 进化与学习

- 学习账候选 → **EV-001 运行态探针**：trial → 人类激活；写入 AGENTS 门禁/交付前必跑。
- 本次新增长期教训：
  1. **抑制显示 ≠ 抑制通知**：入会话应只藏卡片，页面不可见时系统通知仍要发。
  2. **导航位置也是验收对象**：设置页注册成功 ≠ 人类找得到；文档要写清楚入口。
  3. **文档/服务状态不等于能力**：`Config` 标 `unsupported` 时，`configEditor` 仍可能可用；要用 live 探针。
  4. **移动安装目录必须重装 profile**：link/junction/bundles 三处都要核。
  5. **E2 验收必须标证据缺口**：口述可以支持有限结论，不能写成 E1。

---

## 10. 复盘结论

1. 这次 AECW 结构真正起作用的地方，不是文档数量，而是：**单一 STATUS → 阶段门禁 → 人类验收 → 基线冻结 → 进化候选**这条链。
2. 最危险的两次问题都不是代码逻辑，而是**上下文/表示**：介绍文案滞后、设置页入口找不到；G2 的 bug 则是“抑制策略越界”。
3. 最有效的修复手段是**外部证据**：live 路由、profile/junction、slot 账本、人类真机；不是继续写说明。
4. 仍未闭合的是**证据质量**（截图/分布外），不是功能本身；这应作为下一阶段/下一次进化的第一优先级。

---

## 附录 A：关键命令索引

```powershell
# 仓库根
cd D:\DSH\task-complete-toast-aecw

# 运行态探针（EV-001，门禁前必跑）
node aecw/scripts/probe.mjs

# 全量测试（产品代码在 product/）
cd product
node --test --test-isolation=none test/smoke.test.js test/integration.test.js test/store.test.js test/format.test.js test/dismiss.test.js test/notifier.test.js test/resolver.test.js test/wiring.test.js test/presentation.test.js test/interaction.test.js
cd ..

# 结构检查（治理目录是 aecw/）
node aecw/bin/aecw.mjs check aecw

# 当前 git
git log --oneline -5
git tag --points-at HEAD
```

## 附录 B：术语

| 术语 | 含义 |
|---|---|
| AECW | 人类 / 集群 / 工作区三域的责任结构 |
| E1/E2/E3 | 运行事实 / 人类目视 / 文档主张 |
| freeze / start | 阶段基线冻结 / 人类开工令；只授权一个阶段 |
| S1–S4 | 风险分级；S1/S2 直达人类 |
| EV-001 | 运行态探针进化提案（已激活） |
| G4 | 外观设置 + 实时预览（grow-2） |
