# Independent review · AECW 0.10.0 simplification

> 状态：current｜日期：2026-11-06｜reviewer：`aecw-simplify-independent-review`（workflow fresh-context，只读）
> 结论：**conditional**（非 clean pass）；blocking=false，但高/中风险项必须作为条件。

## 结论

结构简化是真实的：`state.json` 单源、`STATUS.md`/`criteria.md` 生成、`decisions/*.json` 唯一门、`gate` 不再生成空模板、产品代码未改。当前树 check 通过，1 decision / 9 conditions，旧 gates/views 已归档。

但“一个验证/一个门”仍有假 PASS 路径：任意手写 verify JSON、原 migration 空窗、L2 独立验证未强制、`verify` 未跑治理测试、E1 可用 `--tests-pass` 自证、`--risk` 可降级、部分 `--id` 路径可穿越、state 仍写 released 而 human 决定是 conditional。

## Findings（原始，按严重度）

| # | 严重度 | 发现 | 证据 |
|---|---|---|---|
| 1 | high | 任意手写 attestation JSON 可满足 decide/check；只要 kind/ok/tree/expiry，logs 可省略 | `aecw/bin/aecw.mjs` 原 decide/validateDecision；测试只拒绝 attestations 目录外的假文件 |
| 2 | high | migration 标志可让 released 版本无 decision 通过 check；1.3.1 的 verify 是在 decisions=0 下跑的 | 原 check `state.migration.active` 分支；VA-cc2880 check log |
| 3 | high | L2 freeze/独立验证未强制；高风险 verify 是 self-review | 原 decide 不检查 freeze/independent；VA-cc2880 reviewer aecw-simplify |
| 4 | high | 1.3.1 回填 human timestamp 取自已被 superseded 的旧 gate，早于最终 attestation 和新树 verify | DR-1.3.1 human.at/source；旧 gate line 5；fd647e 07:11Z |
| 5 | high | `--id` 未校验，resolve/evolve/freeze/change 可路径穿越写目录外 | 原 candidatePath/freeze/resolve 直接 `path.join` |
| 6 | high | verify 只跑产品 test/probe，不跑 governance tests；init 的 test/probe 是 no-op | PROJECT.commands.governance 未使用；init 写 `process.exit(0)` |
| 7 | high | E1/E2 可自证：`--tests-pass` 不跑测试；adopted project candidate 不要求日志 | 原 evolve evaluate/checkEvolution |
| 8 | high | `--risk` 可降级，未与 attestation/state 交叉校验 | 原 decide 用 `--risk` 默认 state.risk，不比较 attestation.risk |
| 9 | medium | state.release.state=released 与 human“有条件接受”不一致 | state 1.3.1/released；decision 有条件接受 |
| 10 | medium | 树/产品哈希对 CRLF 敏感，和 LF/旧发布哈希不可比 | 工作树 CRLF；旧 release evidence 用 LF blob |
| 11 | medium | check 接受过期 attestation；backfill 字段不校验 | 原 validateDecision 忽略 expires_at |
| 12 | medium | decide 非事务；check 失败会留下无效 decision/state | 原 decide 写后 check，无回滚 |
| 13 | medium | W6 human acceptance 未进入 state/conditions | result 说 pending；STATUS 9 条均为产品条件 |
| 14 | medium | W6 人类分钟/L1 自主率未测量 | baseline/result 自认未 instrument |
| 15 | medium | archive 声明 inert 但被 decision evidence 引用，且只读未强制 | DR evidence 引用 archive gate |
| 16 | medium | 当前文档/归档有坏链、旧 current 状态、evidence index 过期 | release evidence link ../../gates；archive/views current |
| 17 | medium | 产品已知问题未修：routePath 外部解析、限速先于鉴权、G4 compact auto 宽度 | lib/config.js/client.js/lib/host.js；README 已知限制 |
| 18 | medium | probe 可被反斜杠 routePath/同后缀目录欺骗 | probe 原 readRoutePath/后缀比较 |
| 19 | low | freeze 同名可覆盖旧记录 | 原 `FREEZE-${stage}.json` 无 exists 检查 |
| 20 | low | dissent 只认精确大小写 S1/S2，未测 | 原 checkDissent |
| 21 | low | 根目录旧 `aecw-redteam-report.md` 未归档 | 根目录 v0.9 报告 |

## 复核后处置（本次批次）

- 已修：attestation 严格 schema/logs/checks；移除 migration 空窗；高风险独立 review + 风险不降级；`--id` 校验；verify 跑 governance；E1 真实运行 tests/probe 并记录日志哈希；decide 事务回滚；release.state 由 conditions 推导为 conditional；树/产品哈希 LF 归一；probe 反斜杠/realpath；根报告归档。
- 未闭：W6 人类最终验收、人类分钟/L1 自主率未测量、产品 routePath/限速/G4 宽度未修、远程未推送、1.3.1 decision 的 human timestamp 是回填而非新树 contemporaneous acceptance。
- 结论仍为 **conditional**；不得把本次技术完成写成“人类已验收”。

## 备注

- 本报告是 fresh-context reviewer 的只读结论摘要，保留原始 findings；后续处置由主会话记录，不修改原始 reviewer 结论。
- 独立 reviewer 没有运行产品/治理测试；测试数字来自仓库 attestation 日志，主会话另行复跑。
