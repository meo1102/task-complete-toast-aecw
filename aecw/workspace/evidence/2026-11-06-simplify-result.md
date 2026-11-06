# AECW 精简化 · 结果（W6）

> 状态：current｜日期：2026-11-06｜技术验收：agent 自验；**人类最终验收：pending**

## 1. 结构结果

| 项 | 基线 | 结果 |
|---|---|---|
| 当前手写状态/视图 | 6 | **2 个当前源**：`state.json` + 生成 `STATUS.md`；`criteria.md` 是生成阻塞视图（非第二源） |
| 旧当前视图 | board/release/manifest/BLUEPRINT/criteria | 全部归档到 `workspace/archive/`，只读 |
| 1.3.1 发布门 | 2 个 gate（final 正文为空） | **1 个 decision**：`DR-2026-11-06-1.3.1`（回填；新树 verify + 旧完整 gate/final/f82564 证据） |
| 活 criteria 行 | 32 | **10 行**（含 W6 人类最终验收；由 decision.conditions 生成；≤10） |
| gate 空模板 | 可生成 | `gate` 仅提示 `decide`，**不生成文件**（exit 2） |
| 证据债 ID | 4（SEC/G1/WP 不在 state） | 9 条 decision.conditions；due 可见；未再拆债务 ID |
| 人类预批 | 每阶段/门 | 本批次 **0 次中途预批**；最终验收 pending |
| 假 PASS 负控 | 1 个已发现（空 final gate） | 8 个治理测试覆盖空 decision/漂移/伪造路径/高风险缺 residual/11 条件/tree 变化/gate 别名/E2 无人类 |

## 2. 验证

```text
产品 tests 174 / pass 174 / fail 0
治理 tests 8 / pass 8 / fail 0
check       FAIL 0｜WARN 0
probe       7/7
verify      PASS VA-20261106090844-72e33e（tree 277E29F5…，product 0C2B9946…，check/probe/tests/governance 全 pass）
```

- 新 verify 绑定：tree、state hash、product hash、check/probe/tests/governance 日志哈希、reviewer/session、expires；产品哈希已 LF 归一，与 1.3.1 release evidence 的 `0C2B9946…` 对齐。
- decision 绑定：新 verify + 旧 `fd647e` + 旧完整 gate `0700071129` + final gate（空正文，保留为历史缺陷）+ `f82564` + release evidence + 独立 review；`facts`/`evidence`/`human`/`conditions`/`residual_risk` 非空。
- 高风险 decision 有 `independent_review`（fresh-context `2026-11-06-independent-review.md`，conditional）；risk 与 attestation/state 一致，release 强制 high。
- `STATUS.md`/`criteria.md` 由 `render` 生成；`check` 对漂移 FAIL；`state.release.state=conditional`。

## 3. 未达/未测（不虚构）

- **人类分钟/变更**：未 instrument；没有可比的 3 个真实变更，故不声称下降 ≥30%。
- **L1 自主完成率**：本批次由 agent 完成实现/测试/记录，但没有 3 个独立 L1 变更样本；不声称 ≥70%。
- **人类最终验收**：W6 要求的一次“接受/有条件/退回”尚未签署；当前 decision 的 human 是 1.3.1 原发布决定（回填），`AECW 0.10.0 人类最终验收（W6）` 已列入 conditions（due 2026-11-20），不得写成已验收。
- **独立 reviewer**：本轮 verify 的 reviewer 是 `aecw-simplify`（agent/self）；但 high risk decision 额外绑定了 fresh-context 独立 review `2026-11-06-independent-review.md`（verdict conditional）。独立 review 的原始 findings 保留；其中高/中风险项已修一部分、其余列为条件/残留。
- **产品已知缺陷**：`routePath` 外部解析、settings 限速先于鉴权、G4 compact+大字 auto 宽度仍未修；本批次不改产品。
- **远程**：`main`/`v1.3.1` 未推送，凭证缺失。

## 4. 回滚

- tag `pre-simplify-2026-11-06` @ `06ca61c`。
- 旧工具/旧 gates/旧测试在 `workspace/archive/`；不删除。
- 任一机制不达标可整体回到 pre tag；不要只回滚一半。
