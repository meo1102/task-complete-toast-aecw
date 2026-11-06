# Direction · task-complete-toast-aecw

> 状态：current｜人类所有者：meo1102｜最后核对：2026-11-06

## 1. 目标

让“任务完成/等待授权提示”在真实 DSH 宿主里可用、可运维，同时不成为跨源写入口；让治理只保留准确所需的边界，把人类注意力留给方向、例外和一次决定。

## 2. 非目标

- 不做任意 CSS、字体上传、主题市场、遥测、外部资源。
- 不修改 DSH 源码/安装目录，不写 localStorage/IndexedDB/cookie，不跨工作区泄漏。
- 不重写产品代码；不为治理再造运行时。
- 不追求历史文档全部一致；历史进 `workspace/archive/`。

## 3. 边界

- 产品代码在仓库根；治理只在 `aecw/`。
- 零第三方运行时依赖、无构建链。
- 单写者：只有编排者写 mainline 与 state；worker 隔离实现，不写 state/mainline。
- 证据只追加；旧门禁/旧视图归档，不删除。
- 未测就写未测；E2 不写成 E1；不称“全部通过”。

## 4. 风险分级

| 级别 | 触发 | 流程 | 人类 |
|---|---|---|---|
| L0 | 文档/注释/非行为性 | `check` + 相关测试 | 不预批 |
| L1 | 普通产品行为、低/中风险 | worker + tests/probe + 单写者合并 | 不逐单批 |
| L2 | 安全边界、发布、不可逆、外部副作用、并发共享写、预算超限 | freeze + 独立验证 + 一次人类决定 + 可回滚 | 合并前一次决定 |

## 5. 人类保留位

- 方向/边界/停止；
- 阶段或发布的一次决定；
- S1/S2 例外裁决；
- 真实使用验收/抽样；
- 直读 `state.json`、`workspace/evidence/`、`workspace/decisions/`。

人类不替集群写方案、不逐单审批、不维护台账、不在空模板上签字。

## 6. 当前停点

- 产品：1.3.1 已发布（tag `v1.3.1`，conditional；远程未推送）；**1.3.2 conditional 发布**（routePath/限速/G4 宽度；tag `v1.3.2`）。
- 治理：AECW 0.10.0 已接受；当前阶段 `product-hardening` active。
- 当前阻塞项：`STATUS.md` 生成视图；1.3.2 release decision 待人类。
