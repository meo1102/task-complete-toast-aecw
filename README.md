# 任务完成提示（task-complete-toast）· AECW 精简化项目

> 状态：current｜最后核对：2026-11-06｜版本：`1.3.2`（候选）｜人类所有者：meo1102
> 当前状态以 [`aecw/STATUS.md`](aecw/STATUS.md) 为准；该页由 `aecw render` 从 [`aecw/state.json`](aecw/state.json) 生成。
> 产品代码在仓库根；治理只在 [`aecw/`](aecw/)；历史在 [`aecw/workspace/archive/`](aecw/workspace/archive/)。

DSH 持久化插件：当 Agent 从运行变为空闲时，在窗口右下角提示任务完成；等待授权/确认时提示处理；页面不可见或被遮挡时改发 Windows 系统通知。

| 项 | 值 |
|---|---|
| 包名 | `@local/task-complete-toast` |
| 版本 | `1.3.2`（候选；1.3.1 为上一版；尚未发布/tag） |
| 目标环境 | DSH Desktop `0.2.1-rc.3`（Cordis），Windows |
| 自动化 | **176/176** 通过（2026-11-06） |
| 治理工具 | AECW `0.10.0`（精简化：state + decision + verify + evolution） |
| 安装 | desktop profile link/junction → `D:\DSH\task-complete-toast-aecw` |

## 功能

- **完成判定**：`api-session/status` 的 `running: true → false`，经 250 ms 观察窗确认（不看 Goal、不等后台 job）。
- **文案**：两行；标题（任务完成/失败/已停止/已中断/被阻止）+ 明细 `<工作区>[<会话>] · 待执行`。
- **结果桥**：区分完成 / 失败 / 中断 / 被阻止 / 停止；用户主动取消不提示。宿主记录 `turn/end`，客户端按需拉取。
- **自动消失**：默认 5 s；鼠标移入或焦点进入取消计时，移出/失焦后重新完整 5 s。
- **系统通知**：页面不可见或被遮挡时发送；每条唯一 `tag`（≤34 字符）；点击尝试聚焦/打开，最小化时不还原（平台限制，已接受）。
- **多标签**：80 ms 认领窗，`tabId` 字典序最小胜出。
- **G2 授权/确认提醒**：只读 `uiSession.sessionStatus` 的 `pendingInteraction`；等待授权/回答时显示，进入会话/解决/关闭后收起；页面不可见时发系统通知。
- **G3 弹窗样式**：四角、跟随/亮/暗、紧凑/标准、时长 2–15 s、标题开关；纯 token，无任意 CSS。
- **G4 外观设置**：设置 → 插件 → “任务完成提示设置”，可调字号 12–18 px、卡片宽度 280–480 px（最小宽度随字号联动）、背景色/文字色（`#RRGGBB`，对比度 <4.5:1 拒绝），即时预览；字体固定跟随系统正文字体。
- **语言**：跟随 DSH 当前语言（内置 zh / en）。

## 安装

1. **界面**：插件页 → 添加 → 从文件夹安装 → 选本目录。
2. **plugin_manager**：`install_bundle`，`target` 传本目录绝对路径。
3. **手工 link**：在 `<DSH_HOME>/profiles/<profile>/package.json` 中配置 `link:` 与 bundle 条目。

生效规则：客户端改动刷新页面即生效；宿主改动与替换包需重启应用。

> **同包名冲突**：本项目与原件包名相同；安装本项目前先卸载/移除原件，或改包名。

## 配置

宿主 `Config`（写入 profile patch 对应 entry 的 `config`）：

| 字段 | 默认 | 说明 |
|---|---|---|
| `enabled` | `true` | 总开关；关时客户端完全不启动 |
| `notify.awaiting` | `true` | G2 授权/确认提醒开关 |
| `bridge.enabled` | `true` | 关时客户端只走启发式（不拉结果） |
| `bridge.routePath` | `/dsh-task-complete/outcome` | 结果路由；只应使用同源路径 |
| `bridge.routeKind` | `exact` | `exact` / `prefix` |
| `bridge.ringSize` | `256` | 结果表容量（32–1024） |
| `bridge.entryTtlMs` | `600000` | 结果表 TTL |
| `bridge.exposeReason` | `true` | 关时响应只含 `sessionId/outcome/at` |
| `appearance.position` | `bottom-right` | 四角 |
| `appearance.theme` | `system` | `system` / `light` / `dark` |
| `appearance.size` | `standard` | `compact` / `standard` |
| `appearance.durationMs` | `5000` | 完成卡 2000–15000 ms；G2 提醒不受影响 |
| `appearance.showTitle` | `true` | 完成卡标题 |
| `appearance.fontSize` | `12` | 字号 12–18 px |
| `appearance.cardWidth` | `null` | `null` 跟随 size；或 280–480 px |
| `appearance.backgroundColor` | `null` | `null` 跟随主题；或 `#RRGGBB` |
| `appearance.textColor` | `null` | `null` 跟随主题；或 `#RRGGBB` |

## 测试

在仓库根执行：

```powershell
node --test --test-isolation=none test/*.test.js
```

期望 `tests 176 / pass 176 / fail 0`。受限沙箱内必须用 `--test-isolation=none`。

治理回归：

```powershell
node --test --test-isolation=none aecw/test/*.test.mjs
```

## AECW 精简化治理

目标结构（一个源、一个门、一个验证、一个进化闭环、按风险分级）：

```text
aecw/
  state.json                 # 唯一当前状态
  STATUS.md                  # 生成视图（勿手改）
  criteria.md                # 当前阻塞项生成视图（≤10 行；勿手改）
  workspace/
    evidence/                # 只追加：测试/探针/verify/attestation
    decisions/               # 唯一的门：一份人类决定一个 JSON
    evolution/               # candidates/ + ledger.jsonl
    memory/                  # 已采纳的方向/事实
    archive/                 # 旧 gates/board/release/manifest 等，只读
  bin/aecw.mjs               # 0.10.0 CLI
```

核心命令：

```powershell
node aecw/bin/aecw.mjs check aecw
node aecw/bin/aecw.mjs render aecw
node aecw/bin/aecw.mjs verify aecw --reviewer "reviewer" --risk high
node aecw/bin/aecw.mjs decide aecw --attestation <verify.json> --scope "release 1.3.1" --risk high --by meo1102 --decision "有条件接受" [--condition "文本|到期|负责人"] [--residual "..."]
node aecw/bin/aecw.mjs evolve aecw list
```

- `check`：结构/一致性；**不是授权**。空 decision、state/STATUS 漂移、旧当前路径、tree 不一致都 FAIL。
- `verify`：tests + probe + tree + 日志哈希 + reviewer；写 attestation。
- `decide`：只接受 `workspace/evidence/attestations/` 下的成功 verify；空 facts/evidence/human 签名拒绝；高风险必须写 residual risk。
- `evolve`：候选 → 评估 → 采纳/淘汰；E1 自动、E2 必须人类 + 独立复核；失败候选 retired 并留负记忆。
- `gate`：已废弃别名，只提示用 `decide`，**不再生成空模板**。
- 风险分级：L0/L1 不 freeze；L2（安全边界/发布/不可逆/外部副作用/并发共享写/预算超限）才 freeze + 独立验证 + 一次人类决定。

## 已知限制

- 点击系统通知不激活/还原最小化窗口（Electron + Windows；已接受）。
- G2-8 双会话并发/上限/顺序未测（已接受遗留）。
- G3-4b 提醒卡不受 `durationMs` 未单独真机（已接受遗留）。
- 真实浏览器 settings save/307/自定义 routePath/live 限速未真机；发布后条件 2026-11-20 前复核。
- 1.3.2 候选未发布；远程 `main` 与 `v1.3.2` 未推送（本机 GitHub 凭证缺失）。

## 目录

```text
task-complete-toast-aecw/
├─ package.json / index.js / client.js / lib/ / locale/ / test/  # 产品代码（根）
├─ cordis.patch.yml / icon.svg / README.md / AGENTS.md
└─ aecw/                     # AECW 0.10.0 治理
   ├─ state.json / STATUS.md / criteria.md
   ├─ bin/aecw.mjs
   ├─ scripts/probe.mjs
   └─ workspace/{evidence,decisions,evolution,memory,archive}
```
