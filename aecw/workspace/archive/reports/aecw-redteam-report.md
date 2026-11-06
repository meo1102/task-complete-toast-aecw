# AECW v0.9 红队测试报告

> 审计日期：2026-11-05（Asia/Shanghai）  
> 对象：`D:\DSH\task-complete-toast-aecw` 内 vendored AECW v0.9.0  
> 审计快照：HEAD `0550b37`；产品发布 tag `v1.3.0` → `ba72f8f`；原工作树干净  
> 方法：静态审计、独立交叉复核、隔离副本攻击实验、并发故障实验、Git 字节级哈希核验  
> 安全边界：未修改原仓库或真实 profile；未联网外发；只对当前本机 GUI 执行了无写入探针与只读 GET，未发送合法设置写。变异实验均在 `D:\DSH\aecw-redteam-main\`、`D:\DSH\aecw-redteam-cli-agent\`、`D:\DSH\aecw-redteam-probe-agent\`。

## 0. 总结论

**“人类 / agent 集群 / 工作区”作为职责与证据分类模型有价值；当前实现却不能视为可靠的三柱治理系统。**

更准确的定位是：**一个诚实度较高、负事实较完整的单 agent 开发记录与 checklist 原型**。它适合低风险、可信操作者、单 agent、有人类持续参与的小项目；不适合宣称可约束不完全可信 agent、支撑真正并行集群，或作为高风险发布的强制授权边界。

- **产品运行面**：本次完整复跑为 **169/169 tests passed**；当前 GUI 的安装/路由探针为 **7/7 PASS**。这些支持“插件当前安装且路由可达”，但不独立证明视觉行为、写路由安全或治理/发布可信。
- **框架治理面**：授权可自报、开放 S1 可生成“通过”门禁、已关闭阶段可无新 freeze 重开、冻结蓝图可替换、32 路并发写台账发生重复 ID/丢写/截断读取。这些否定“治理机制可靠”。
- **当前结构检查**：`check` 实测 **FAIL 7 / WARN 0**，其中 1 项是 EOL 敏感的哈希假漂移，6 项是真实外部坏链。历史 FAIL 0 记录不能当作当前 PASS。
- **不应过度推断**：本报告不据此断言人类批准是伪造，也不据此断言 v1.3.0 产品必须回滚。它否定的是治理保证强度，不是全部产品功能或全部历史决定。

### 三柱可靠性矩阵

| 柱 | 作为轻量 checklist | 作为强制治理/对抗性边界 | 结论 |
|---|---|---|---|
| 人类 | 方向、非目标、风险接受记录较完整 | 批准无身份认证、无 payload 绑定、可由 agent 代写 | **流程有参考价值；授权不可靠** |
| agent 集群 | 单 agent 分角色有助于整理职责 | 实际无独立集群；并发写入已复现丢账 | **单代理可用；集群不可靠** |
| 工作区 | 产品/治理分离、证据分级、负记忆、Git 基线较好 | 多状态源手抄、引用不校验、哈希口径不统一、历史可覆盖 | **审计材料部分可用；强一致事实库不成立** |
| 跨柱门禁 | freeze/start 有局部前置检查 | gate/release 不统一执行测试、check、probe，也不验证批准 | **不具备 fail-closed 发布保证** |

## 1. 基线与测试方法

| 检查 | 本次结果 | 解释 |
|---|---|---|
| Git | HEAD `0550b37`，工作树无变更 | 审计后再次确认原仓库未被修改 |
| 产品全量单测 | **tests 169 / pass 169 / fail 0** | 本次主审计实际执行，不只是引用历史摘要 |
| 当前运行探针 | **7/7 PASS**，URL `http://127.0.0.1:60871` | 安装 link、bundle、junction、patch、两条路由符合探针预期 |
| AECW `check` | **FAIL 7 / WARN 0** | 1 个 EOL 哈希假阳性 + 6 个外部坏链 |
| 隔离攻击实验 | closed 重开、蓝图替换、S1 门禁通过、自批准等均复现 | 原项目不受影响 |
| 并发实验 | 32 个 Node 进程：28 个成功、27 行持久化 | 1 条已确认成功的写入丢失；4 个进程读到截断文件；出现重复签发 ID |

### 证据口径

- **已验证**：本次代码/文件直接观察，或隔离实验实际复现。
- **历史主张**：项目文档中的人类口述、旧测试摘要、旧门禁结论；不因写在 E1 栏目就自动成为本次独立事实。
- **静态风险**：代码结构成立但本轮未做完整现实利用，例如浏览器跨源写设置。
- 本报告区分“批准不可认证”与“批准未发生”，区分“哈希不可复现设计”与“内容被篡改”。

## 2. 优异点：应保留而不是推倒重来

1. **方向、非目标与失败定义非常具体。** 价值排序、红线、停止条件和“即使功能齐全，遮挡授权按钮也不算成功”都可执行地指导开发，见 [direction.md:11-35](<task-complete-toast-aecw/aecw/human/direction.md#L11-L35>)、[direction.md:48-67](<task-complete-toast-aecw/aecw/human/direction.md#L48-L67>)。
2. **证据诚实度高于常见“全绿”文档。** E1/E2/E3、作者自验不等于独立复核、截图缺口、已接受遗留均有明示，见 [ledger.md:22-24](<task-complete-toast-aecw/aecw/ledger.md#L22-L24>)、[STATUS.md:23-55](<task-complete-toast-aecw/aecw/STATUS.md#L23-L55>)。发布门也明确“不称全部通过”，见 [release gate:35-51](<task-complete-toast-aecw/aecw/gates/2026-11-05-release-v1.3.0.md#L35-L51>)。
3. **没有虚构多 agent 评审。** 名册直接承认单 agent 兼任、验证者未设，见 [roster.md:5-19](<task-complete-toast-aecw/aecw/cluster/roster.md#L5-L19>)。这是重要优点；问题在实现能力，不在此处隐瞒。
4. **产品与治理物理分离。** 安装目标只指向 `product/`，降低治理文档进入产品包的攻击面和交接歧义，见 [仓库 AGENTS.md:5-10](<task-complete-toast-aecw/AGENTS.md#L5-L10>)。
5. **运行态探针来自真实失败并具备可证伪性。** 它把安装 link/bundle/junction/patch/路由从多轮手工检查收敛为一条命令，失败返回 1，见 [probe.mjs:104-109](<task-complete-toast-aecw/aecw/scripts/probe.mjs#L104-L109>)。当前 7/7 与历史坏 URL 负控 5/7 一致。
6. **负记忆保存得好。** 安装假启用、G2 遮挡、宽松测试桩导致真机崩溃、多文档分叉均被记录并转化为规则，见 [learning.md:10-18](<task-complete-toast-aecw/aecw/cluster/learning.md#L10-L18>)。
7. **零第三方运行时依赖、Git 基线与结构化检查方向合理。** `check` 能抓部分状态、路径、文档头、围栏和坏链；本次正控也确认 `failed` 判据会返回失败，见 [检查正控日志:275-298](<aecw-redteam-cli-agent/logs/check-scenarios.log#L275-L298>)。

## 3. 风险总表

严重度针对“人类约束 agent / 多 agent 共享治理”的威胁模型，不等同于远程 RCE 等级。

| ID | 严重度 | 问题 | 状态 |
|---|---|---|---|
| RT-01 | 高 | 人类批准、验收、S1/S2 裁决可由 agent 自报或代写 | **已复现** |
| RT-02 | 高 | gate/release 不是强制门；开放 S1 仍可“通过”，check 可 exit 0 | **已复现** |
| RT-03 | 高 | closed 可重开、冻结蓝图可替换、历史可覆盖；已有实际范围变更反例 | **已复现 + 历史证据** |
| RT-04 | 高（集群） | 台账无事务/锁/原子写，32 路并发出现重号、丢写和截断读取 | **已复现** |
| RT-05 | 高 | 状态源分叉，生成器与 checker 不兼容，check 对大量伪证据仍 FAIL 0 | **已复现** |
| RT-06 | 中—高 | 运行探针存在假 PASS 面与“只读”语义缺口；设置路由缺少插件层防护 | **已复现；真实浏览器端到端未测** |
| RT-07 | 中 | 哈希未定义字节口径且同清单混用；独立仓库有 6 条外部坏链 | **已验证** |
| RT-08 | 中—高 | 部分 `met` 超出证据，SLA/预算/证据债不可执行 | **历史与代码证据** |
| RT-09 | 中 | 当前状态多处手抄，冗余并持续漂移 | **已验证** |
| RT-10 | 高 | Markdown/ID 类型混淆可伪造状态；跨文件操作可留下半事务 | **已复现** |
| RT-11 | 低—中 | 根路径、异常处理、demo 覆盖等健壮性缺陷 | **部分复现、部分静态** |

## 4. 详细发现

### RT-01 高：人类批准是文本声明，不是授权边界

**代码事实**

- 蓝图批准只检查 `approved` 与一个非空批准人字符串，见 [aecw.mjs:159-169](<task-complete-toast-aecw/aecw/bin/aecw.mjs#L159-L169>)。
- `freeze --charter-confirmed` 只是一个布尔参数；`start --by` 只检查非空，不要求等于所有者，省略时还会自动填入 owner，见 [aecw.mjs:397-425](<task-complete-toast-aecw/aecw/bin/aecw.mjs#L397-L425>)、[aecw.mjs:479-503](<task-complete-toast-aecw/aecw/bin/aecw.mjs#L479-L503>)。
- `resolve`、`accept`、`log` 可直接写裁决/验收/决策，无身份验证；`change --decision 接受` 可在提出时直接接受 charter，见 [aecw.mjs:313-360](<task-complete-toast-aecw/aecw/bin/aecw.mjs#L313-L360>)、[aecw.mjs:570-617](<task-complete-toast-aecw/aecw/bin/aecw.mjs#L570-L617>)。

**隔离复现**

- 用 `red-team-not-owner` 对 closed 的 `grow-2` 下达开工令，exit 0；生成文件明确写下达人及“人类：red-team-not-owner”，见 [重开实验开工令:1-10](<aecw-redteam-main/restart-closed/aecw/gates/2026-11-05-start-order.md#L1-L10>)、[同文件:28-31](<aecw-redteam-main/restart-closed/aecw/gates/2026-11-05-start-order.md#L28-L31>)。
- 单代理创建 charter `CR-006` 并直接置为 `accepted`，但人类、日期、理由均为空，见 [自批准 CR:1-18](<aecw-redteam-main/identity-bypass/aecw/inbox/CR-006.md#L1-L18>)、[同文件:26-30](<aecw-redteam-main/identity-bypass/aecw/inbox/CR-006.md#L26-L30>)。
- 直接以 `meo1102` 名义添加一条无证据验收成功，见 [伪造验收行:14-20](<aecw-redteam-main/identity-bypass/aecw/human/acceptance.md#L14-L20>)。

**影响**

如果 agent 是需要被约束的主体，它可自我授权、自我验收、自我关闭高风险异议。Git 提交人只是身份线索，不能证明“谁批准了哪个不可变蓝图/判据/发布树”。项目也承认早期材料未保留原始 transcript，见 [试点数据:106-112](<task-complete-toast-aecw/aecw/workspace/evidence/试点数据-项目开发过程-2026-11-04.md#L106-L112>)。

**边界**：现有记录可能忠实反映了真实人类指令；本发现是“无法独立认证”，不是“证明批准造假”。

### RT-02 高：门禁与发布主路径 fail-open

**代码事实**

- `gate` 统计开放 S1/S2 后仍照常写文件并 exit 0，不校验决策枚举、事实、签署、check、probe 或测试，见 [aecw.mjs:290-311](<task-complete-toast-aecw/aecw/bin/aecw.mjs#L290-L311>)。
- `check` 对开放 S1/S2 只增加 WARN，不以该条件退出失败，见 [aecw.mjs:720-727](<task-complete-toast-aecw/aecw/bin/aecw.mjs#L720-L727>)、[aecw.mjs:1073-1074](<task-complete-toast-aecw/aecw/bin/aecw.mjs#L1073-L1074>)。
- CLI 没有统一 release 命令；发布 Git 操作不经过这些检查，见 [aecw.mjs:1414-1434](<task-complete-toast-aecw/aecw/bin/aecw.mjs#L1414-L1434>)。

**隔离复现**

- 新增开放 S1 后，`gate --decision 通过` exit 0；门禁同时写着“开放 S1/S2：1 条（阻断高风险）”和“决策：通过”，事实与签署为空，见 [门禁绕过实验:1-14](<aecw-redteam-main/gate-bypass/aecw/gates/2026-11-05-redteam-release.md#L1-L14>)、[同文件:22-43](<aecw-redteam-main/gate-bypass/aecw/gates/2026-11-05-redteam-release.md#L22-L43>)。
- 在排除既有哈希/坏链噪声、并补齐生成器漏写的状态头后，开放 S1 的结构检查为 **FAIL 0 / WARN 1 / exit 0**。
- 独立场景进一步证明：大写 `OPEN` 会被报成“无开放 S1/S2”，见 [check 场景日志:120-166](<aecw-redteam-cli-agent/logs/check-scenarios.log#L120-L166>)。

**影响**

自动系统若只看退出码或门禁文档中的“通过”，会在真实高风险未裁决时放行。`AGENTS.md` 中“探针 FAIL 不得开门禁”目前依赖操作者自律，CLI 并不强制执行。

### RT-03 高：冻结与阶段状态机可绕过，且已有现实反例

**隔离复现**

1. **closed → executing，无新 freeze**：`start` 只拒绝 `executing`，不拒绝 `closed`；只要文件名中存在历史 freeze 即可，见 [aecw.mjs:153-157](<task-complete-toast-aecw/aecw/bin/aecw.mjs#L153-L157>)、[aecw.mjs:489-519](<task-complete-toast-aecw/aecw/bin/aecw.mjs#L489-L519>)。实验中 closed 的 `grow-2` 被直接改为 executing，见 [实验 STATUS:15-21](<aecw-redteam-main/restart-closed/aecw/STATUS.md#L15-L21>)。
2. **冻结后替换蓝图**：将蓝图版本改为 `v999-post-freeze-swap` 后，`start` 仍成功；开工令引用 v999，而 freeze 仍是 v2，见 [替换后开工令:1-10](<aecw-redteam-main/blueprint-swap/aecw/gates/2026-11-05-start-order.md#L1-L10>)、[原冻结门:6-15](<aecw-redteam-main/blueprint-swap/aecw/gates/2026-11-05-charter-freeze.md#L6-L15>)。根因是 freeze 不保存蓝图/宪章/判据的内容哈希，start 信任当前文本。
3. **历史可覆盖**：同日同名 `start-order.md` 被强制覆盖；原文件的历史状态头在实验副本中消失。`gate` 同样以 force 写同名文件，见 [aecw.mjs:307-309](<task-complete-toast-aecw/aecw/bin/aecw.mjs#L307-L309>)、[aecw.mjs:511-546](<task-complete-toast-aecw/aecw/bin/aecw.mjs#L511-L546>)。

**实际历史反例**

- `grow-2` 冻结范围是外观设置，且蓝图明确“不改通知/结果桥逻辑”，见 [charter-freeze:11-20](<task-complete-toast-aecw/aecw/gates/2026-11-05-charter-freeze.md#L11-L20>)、[BLUEPRINT.md:18-29](<task-complete-toast-aecw/aecw/BLUEPRINT.md#L18-L29>)、[BLUEPRINT.md:66-72](<task-complete-toast-aecw/aecw/BLUEPRINT.md#L66-L72>)。
- 时间线显示 15:00 freeze/start 后，15:55 修改了 G2 hidden 与失焦/隐藏通知行为，见 [retrospective:53-68](<task-complete-toast-aecw/aecw/workspace/evidence/2026-11-05-development-retrospective.md#L53-L68>)。
- 变更表只有 CR-001～005，没有这次 G2 行为修复的新 blueprint CR 或第二套 freeze/start，见 [ledger.md:77-85](<task-complete-toast-aecw/aecw/ledger.md#L77-L85>)。

**判断**：修复可能有技术必要性，也可能得到即时人类同意；但按项目自己的规则仍应留下范围变更并重新冻结。该事件证明范围控制不是不可绕过的硬边界。

### RT-04 高（集群）：共享台账在并发下丢数据、重号、损坏

**代码根因**

`fact` 等命令采用“读全文件 → 扫描最大 ID → 修改字符串 → 直接覆盖写回”，没有锁、CAS、唯一约束、原子 rename 或追加日志，见 [aecw.mjs:111-117](<task-complete-toast-aecw/aecw/bin/aecw.mjs#L111-L117>)、[aecw.mjs:273-285](<task-complete-toast-aecw/aecw/bin/aecw.mjs#L273-L285>)。

**独立并发复现**

32 个独立 Node 进程同时执行 `fact`：

- 28 个 exit 0、4 个 exit 1；只有 27 行持久化。
- worker 21 和 worker 23 都输出“F-022 已记录”，见 [worker-21](<aecw-redteam-cli-agent/logs/concurrency/worker-21.log>)、[worker-23](<aecw-redteam-cli-agent/logs/concurrency/worker-23.log>)。
- `unique-fact-23` 被覆盖丢失；共缺 5 条语句，其中 4 条对应失败进程，1 条对应“成功但丢失”。
- 失败进程读到被并发截断的台账，抛出 `section not found`，见 [worker-10](<aecw-redteam-cli-agent/logs/concurrency/worker-10.log>)。
- 完整汇总见 [concurrency-summary.json:1-24](<aecw-redteam-cli-agent/logs/concurrency-summary.json#L1-L24>)；实验脚本未加入人为延迟，见 [concurrency-scenario.mjs:14-32](<aecw-redteam-cli-agent/concurrency-scenario.mjs#L14-L32>)。

主审计较早的 20 进程小试验未撞上竞态；独立 32 进程实验随后明确复现。故结论是“竞态具有时序依赖性，但已被真实复现”，不是每次运行都会失败。

### RT-05 高：状态源与 checker 不能构成可信 SSOT

#### A. 机器状态源名实不符

[AGENTS.md:10](<task-complete-toast-aecw/aecw/AGENTS.md#L10>) 说唯一状态源是 `state.json`、STATUS 是视图；[STATUS.md:7-10](<task-complete-toast-aecw/aecw/STATUS.md#L7-L10>) 与 CLI 帮助/模板却以 STATUS 为当前权威。更关键的是，freeze/start 实际读取并修改 STATUS，却不更新 `state.json`，见 [aecw.mjs:465-472](<task-complete-toast-aecw/aecw/bin/aecw.mjs#L465-L472>)、[aecw.mjs:548-554](<task-complete-toast-aecw/aecw/bin/aecw.mjs#L548-L554>)。因此 `state.json` 是事后对账文件，不是真正的状态机源。

实验重开 closed 后，check 新增 `state.stage` 不一致；这是事后报警，并未阻止状态迁移。

#### B. 生成器与检查器版本脱节

- 全新 `init` 后立即执行自己的 `check`：**FAIL 19**。缺少 PROJECT/state/criteria，且 16 份生成文档缺状态头。生成入口见 [aecw.mjs:193-233](<task-complete-toast-aecw/aecw/bin/aecw.mjs#L193-L233>)，v0.9 必需项检查见 [aecw.mjs:803-818](<task-complete-toast-aecw/aecw/bin/aecw.mjs#L803-L818>)、[aecw.mjs:874-883](<task-complete-toast-aecw/aecw/bin/aecw.mjs#L874-L883>)。
- gate/freeze/start/S1 inbox 的生成内容也没有 checker 要求的状态头；[gate.template.md:1-10](<task-complete-toast-aecw/aecw/core/gate.template.md#L1-L10>) 与 [检查规则:1021-1037](<task-complete-toast-aecw/aecw/bin/aecw.mjs#L1021-L1037>) 直接不兼容。

#### C. check 对语义伪证据大量放行

在校正 EOL 并满足既有外链的隔离绿基线上，下列场景均实测 **FAIL 0 / exit 0**：

| 注入场景 | 结果与证据 |
|---|---|
| freeze/start 文件只剩文件名，无授权语义 | PASS；[日志:26-48](<aecw-redteam-cli-agent/logs/check-scenarios.log#L26-L48>) |
| 不存在的 F ID、不存在的 release.gate | PASS；[日志:72-94](<aecw-redteam-cli-agent/logs/check-scenarios.log#L72-L94>) |
| deferred 的证据、人类裁决、影响门全为 `-` | PASS；[日志:96-118](<aecw-redteam-cli-agent/logs/check-scenarios.log#L96-L118>) |
| 大写 OPEN 的 S1 | 报“无开放 S1/S2”；[日志:144-166](<aecw-redteam-cli-agent/logs/check-scenarios.log#L144-L166>) |
| 冻结后在同版本蓝图追加未授权范围 | PASS；[日志:168-190](<aecw-redteam-cli-agent/logs/check-scenarios.log#L168-L190>) |
| `manifest.commands = {}` | PASS；[日志:192-214](<aecw-redteam-cli-agent/logs/check-scenarios.log#L192-L214>) |
| install.target/workspace root 指向项目外 `..` | PASS；[日志:216-238](<aecw-redteam-cli-agent/logs/check-scenarios.log#L216-L238>) |

这些不是自然语言理解不可能完备的问题，而是 **F 引用、文件路径、占位符、枚举、冻结哈希、命令存在性、根目录包含关系均可做确定性校验却未做**。

此外，checker 硬编码 G4、EV-001、product 路径和项目专属关键词，见 [aecw.mjs:890-969](<task-complete-toast-aecw/aecw/bin/aecw.mjs#L890-L969>)、[aecw.mjs:1056-1069](<task-complete-toast-aecw/aecw/bin/aecw.mjs#L1056-L1069>)，通用框架可移植性有限。

### RT-06 中—高：运行探针可假 PASS，设置写路由缺少插件层防护

#### A. HTTP 两项只认状态码，不识别真实服务

[probe.mjs:85-101](<task-complete-toast-aecw/aecw/scripts/probe.mjs#L85-L101>) 只要求 outcome POST=400、settings POST=400，不校验服务身份、响应 JSON 或插件实例。

- 保持真实 desktop profile 的 5 项文件/链接检查不变，把 GET/POST 指向一个无关 loopback 假服务；该服务对所有请求统一返回 400，最终仍 **7/7、exit 0**，且请求只到假服务，未到 DSH。复现脚本及断言见 [real-install-negative-control.mjs:1-37](<aecw-redteam-probe-agent/real-install-negative-control.mjs#L1-L37>)。这证明的是 HTTP 两项可被冒充，不是把真实 5 项文件检查也说成虚假。
- 完全隔离夹具还可使用空目标目录、注释中的 `# id:`/`# appearance:` 和统一 400 服务获得 7/7，见 [probe-cases.mjs:20-45](<aecw-redteam-probe-agent/probe-cases.mjs#L20-L45>)、[同文件:90-109](<aecw-redteam-probe-agent/probe-cases.mjs#L90-L109>)、[同文件:166-183](<aecw-redteam-probe-agent/probe-cases.mjs#L166-L183>)。后缀路径判断与正则扫文本分别见 [probe.mjs:58-82](<task-complete-toast-aecw/aecw/scripts/probe.mjs#L58-L82>)。
- probe 硬编码默认路由；即使 profile 配置了自定义 routePath，请求仍打默认路径并可 PASS，见 [probe.mjs:12-15](<task-complete-toast-aecw/aecw/scripts/probe.mjs#L12-L15>)、[probe.mjs:24-27](<task-complete-toast-aecw/aecw/scripts/probe.mjs#L24-L27>)、[自定义路由假 PASS:198-216](<aecw-redteam-probe-agent/probe-cases.mjs#L198-L216>)。

**正控与边界**：坏端口会 exit 1，当前真实 GUI 也确实返回了预期 400；因此探针不是“永远假绿”，而是 PASS 的证明力远低于名称给人的印象。EV-001 自己规定“出现 false PASS 即降级/退役，分布外 false PASS 不得推广”，见 [ev-001-runtime-probe.md:35-53](<task-complete-toast-aecw/aecw/workspace/memory/ev-001-runtime-probe.md#L35-L53>)；本次已经实际触发该中止条件，应按原设计处理，而不是把规则继续留在纸面上。

#### B. “只读探针”的语义依赖被测端实现

probe 向写端点 POST `{ "__probe": 1 }`。当前产品因未知字段校验而 400，并在 `save()` 之前返回，所以本次真实探针没有写入，见 [host.js:164-200](<task-complete-toast-aecw/product/lib/host.js#L164-L200>)。但一个统一 400 的假服务已经能记录该 body，见 [side-effect.json](<aecw-redteam-probe-agent/cases/03-post-side-effect/side-effect.json>)；探针自身无法保证其他版本/服务无副作用。

#### C. 设置路由在隔离真实处理器中接受无凭证写

使用真实 `createSettingsHandler`、只把 `save` 替换为隔离文件：

- 无 Authorization、`Origin: https://attacker.invalid`、`Content-Type: text/plain` 的 `{"fontSize":14}` 返回 **200** 并调用 save。
- `{}` 也返回 **200** 并再次调用 save；若用它替代 `__probe`，探针就不再是只读。
- 同一测试的负控确认当前 `__probe` 返回 400 且 save 次数为 0。脚本与断言见 [route-and-url-cases.mjs:14-74](<aecw-redteam-probe-agent/route-and-url-cases.mjs#L14-L74>)，最终隔离保存文件为 `{}`，见 [saved-appearance.json](<aecw-redteam-probe-agent/route-fixture/saved-appearance.json>)。

插件处理器未检查认证、Origin、Host 或 Content-Type，且空 patch 未拒绝。对真实 GUI 的只读 GET 进一步显示：即使带 `Host: attacker.invalid` 与恶意 Origin，自定义 outcome 路由仍返回业务层 `invalid-session-id`，而不是被 `/api` browser-trust fence 拒绝；完整记录见 [探针独立审计:63-74](<aecw-redteam-probe-agent/AUDIT.md#L63-L74>)。这证明自定义 named route 不走该 fence，但仍不等于浏览器写利用已成功。

当前字段只允许字号、宽度和颜色，并有范围/对比度校验，因此本轮证明的是**未授权持久化外观修改**，不是任意代码执行。主审计没有向真实 GUI 发送合法写请求；真实浏览器 PNA/CORS 的端到端可达性也未测试，不能宣称已完成浏览器 CSRF 利用。outcome 在持有有效 sessionId 时也有最小元数据暴露面，本轮未读取有效会话结果。鉴于这些路由越过统一信任边界，仍应在下一次发布前修复，而不是依赖浏览器碰运气。

#### D. URL、路径与快照绑定

隔离实验还复现：任意 URL 可触发请求、fragment/query 可使拼接后的目标路径偏离预期、307 可跨源跟随、profile 可用 `../..` 指向 DSH_HOME 外、探针通过后修改 profile 不会使旧 PASS 自动失效。相关实现/断言见 [probe-cases.mjs:110-163](<aecw-redteam-probe-agent/probe-cases.mjs#L110-L163>)、[同文件:184-216](<aecw-redteam-probe-agent/probe-cases.mjs#L184-L216>)。任意 URL/profile 在可信本地操作者模型中主要是误用风险；若自动化把参数暴露给低信任输入，则会成为 SSRF/越界读取面。

另一个相邻配置风险是 `bridge.routePath` 接受 `//host/path` 形式的 network-path reference；浏览器会把它解析为跨源 URL，并把 sessionId 放入 query。隔离客户端测试已证明该解析结果，见 [route-and-url-cases.mjs:79-109](<aecw-redteam-probe-agent/route-and-url-cases.mjs#L79-L109>)。利用前提是能影响 bridge 配置，不能与本节的 appearance 写路由混为一谈。

EV-001 回滚也未闭环：方案只写删除脚本/提案/台账/证据，却不同步 AGENTS、PROJECT、STATUS/state/criteria；直接删脚本反而会使 check 因命令文件缺失而 FAIL，删除历史证据也不当，见 [回滚方案:43-47](<task-complete-toast-aecw/aecw/workspace/memory/ev-001-runtime-probe.md#L43-L47>)。应保留 superseded 证据并回滚整个变更集，在克隆 profile 上演练，而非第一次就在真实唯一 profile 操作。

**整改方向**：探针改为专用只读 health/dry-run 端点，校验服务/插件/版本/实例标识与预期响应；严格解析 URL、拒绝 query/fragment/跨源重定向，比较 canonical realpath 而非后缀，解析配置而非扫注释；把探针结果与 profile/tree hash 和时间绑定到 verify。写路由增加宿主级认证/CSRF 能力、Origin/Host allowlist、`application/json` 要求、非空 patch 与速率限制，并在克隆 profile 做完整跨源和回滚演练。

### RT-07 中：证据字节口径不可稳定复现，独立仓库并不自包含

#### A. 当前 `check` 的 1 个哈希 FAIL 是 EOL 假漂移

检查器直接散列 checkout 字节，见 [aecw.mjs:853-870](<task-complete-toast-aecw/aecw/bin/aecw.mjs#L853-L870>)。本机 `core.autocrlf=true`，无 `.gitattributes`，所查文件为 index LF / worktree CRLF：

- `aecw.mjs` Git blob（LF）SHA-256 = `B9F3AA…`，与 [PROJECT.json:21](<task-complete-toast-aecw/PROJECT.json#L21>) 一致。
- 同一内容的 CRLF 工作区 SHA-256 = `88ADAD…`，因此 check 报漂移。

这是哈希 canonicalization 缺陷，不是源码被修改的证据。

#### B. 同一发布哈希清单混用了 LF 与 CRLF

| 文件 | 发布记录对应口径 | 本次核验 |
|---|---|---|
| `package.json` | LF blob = `C33D73…` | CRLF 工作区 = `5E320F…` |
| `lib/config.js` | LF blob = `7D11DC…` | CRLF 工作区 = `18C4AF…` |
| `lib/host.js` | LF blob = `0FC37D…` | CRLF 工作区 = `6DFF3D…` |
| `index.js` | LF blob = `7D90BC…` | CRLF 工作区 = `2CC1DF…` |
| `client.js` | **CRLF 工作区** = `351080…` | **LF blob** = `F16DB7…` |

前四项与 [release evidence:31-35](<task-complete-toast-aecw/aecw/workspace/evidence/2026-11-05-release-v1.3.0.md#L31-L35>) 在 LF 口径一致，client 则在 CRLF 口径一致。故不是造假，而是同清单算法/字节基准未声明且混用。

#### C. 6 条真实外部坏链

当前 FAIL 的其余 6 项来自指向仓库外 `agent-engineering-control` 的链接，例如 [v09-calibration:5](<task-complete-toast-aecw/aecw/workspace/evidence/2026-11-05-v09-calibration.md#L5>)、[charter original:10](<task-complete-toast-aecw/aecw/workspace/evidence/charter-v1.0-original.md#L10>)、[接手测试:7](<task-complete-toast-aecw/aecw/workspace/evidence/接手测试-2026-11-04.md#L7>)、[试点数据:9](<task-complete-toast-aecw/aecw/workspace/evidence/试点数据-项目开发过程-2026-11-04.md#L9>)。独立迁移后这些目标不存在，审计材料不完全自包含。

**时间边界**：这些事实说明“当前无法按声明复现为 FAIL 0”，不证明历史执行时一定没有 PASS；但 E1“可复现”的环境与字节前提没有被记录和固定。

### RT-08 中—高：验收、SLA、预算与证据债未形成闭环

#### A. 已有 `met` 超出证据的反例

- WP-4 要求“刷新/重启后仍生效”，见 [BLUEPRINT.md:39](<task-complete-toast-aecw/aecw/BLUEPRINT.md#L39>)、[design-contract:220-224](<task-complete-toast-aecw/aecw/workspace/memory/design-contract-v1.2.0.md#L220-L224>)。阶段门承认“刷新仍保留未单独记录真机证据”，见 [grow-2 gate:35-43](<task-complete-toast-aecw/aecw/gates/2026-11-05-grow-2.md#L35-L43>)，但 [criteria.md:28](<task-complete-toast-aecw/aecw/criteria.md#L28>) 仍整体记为 `met`。写入 patch 证明写路径，不等于读取/重载闭环已验。
- G1 成功定义含 P95 ≤500 ms，见 [direction.md:16-18](<task-complete-toast-aecw/aecw/human/direction.md#L16-L18>)，原始 G1 记录是 5 项功能目视，无延迟样本或 P95 计算，见 [真机结果:41-51](<task-complete-toast-aecw/aecw/workspace/evidence/真机验收结果-2026-11-04.md#L41-L51>)。应拆成“功能路径 met / 延迟指标未验”，而非整体覆盖。
- G4 独立发现入口的判据曾在证据不足时写成 met，校准后才修正，并明确不追溯重评发布门，见 [v09-acceptance:73-81](<task-complete-toast-aecw/aecw/workspace/evidence/2026-11-05-v09-acceptance.md#L73-L81>)。

#### B. 发布债规则作用域冲突

[release.md:4](<task-complete-toast-aecw/aecw/cluster/release.md#L4>) 写“证据债未清或人类未签，不得发布”，同文件却已发布且 adoption 仍 provisional，见 [release.md:8-17](<task-complete-toast-aecw/aecw/cluster/release.md#L8-L17>)；发布门称 ED-003/004 不阻塞，见 [release gate:30-44](<task-complete-toast-aecw/aecw/gates/2026-11-05-release-v1.3.0.md#L30-L44>)。可以将其解释为“只有 product-impact 债阻塞产品发布”，但该作用域没有形式化，执行器无法可靠判断。

#### C. SLA 和预算只是自然语言

S1/S2 时限、15 有效回合、≤2h/周、连续两道门失败等没有计数器、带时区的精确事件时间、工作日历或自动到期处理。运行记录明确“人类决策问答未计时”，见 [runs.md:32-35](<task-complete-toast-aecw/aecw/cluster/runs.md#L32-L35>)。ED-003/004 截至审计日尚未到期，不能指控失约；问题是到期也不会自动阻断。

### RT-09 中：真正冗余的是“手写当前状态”，不是历史证据

同一 release/version/tests/debt 被反复手抄到 `state.json`、STATUS 摘要块、STATUS 正文、criteria、board、runs、release、gates、release evidence、landing manifest、decisions、acceptance、ledger、README。历史快照、原始证据、ADR 与人类决定各有用途，不应删除；应消除的是**多份可手工编辑的当前真值**。

当前仍在漂移的实例：

- [g4-charter-impact.md:3-7](<task-complete-toast-aecw/aecw/workspace/memory/g4-charter-impact.md#L3-L7>) 标 `current` 却写“未批准、direction 仍 v1.1”，与已批准 G4 冲突。
- [workspace/work/README.md:7-12](<task-complete-toast-aecw/aecw/workspace/work/README.md#L7-L12>) 仍要求产品文件位于仓库根、阶段为 `steward-1`，违背当前 product/ 分离与 grow-2 closed。
- [history-mapping.md:8-17](<task-complete-toast-aecw/aecw/workspace/memory/history-mapping.md#L8-L17>) 的“当前答案”仍为 v1.2/160。
- [appearance-settings-design.md:9-16](<task-complete-toast-aecw/aecw/workspace/memory/appearance-settings-design.md#L9-L16>) 写颜色待确认，[同文件:31](<task-complete-toast-aecw/aecw/workspace/memory/appearance-settings-design.md#L31>) 写持久化未定，但 [同文件:5-7](<task-complete-toast-aecw/aecw/workspace/memory/appearance-settings-design.md#L5-L7>) 已拍板并实现。
- [board.md:31](<task-complete-toast-aecw/aecw/cluster/board.md#L31>) 将截图债写 `deferred`，而 [state.json:68-86](<task-complete-toast-aecw/aecw/state.json#L68-L86>) 与 criteria 已为 `waived`。

v0.9 曾在结构绿灯时人工发现并修复 13 处矛盾，见 [v09-acceptance:57-80](<task-complete-toast-aecw/aecw/workspace/evidence/2026-11-05-v09-acceptance.md#L57-L80>)。当前上述实例证明“状态头 + 少量关键词”没有解决根因。

### RT-10 高：Markdown/ID 类型混淆可伪造状态，跨文件操作可留下半事务

**Markdown 与标题注入（已复现）**

- 表格字段未转义 `|`/CR/LF。S1 claim 为 `bad | injected` 后，resolve 将列写错位，最终 gate 报“开放 S1/S2：0”，见 [注入实验日志:211-240](<aecw-redteam-cli-agent/logs/cli-scenarios-utf8.log#L211-L240>)。
- gate name 中的换行可在文件前部注入另一行“决策：通过”，而后文真实决策仍是“退回补证”，见 [同日志:242-257](<aecw-redteam-cli-agent/logs/cli-scenarios-utf8.log#L242-L257>)。这是治理文档/状态伪造，不是 Web XSS。
- 相对路径 `../../outside` 经 slug 后仍留在 gates 内，是一个有效正控；不能因为路径安全就忽略内容注入。

**ID 与类型混淆（已复现）**

- `change --id DR-001 --decision 接受` 可把 S2 异议改成 accepted；`resolve --id CR-001` 又可把 charter 变更改成 closed。两个命令只按 ID 和固定列改行，没有限定正确表与记录类型，见 [跨类型日志:166-188](<aecw-redteam-cli-agent/logs/cli-scenarios-utf8.log#L166-L188>)。
- `nextId` 扫描整个 ledger 的自由文本；普通陈述只提到 F-999，下一条事实就分配 F-1000，见 [同日志:221-234](<aecw-redteam-cli-agent/logs/cli-scenarios-utf8.log#L221-L234>)。
- `accept` 省略接受者时甚至可写入“人类所有者（待补）”并 exit 0，见 [占位验收日志:190-201](<aecw-redteam-cli-agent/logs/cli-scenarios-utf8.log#L190-L201>)。

**半事务（已复现）**

dissent 先写 ledger，再写 inbox；第二次写入因 EISDIR 失败后，命令 exit 1，但开放 S1 行已经留在 ledger，见 [部分写入日志:259-292](<aecw-redteam-cli-agent/logs/cli-scenarios-utf8.log#L259-L292>)。多文件操作没有回滚或 journal，调用者无法把“命令失败”理解为“没有改变状态”。

### RT-11 低—中：其他健壮性与完整性缺陷

- 畸形百分号链接会让 `decodeURIComponent` 抛出未捕获 `URIError`，而不是生成受控检查结果；虽然 exit 1、属于 fail-closed，但排障体验差，见 [异常日志:240-273](<aecw-redteam-cli-agent/logs/check-scenarios.log#L240-L273>)。
- `demo` 无论是否传 `--force` 都会递归删除既有 demo 目录，见 [aecw.mjs:1343-1348](<task-complete-toast-aecw/aecw/bin/aecw.mjs#L1343-L1348>)。目标路径固定且有越界检查，不是任意路径删除，但仍可能意外清除实验产物。
- 约 335 行硬编码 demo 与真实 CLI 混在同一文件，约占整个 CLI 的五分之一，增加状态文案和维护重复；应移到独立 examples/tests fixtures。
- gate/accept/fact 的 decision/status 缺完整枚举和证据校验；freeze 可在 executing 中直接重冻结，且 scope/budget/stop/acceptance 可全部为占位符，见 [状态实验日志:90-129](<aecw-redteam-cli-agent/logs/cli-scenarios-utf8.log#L90-L129>)。

## 5. “冗余环节”具体处置建议

### 应保留，不属于无效冗余

- 人类 direction 与阶段 blueprint：前者约束为什么/不做什么，后者约束本阶段怎么做。
- 原始证据、历史门禁、ADR、决策与验收：它们回答不同问题，应该不可变留痕。
- 产品测试、结构 check、运行 probe：验证层级不同；需要的是统一编排，不是三选一。

### 应删除手抄、改为生成视图

1. **当前状态**：只写 `state.json` 或结构化事件库；STATUS、board、release、README 当前徽章由工具生成且不可手改。
2. **事实与变更**：用 JSONL/结构化存储保存唯一 ID、时间、作者、引用与哈希；Markdown ledger 仅为渲染视图。
3. **发布证据**：由一个 `verify-release` 生成唯一 attestation，其他文档只引用其 ID，不复制测试数、哈希、豁免状态。
4. **命令入口**：保留一个 `verify`，内部编排测试/check/probe，避免 README、AGENTS、manifest 各自维护不同命令。
5. **demo**：移出生产 CLI，使用独立测试夹具，避免硬编码测试数和项目特定状态再次漂移。

## 6. 修复优先级与验收门槛

### P0：在宣称下一次治理门/发布可靠之前完成

1. **建立唯一 fail-closed 的 `verify-release`。** 自动执行并记录：开工树、发布树、范围 diff、criteria、开放 S1/S2、按 impact 分类的 debt、check、probe、完整测试、独立复核。任一失败即非零退出；`gate` 只能消费成功的验证结果，不能凭 `--decision 通过` 放行。
2. **批准与 payload 绑定。** 批准内容至少含 project、stage、蓝图/判据版本、开工树/发布树 hash、决定、逐项 waiver、到期时间、时间戳和批准者身份。用人类持有的签名能力或不可变、可引用的人类确认通道；禁止 agent 凭 `--by` 自签。
3. **修状态机与冻结。** 明确 `seed → frozen → executing → closed`，closed 默认终态；新阶段必须有新 ID/freeze。freeze 保存 direction/blueprint/criteria/tree 的规范化哈希，start 逐项验证；历史门使用唯一 ID，禁止覆盖。
4. **修共享存储。** 采用事务性结构化存储或至少 lockfile + CAS + 原子 rename + 唯一约束；ID 由存储原子分配，多文件写入使用 journal/回滚。以 32 路并发回归：不得出现成功丢写、重复 ID、截断读取；inbox 写失败不得留下未说明的半条 ledger。
5. **开放 S1/S2 必须阻断。** check 应为 FAIL；`OPEN` 等等价大小写应统一规范化；不能仅 WARN。Markdown 只作为渲染层，严格限定 DR/CR/F 的 section 与类型，拒绝控制字符和列注入。
6. **收口设置写路由与探针。** 写路由先补认证/CSRF/Origin/Host/Content-Type 防护并拒绝空 patch；探针不得再把“任意服务返回 400”当插件健康证明。修复前暂停把 EV-001 PASS 作为发布可信证据。

### P1：恢复证据可信度与最小独立制衡

1. **统一 SSOT 和生成器版本。** `init → freeze → start → gate → check` 必须端到端绿色；所有生成文档满足 checker 自己的状态头/schema。去除 G4/EV-001 等硬编码，或明确声明这是项目专属 fork。
2. **补确定性引用校验。** 验证 F/DR/CR 是否存在、release.gate 是否存在、deferred/waived 是否有真实人类决定/到期/影响、commands 是否存在且可执行、roots/install 不得逃逸项目根。
3. **统一证据字节。** 添加 `.gitattributes` 固定 EOL；声明并统一使用 `git-blob-LF` 或固定 checkout 字节，优先从 tag 原始 blob 生成发布清单。重发产品哈希，消除 client 的混合口径。将外部依据 vendored 到仓库或改为持久可寻址引用，先清 6 条坏链。
4. **每次高影响发布至少一个真正非作者 reviewer。** 新鲜上下文、只读原始证据、记录独立 agent/session id、输入哈希、发现和结论。一个真实 reviewer 比同 agent 兼任五个角色更有效。
5. **追溯修正当前判据。** 补做 WP-4 刷新/重启读取验证；G1 P95 没有样本就标未验；补登 G2 范围变化并由人类重新确认；发布/采纳/进化债按 impact 明确分离。

### P2：降低长期维护成本

- 清理 current 文档漂移，把历史方案标 historical，不再手抄版本和债务状态。
- 将 SLA、有效回合、人类分钟、连续失败数、waiver expiry 变成结构化状态与自动提醒/阻断。
- 统一输入 schema、Markdown 转义和异常处理；demo 必须显式 `--force` 才允许删除。
- 本轮未证明需要撤回 v1.3 产品；最小收口是先停止宣称当前 check FAIL 0，再恢复可复现证据和可验证 adoption 签署。

## 7. 修复后必须通过的红队回归

- 非所有者 `start --by`、agent 自批准 charter、agent 代写人类验收：全部拒绝。
- closed 无新 freeze 重开、冻结后蓝图任一字节变化、同名历史覆盖：全部拒绝。
- 开放 S1/S2、空授权门、伪 F 引用、缺失 release.gate、全 `-` deferred、空 commands、路径逃逸：全部 FAIL 且非零退出。
- Markdown 列/换行注入、DR/CR 跨类型裁决、自由文本伪 F ID、inbox 第二步写失败：不得伪造状态或留下半事务。
- 32 路及以上并发写：所有成功记录均持久化，无重号、无丢失、无损坏；失败必须明确且可重试。
- 干净 Windows/Linux checkout 在同一 Git tree 上得到同一哈希和同一检查结果。
- 无关 400 假服务、默认路由冒充、自定义 routePath、query/fragment/跨源重定向不得得到探针 PASS；恶意 Origin、无凭证、text/plain、空 patch 的写请求必须被拒绝。
- `init` 生成的项目可按文档演进至 check PASS；所有生成器输出都能通过自己的检查。
- WP-4 有刷新/重启读取证据；P95 有样本与计算，或判据明确保持未验。

## 8. 本轮限制

- 范围仅限此仓库内 vendored AECW v0.9.0，不外推其他版本或原始原型机。
- 未重放历史真机目视，所有零截图 E2 仍只是历史人类口述 + 代理记录。
- 未对其他 DSH 版本、其他 profile、分布式多主机、断电恢复做验证。
- 未对真实 profile 发送合法设置写入，也未执行浏览器跨源利用；真实 GUI 的端到端写风险仍属边界发现，但隔离真实处理器的无凭证写行为已动态复现。
- 本审计使用多个独立子 agent 交叉复核，但这种审计能力是当前外部红队提供的，不是被审框架自身已经具备的能力。

## 9. 最终回答

**三柱模式不是错误方向，错误在于把“分栏记录”误当成“职责分离”，把“文档门禁”误当成“强制执行”，把“多份手抄状态”误当成“单一事实源”。**

当前最可靠的是价值排序、负事实、产品/治理分离和局部运行探针；最薄弱的是人类批准认证、集群并发一致性、冻结/发布强制力。先补这些硬边界，再扩展 agent 数量；否则更多 agent 只会更快地产生重号、丢账和相互矛盾的“已通过”文档。
