# Evolution · 候选 → 评估 → 采纳/淘汰

> 状态：current｜每轮 run 最多 1 个候选；E1 自动、E2 人类 + 独立复核；失败 retired 留负记忆。

## 结构

- `candidates/<id>.json`：候选（`proposed` / `evaluated` / `adopted` / `retired`）。
- `ledger.jsonl`：只追加 proposed/evaluated/adopted/retired。

## 命令

```powershell
node aecw/bin/aecw.mjs evolve aecw propose --id EV-... --type skill --scope project \
  --observation "..." --change "..." --expected "..." --risk low --rollback "..."
node aecw/bin/aecw.mjs evolve aecw evaluate --id EV-...
node aecw/bin/aecw.mjs evolve aecw adopt --id EV-...
node aecw/bin/aecw.mjs evolve aecw retire --id EV-... --reason "..."
```

## 干跑（2026-11-06）

- E1：`tests-pass + probe-pass` → 自动 adopt；
- E2：无人类 `--by/--decision` 拒绝；有人类 + 独立 review → adopt；
- 失败候选：`probe-pass=false` → retire。

三条均在新治理测试 `aecw/test/simplify.test.mjs` 中覆盖；当前无活跃候选。
