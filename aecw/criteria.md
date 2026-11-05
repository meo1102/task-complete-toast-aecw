# 验收矩阵 · task-complete-toast-aecw

> 状态：current
> 最后核对：2026-11-05
> 权威：本矩阵与 `state.json`；门禁是矩阵的视图。`met` 必须有证据；`waived/deferred` 必须有人类裁决/日期/影响门。
> 证据等级：E1 运行事实｜E2 人类目视（无截图）｜E3 文档主张。

| ID | 判据 | 状态 | 证据 | 核验人 | 人类裁决 | 影响门 |
|---|---|---|---|---|---|---|
| G1-COMPLETE | 完成/失败/中断/停止提示可用（G1 5/5） | met | F-022（E2，2026-11-04） | 人类 | 接受 2026-11-04 | release |
| G1-R1 | 通知点击不拉起/还原最小化窗口 | waived | F-022 | 人类 | 接受为 R1 已知限制 2026-11-04 | release |
| G2-BASE | 授权/确认提醒（7/8） | met | F-026（E2，2026-11-04） | 人类 | 有条件接受 2026-11-04 | release |
| G2-8 | 双会话并发/上限/顺序 | waived | F-028 | 人类 | 接受为遗留 2026-11-04 | release |
| G2-OCC | 遮挡/失焦时仍发系统通知；解决后关闭 | met | F-041（E1 W16/W17）；F-042（E2）；F-049（release） | 人类 | 接受 2026-11-05；随 1.3.0 发布 | release |
| G2-SCREENSHOT | G2 遮挡推送截图/录屏 | waived | 无（ED-002 waived） | — | 挂起 2026-11-05（人类指令） | release |
| G3-BASE | 弹窗样式自定义 6/6 | met | F-027（E2，2026-11-04） | 人类 | 有条件接受 2026-11-04 | release |
| G3-4b | 提醒卡不受 `durationMs` 单独真机 | waived | F-027 | 人类 | 接受为遗留 2026-11-04 | release |
| G4-ENTRY | 人类可在无 agent 指路下找到设置入口 | met | F-040（E2） | 人类 | 接受 2026-11-05 | release |
| G4-UI | 设置页可打开、控件/预览/保存可操作 | met | F-040（E2） | 人类 | 接受 2026-11-05 | release |
| G4-BOUNDS | 字号 12–18、宽度 280–480、最小宽度联动 | met | F-037（E1 单测）；F-040（E2） | 人类 | 接受 2026-11-05 | release |
| G4-COLOR | 背景/文字色 + 对比度守卫 | met | F-037（E1）；F-040（E2） | 人类 | 接受 2026-11-05 | release |
| G4-SCREENSHOT | 至少一张设置页 + 一张预览截图 | waived | 无（ED-001 waived） | — | 挂起 2026-11-05（人类指令） | release |
| G4-RELEASE | G4 发布决定（版本/tag/说明） | met | F-049；tag `v1.3.0` | 人类 | 发布 1.3.0（2026-11-05） | release |
| WP-0 | 设置可行性/持久化方案 A | met | F-033/F-036 | agent | 接受 2026-11-05 | stage |
| WP-1 | 配置模型/边界/联动/对比度 | met | F-037 | agent | 接受 2026-11-05 | stage |
| WP-2 | 设置页 `settings.plugins.tab` | met | F-039/F-040 | 人类 | 接受 2026-11-05 | stage |
| WP-3 | 实时预览 | met | F-040 | 人类 | 接受 2026-11-05 | stage |
| WP-4 | A 方案持久化 | met | F-038（E1） | agent | 接受 2026-11-05 | stage |
| WP-5 | 自动化/真机矩阵（截图除外） | met | 169/169；F-040/F-042 | agent + 人类 | 接受 2026-11-05 | stage |
| WP-5-SCREENSHOT | WP-5 设置页/预览截图 | waived | 无（ED-001 waived） | — | 挂起 2026-11-05（人类指令） | stage/release |
| WP-6 | 文档/介绍一致性 | met | F-031/F-032；README | agent | 接受 2026-11-05 | stage |
| AECW-ADOPT | AECW 结构采纳（adoption 门禁） | deferred | `gates/2026-11-05-adoption.md` | 人类 | 临时采纳（provisional），签署待 ED-003 | adoption |
| EV-001 | 运行态探针 trial → active | met | F-044/F-045 | 人类 | 激活 2026-11-05 | evolution |
| EV-001-OOD | 分布外验证/真实回滚演练 | deferred | 无（ED-004） | — | 激活时已知；到期复核 | evolution |

## 门禁规则

- `met` 必须有 F/DR/CR/命令/文件证据；
- `waived/deferred` 必须有裁决/日期/影响门；`deferred` 未签时只能“有条件通过”，且必须挂证据债 ID；
- 没有 `failed/not-started` 才能“通过”；
- `grow-2` 的“有条件通过”绑定：`G2-SCREENSHOT`、`G4-SCREENSHOT`、`WP-5-SCREENSHOT`（ED-001/ED-002）、`AECW-ADOPT`（ED-003）。
