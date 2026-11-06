import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.resolve(HERE, '..', 'bin', 'aecw.mjs');
const TMP_BASE = path.join(HERE, '.tmp-s5');
let seq = 0;

function run(cwd, args) {
  fs.mkdirSync(TMP_BASE, { recursive: true });
  const log = path.join(TMP_BASE, `cli-${process.pid}-${seq++}.log`);
  const fd = fs.openSync(log, 'w');
  const result = spawnSync(process.execPath, [CLI, ...args], {
    cwd,
    stdio: ['ignore', fd, fd],
    windowsHide: true,
  });
  fs.closeSync(fd);
  return { code: result.status, output: fs.readFileSync(log, 'utf8') };
}

function makeProject() {
  fs.mkdirSync(TMP_BASE, { recursive: true });
  const base = fs.mkdtempSync(path.join(TMP_BASE, 'p-'));
  const gov = path.join(base, 'proj', 'aecw');
  const result = run(base, ['init', gov, '--name', 'demo-s5', '--owner', 'tester']);
  assert.equal(result.code, 0, result.output);
  return { base, gov };
}

function check(project) {
  return run(project.base, ['check', project.gov]);
}

test.after(() => {
  fs.rmSync(TMP_BASE, { recursive: true, force: true });
});

test('init 自带机器状态块；render 同步 state → STATUS 摘要与块', () => {
  const project = makeProject();
  const initial = check(project);
  assert.equal(initial.code, 0, initial.output);
  assert.match(fs.readFileSync(path.join(project.gov, 'STATUS.md'), 'utf8'), /AECW-GENERATED BEGIN/);

  const statePath = path.join(project.gov, 'state.json');
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  state.release = { version: '0.2.0', state: 'unreleased' };
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  const drifted = check(project);
  assert.equal(drifted.code, 1, drifted.output);
  assert.match(drifted.output, /机器状态块漂移|STATUS 摘要 release/);

  const rendered = run(project.base, ['render', project.gov]);
  assert.equal(rendered.code, 0, rendered.output);
  const after = check(project);
  assert.equal(after.code, 0, after.output);
  assert.match(fs.readFileSync(path.join(project.gov, 'STATUS.md'), 'utf8'), /1\.3\.0|0\.2\.0/);
});

test('机器状态块被手改 → check FAIL', () => {
  const project = makeProject();
  const statusPath = path.join(project.gov, 'STATUS.md');
  let status = fs.readFileSync(statusPath, 'utf8');
  status = status.replace('| 发布 | `0.1.0/unreleased` |', '| 发布 | `9.9.9/released` |');
  fs.writeFileSync(statusPath, status, 'utf8');
  const result = check(project);
  assert.equal(result.code, 1, result.output);
  assert.match(result.output, /机器状态块漂移/);
});

test('criteria 引用不存在的 F/DR/CR → FAIL', () => {
  const project = makeProject();
  const criteriaPath = path.join(project.gov, 'criteria.md');
  let criteria = fs.readFileSync(criteriaPath, 'utf8');
  criteria = `${criteria.trimEnd()}\n| FAKE-1 | 伪造引用 | met | F-999 | agent | — | — | stage |\n`;
  fs.writeFileSync(criteriaPath, criteria, 'utf8');
  const result = check(project);
  assert.equal(result.code, 1, result.output);
  assert.match(result.output, /引用不存在的台账 ID：F-999/);
});

test('roots/install 逃逸项目根 → FAIL', () => {
  const project = makeProject();
  const manifestPath = path.join(project.base, 'proj', 'PROJECT.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.roots.product = '..';
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  const result = check(project);
  assert.equal(result.code, 1, result.output);
  assert.match(result.output, /roots.product 逃逸项目根/);
});

test('release.gate 缺失 → FAIL', () => {
  const project = makeProject();
  const statePath = path.join(project.gov, 'state.json');
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  state.release = { version: '0.1.0', state: 'released', gate: 'gates/missing.md' };
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  const result = check(project);
  assert.equal(result.code, 1, result.output);
  assert.match(result.output, /state.release.gate 不存在/);
});
