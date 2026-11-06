# AECW 精简化 · 结果（W6）

> 状态：current｜日期：2026-11-06｜技术验收：agent 自验；**人类最终验收：已接受（DR-2026-11-06-aecw-0.10.0）**

## 1. 结构结果

| 项 | 基线 | 结果 |
|---|---|---|
| 当前手写状态/视图 | 6 | **2 个当前源**：`state.json` + 生成 `STATUS.md`；`criteria.md` 是生成阻塞视图（非第二源） |
| 旧当前视图 | board/release/manifest/BLUEPRINT/criteria | 全部归档到 `workspace/archive/`，只读 |
| 1.3.1 发布门 | 2 个 gate（final 正文为空） | **1 个 release decision**：`DR-2026-11-06-1.3.1`（回填；新树 verify + 旧完整 gate/final/f82564 证据） |
| 活 criteria 行 | 32 | **9 行**（release conditions；W6 验收已由独立 acceptance decision 记录） |
| gate 空模板 | 可生成 | `gate` 仅提示 `decide`，**不生成文件**（exit 2） |
| 证据债 ID | 4（SEC/G1/WP 不在 state） | 9 条 decision.conditions；due 可见；未再拆债务 ID |
| 人类预批 | 每阶段/门 | 本批次 **0 次中途预批**；最终验收 **已接受**（meo1102，DR-2026-11-06-aecw-0.10.0） |
| 假 PASS 负控 | 1 个已发现（空 final gate） | 10 个治理测试覆盖空 decision/漂移/伪造路径/高风险缺 residual/11 条件/tree 变化/gate 别名/E2 无人类/L2 无 freeze/32 路并发 |

## 2. 验证

```text
产品 tests 174 / pass 174 / fail 0
治理 tests 10 / pass 10 / fail 0
check       FAIL 0｜WARN 0
probe       7/7
verify      PASS VA-20261106092535-22f506（tree 27062119…，product 0C2B9946…，check/probe/tests/governance 全 pass）
decisions   2（release 1.3.1 + AECW 0.10.0 acceptance）
```

- 新 verify 绑定：tree、state hash、product hash、check/probe/tests/governance 日志哈希、reviewer/session、expires；产品哈希已 LF 归一，与 1.3.1 release evidence 的 `0C2B9946…` 对齐。
- L2：high risk 非回填 decision 要求 stage frozen/active + freeze tree + `independent` verify；无 freeze/self verify 被测试拒绝；1.3.1 是显式 `backfilled` 例外。
- 并发：写命令统一 `.aecw-lock`；32 路并发 `evolve propose` 测试通过（32 候选/32 ledger，无丢写/重复/截断）。
- decision 绑定：新 verify + 旧 `fd647e` + 旧完整 gate `0700071129` + final gate（空正文，保留为历史缺陷）+ `f82564` + release evidence + 独立 review；`facts`/`evidence`/`human`/`conditions`/`residual_risk` 非空。
- 高风险 decision 有 `independent_review`（fresh-context `2026-11-06-independent-review.md`，conditional）；risk 与 attestation/state 一致，release 强制 high。
- `STATUS.md`/`criteria.md` 由 `render` 生成；`check` 对漂移 FAIL；`state.release.state=conditional`。

## 3. 未达/未测（不虚构）

- **人类分钟/变更**：未 instrument；没有可比的 3 个真实变更，故不声称下降 ≥30%。
- **L1 自主完成率**：本批次由 agent 完成实现/测试/记录，但没有 3 个独立 L1 变更样本；不声称 ≥70%。
- **人类最终验收**：已由 `DR-2026-11-06-aecw-0.10.0` 记录（meo1102，2026-11-06 会话“接手/接受”）；1.3.1 decision 的 human 仍是原发布回填，两者分开记录，不混写。
- **W6 定量指标**：人类分钟/变更、L1 自主率仍未测量；验收不改变“未测”事实，只表示人类接受当前结果/残留。
- **独立 reviewer**：本轮 verify 的 reviewer 是 `aecw-simplify`（agent/self）；1.3.1 是 `backfilled` 例外，额外绑定 fresh-context 独立 review `2026-11-06-independent-review.md`（verdict conditional）。非回填 high risk 现在强制 `--independent` verify + freeze；1.3.1 不重跑为独立 verify。
- **产品已知缺陷**：`routePath` 外部解析、settings 限速先于鉴权、G4 compact+大字 auto 宽度仍未修；本批次不改产品。
- **远程**：`main`/`v1.3.1` 未推送，凭证缺失。

## 4. 回滚

- tag `pre-simplify-2026-11-06` @ `06ca61c`。
- 旧工具/旧 gates/旧测试在 `workspace/archive/`；不删除。
- 任一机制不达标可整体回到 pre tag；不要只回滚一半。
