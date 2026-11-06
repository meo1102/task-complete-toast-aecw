# workspace/evidence

> 状态：current｜最后核对：2026-11-06

原始证据只追加：测试/探针日志、verify attestation、独立 review、旧发布证据。当前状态不在本目录；见 [`../../state.json`](../../state.json) 与 [`../../STATUS.md`](../../STATUS.md)。

## 当前

| 文件 | 内容 | 时效 |
|---|---|---|
| [`attestations/`](attestations/) | `verify` 生成的 `VA-*.json` + check/probe/tests/governance 日志 | 当前 |
| [`2026-11-06-simplify-baseline.md`](2026-11-06-simplify-baseline.md) | 精简化前基线 | 历史（W0） |
| [`2026-11-06-simplify-result.md`](2026-11-06-simplify-result.md) | 精简化技术结果/W6 | 当前 |
| [`2026-11-06-independent-review.md`](2026-11-06-independent-review.md) | fresh-context 独立复核（conditional） | 当前 |
| [`2026-11-06-release-v1.3.1.md`](2026-11-06-release-v1.3.1.md) | 1.3.1 原发布证据 | 历史（发布时） |

## 历史

旧红队/S1–S5/布局/真机/迁移证据仍在 `evidence/` 根目录，只读；旧索引已归档到 [`../archive/views/evidence-README-pre-simplify.md`](../archive/views/evidence-README-pre-simplify.md)。旧 gates/board/release/manifest/criteria 在 [`../archive/`](../archive/)。

## 规则

1. 不改写原始证据；更正用新文件并在旧文件头标 `SUPERSEDED`。
2. 高影响事实注明核验人；作者自验只能写“可复现”，不能写“独立通过”。
3. 当前 decision 只引用可哈希的证据路径；归档证据可引用，但不得把归档 gate 当当前门。
