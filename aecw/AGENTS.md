# AGENTS.md · task-complete-toast（AECW 治理）

> 状态：current｜最后核对：2026-11-06

本目录是 AECW 治理结构；**产品代码在仓库根 `../`（`package.json`/`index.js`/`client.js`/`lib/`/`locale/`/`test/`）**，不在这里。仓库级约定见 [`../AGENTS.md`](../AGENTS.md)。
产品代码基线 = v1.3.0（已发布；当前工作树为 **1.3.1 安全候选**，未发布）；本项目于 2026-11-05 从原件复制并按 `agent-engineering-control/prototype` 结构重排，**产品逻辑未改**；同日按人类指令更新介绍文案与回归断言（F-031/F-032），后续在 `grow-2` 完成 G4 与 G2 遮挡修复并发布 1.3.0；当前阶段 `security-1` 做 P0-6 安全收口。

## 开工前

0. 先读 [`../PROJECT.json`](../PROJECT.json) → [`STATUS.md`](STATUS.md) → [`state.json`](state.json) → [`criteria.md`](criteria.md)。**唯一状态源是 `state.json`；`STATUS` 是视图**；其他文档是证据/历史，冲突时以 state + STATUS 摘要为准。
1. 读 [`human/direction.md`](human/direction.md)——方向/边界/S1–S4/停止（继承试点宪章 v1.0）。
2. 读 [`BLUEPRINT.md`](BLUEPRINT.md)——阶段 `security-1`（P0-6 安全收口，v3 approved）；`grow-2` 已 closed，蓝图 v2 归档在 `workspace/evidence/blueprint-v2-grow-2.md`。
3. 读 [`ledger.md`](ledger.md)、最近的 [`gates/`](gates/)；设计契约与 ADR 在 [`workspace/memory/`](workspace/memory/)；原始证据在 [`workspace/evidence/`](workspace/evidence/)。
4. 旧文档编号（D-001/D-002、旧 G2-6、`8D034A…`）先查 [`workspace/memory/history-mapping.md`](workspace/memory/history-mapping.md)，不要按字面理解。
5. **门禁/交付前跑运行态探针**：`node scripts/probe.mjs`（EV-001，2026-11-05 激活）。FAIL 则停，不进入门禁；它只做只读结构检查，不替代真机/人工验收。

## 硬约束

- **产品/治理分离**：产品代码只改仓库根（`../`）；本目录只放治理/工具。不要把产品源码/测试放进 `aecw/`。
- **只告知**：不批准/拒绝/确认/回复，不点击工具，不改会话状态，不向 agent 注入消息或信号。
- **只读最小元数据**：显示名、会话 id、状态、outcome、时间；不读消息正文、工具参数、文件内容、模型输出、密钥。
- **零第三方运行时依赖、无构建链**；不修改 DSH 源码/安装目录；不联网外发、不做遥测。
- **不写 localStorage/IndexedDB/cookie**；不持久化通知历史；不跨工作区/用户泄漏。
- **不跳过门禁**：没有 `freeze` 不 `start`；没有 `start` 不执行阶段任务；阶段结束必须停、报告、等下一道门。
- **门禁前探针**：`node scripts/probe.mjs` FAIL 时不得开门禁/交付；探针 PASS 也不能替代人类真机与截图。
- **不原地改冻结基线**：方向/蓝图/验收变更走 `change`，升版本 + 影响分析 + 人类裁决；新版本重新 freeze/start。
- **未开工前不改产品代码**：`freeze` + `start` 之前只做只读/规划；开工后按蓝图工作包改代码，不在 `grow-2` 内静默扩范围。
- **UTF-8 纪律**：改文件用编辑器或显式 UTF-8；写回后断言无 `U+FFFD`。不要用 PowerShell 默认编码改写中文文件。
- **测试桩按真实签名抛错**：不得比真实宿主宽松（历史两次真机崩溃的教训）。
- **未测就写未测**：E2 不得写成 E1；禁止「全绿」话术；没有截图就标“证据缺口”。
- **动作完成 = 状态写回**：任何改变布局/安装/版本/tag/发布/远程/配置的动作，完成后先更新 `state.json` + `STATUS` + 证据，再回复；只做动作不写回视为未完成。`state.layout` / `state.install` 与 `PROJECT.json` 不一致时 `check` FAIL。
- **check 不是授权**：`check` 只做结构/一致性检查；开放 S1/S2 现在直接 FAIL。不得把 `check` 0/0 当作门禁/发布可靠证明。
- **verify 是唯一通过类证据**：`verify` 跑 `check --strict`、probe、完整测试、criteria、开放 S1/S2、按 impact 分类的证据债，并写 `workspace/evidence/attestations/VA-*.json`；attestation 失败/过期/tree 不一致时 `gate` 拒绝。通过类门禁只能引用 attestation。
- **冻结/开工是哈希边界**：`freeze` 写 direction/blueprint/criteria/product 的 canonical hash；`start` 重算并逐项比对，任一字节变化即拒绝。`closed` 是终态，重开必须新 stage id + 新 freeze。
- **人类身份最小绑定（L 模式）**：S1/S2 的 `resolve`、`accept`、charter/blueprint 裁决、`start`、`pause/resume/close` 必须由 `state.owner` 具名执行（`--by`）；这是记录边界，不宣称抗伪造。agent 不得代写人类验收或自批 charter。

## 测试

```powershell
# 门禁前运行态探针（EV-001，只读；从 aecw/ 运行）
node scripts/probe.mjs

# 治理 CLI 回归（S1+S2+S3 红队；从 aecw/ 运行）
node --test --test-isolation=none test/cli-s1.test.mjs test/cli-s2.test.mjs test/cli-s3.test.mjs

# 全量单测（产品代码在仓库根）
cd ..
node --test --test-isolation=none test/smoke.test.js test/integration.test.js test/store.test.js test/format.test.js test/dismiss.test.js test/notifier.test.js test/resolver.test.js test/wiring.test.js test/presentation.test.js test/interaction.test.js test/security.test.js
cd aecw
```

期望 `tests 174 / pass 174 / fail 0`（产品）+ `tests 20 / pass 20`（治理 S1+S2+S3）。受限沙箱内**必须** `--test-isolation=none`（默认模式 spawn EPERM）。

## AECW CLI

```powershell
node bin/aecw.mjs status .
node bin/aecw.mjs check .
node bin/aecw.mjs check . --strict
# 唯一通过类证据：失败/过期/tree 变化都会被 gate 拒绝
node bin/aecw.mjs verify . --reviewer <评审者> [--reviewer-session <id>] [--gate release|adoption|evolution|stage]
# 阻断/补证类门禁：可直接生成
node bin/aecw.mjs gate . --name <门禁名> --decision 退回补证
# 通过类门禁：必须 verify attestation + 人类签署
node bin/aecw.mjs gate . --name <门禁名> --decision 通过 --attestation <verify.json> --signed-by meo1102
node bin/aecw.mjs fact . --statement "..." --source "..." --status 已核验 --verifier "..."
node bin/aecw.mjs dissent . --severity S2 --type 风险 --claim "..." --evidence "..."
node bin/aecw.mjs change . --type task|blueprint|charter --title "..." --reason "..." --impact "..."
node bin/aecw.mjs freeze . --charter-confirmed --stage <新阶段> --scope ... --budget ... --stop ... --acceptance ...
node bin/aecw.mjs start . --by meo1102 --first-report "..."
node bin/aecw.mjs pause . --by meo1102 --reason "..."
node bin/aecw.mjs resume . --by meo1102
node bin/aecw.mjs close . --by meo1102 --decision 有条件通过 --gate gates/<阶段门禁>.md --reason "..."
```

## 完成定义

- 行为变更：先改 [`workspace/memory/design-contract-v1.2.0.md`](workspace/memory/design-contract-v1.2.0.md) 与 [`workspace/memory/adr-001-023.md`](workspace/memory/adr-001-023.md)，再改代码与测试。
- 证据：事实写进 `ledger.md`（F 编号）；阶段结束更新门禁；验收必须列失败/未测项。
- 基线：阶段结束提交 commit/tag，记录源码/测试哈希与验收基线版本。
- 当前发布口径：v1.3.0（G1/G2/G3 + G4 + G2 遮挡修复）；工作树为 **1.3.1 安全候选（未发布）**；截图/录屏要求人类挂起；G2-8、G3-4b 等已知未测见 `STATUS.md` §3/§4，不写「全绿」。
- 每道门/发布先更新 `STATUS.md`，再更新其他文档；旧文档标 `SUPERSEDED`。
