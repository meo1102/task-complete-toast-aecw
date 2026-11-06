# workspace/landing

> 状态：historical｜最后核对：2026-11-06

落地清单/交接/退役：可用、可运维、可交接、可审计、成本、遗留接受、照护者。

| 文件 | 内容 | 时效 |
|---|---|---|
| [`manifest.md`](manifest.md) | v1.3.0 落地清单（可用/可运维/可交接/可审计/遗留/照护者/退役） | 当前 |
| [`handover-2026-11-04.md`](handover-2026-11-04.md) | 2026-11-04 交接说明（安装历史、回滚、已知坑） | 历史/参考 |
| [`migration-aecw-2026-11-05.md`](migration-aecw-2026-11-05.md) | AECW 结构迁移的映射与验证记录 | 历史（迁移已完成） |
| [`repo-map-2026-11-05.md`](repo-map-2026-11-05.md) | 布局 v2 时的仓库地图（产品 `product/`） | 历史（布局 v3 已取消 product 层） |

## 规则

- 没有**具名照护者**不算落地；遗留必须有人接受（见 `../../human/acceptance.md`）。
- 落地清单不是发布公告；发布口径看 `../gates/2026-11-05-release-v1.3.0.md` 与 `../evidence/2026-11-05-release-v1.3.0.md`。
- 退役路径必须可执行：卸载 bundle / 移除 profile link / 还原 patch；不修改宿主。
