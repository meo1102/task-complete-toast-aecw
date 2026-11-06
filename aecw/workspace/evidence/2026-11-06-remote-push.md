# Remote push · 1.3.2

> 状态：current｜日期：2026-11-06

## 事实

- 远程地址：`ssh://git@ssh.github.com:443/meo1102/task-complete-toast-aecw.git`（SSH 443）。
- 凭证：本机既有 ED25519 key；Git 使用 `C:/Windows/System32/OpenSSH/ssh.exe`；未保存 token/私钥。
- `origin/main` = `55ed23e`（1.3.2 release commit）。
- `v1.3.1` 与 `v1.3.2` tags 已推送。
- 本地/远程 main 差距 = 0。

## 证据

```text
git ls-remote origin HEAD refs/heads/main refs/tags/v1.3.1 refs/tags/v1.3.2
55ed23e... HEAD
55ed23e... refs/heads/main
57380fb... refs/tags/v1.3.1
0f0da9c... refs/tags/v1.3.2
```
