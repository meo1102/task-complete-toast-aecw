import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.resolve(HERE, '..', 'bin', 'aecw.mjs');
const TMP_BASE = path.join(HERE, '.tmp-s2');
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
  return { status: result.status, output: fs.readFileSync(log, 'utf8') };
}

function read(project, rel) {
  return fs.readFileSync(path.join(project.root, rel), 'utf8');
}

function write(project, rel, content) {
  fs.writeFileSync(path.join(project.root, rel), content, 'utf8');
}

function makeProject() {
  fs.mkdirSync(TMP_BASE, { recursive: true });
  const base = fs.mkdtempSync(path.join(TMP_BASE, 'p-'));
  const root = path.join(base, 'proj');
  const gov = path.join(root, 'aecw');
  const init = run(base, ['init', gov, '--name', 'demo-s2', '--owner', 'tester', '--goal', 'test']);
  assert.equal(init.status, 0, init.output);

  let direction = fs.readFileSync(path.join(gov, 'human', 'direction.md'), 'utf8');
  direction = direction.replaceAll('（待填）', '已填').replace('（明确不做；这比目标更能约束行为）', '不做外部发布');
  fs.writeFileSync(path.join(gov, 'human', 'direction.md'), direction, 'utf8');

  let blueprint = fs.readFileSync(path.join(gov, 'BLUEPRINT.md'), 'utf8');
  blueprint = blueprint
    .replace('- 阶段：seed', '- 阶段：grow-x')
    .replace('- 状态：draft', '- 状态：approved')
    .replace('- 批准人：（待批准）', '- 批准人：tester');
  fs.writeFileSync(path.join(gov, 'BLUEPRINT.md'), blueprint, 'utf8');

  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'PROJECT.json'), 'utf8'));
  manifest.commands = {
    ...manifest.commands,
    test: 'node -e "process.exit(0)"',
    probe: 'node -e "process.exit(0)"',
  };
  fs.writeFileSync(path.join(root, 'PROJECT.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  fs.mkdirSync(path.join(root, 'test'), { recursive: true });
  fs.writeFileSync(path.join(root, 'test', 'README.md'), '# test fixture\n', 'utf8');
  fs.mkdirSync(path.join(gov, 'scripts'), { recursive: true });
  fs.writeFileSync(path.join(gov, 'scripts', 'probe.mjs'), 'process.exit(0);\n', 'utf8');

  return { base, root, gov };
}

function check(project, extra = []) {
  return run(project.base, ['check', project.gov, ...extra]);
}

function lastAttestation(project) {
  const dir = path.join(project.gov, 'workspace', 'evidence', 'attestations');
  const files = fs.readdirSync(dir).filter((name) => name.endsWith('.json')).sort();
  assert.ok(files.length, 'no attestation written');
  return path.join(dir, files[files.length - 1]);
}

function gateFiles(project, needle) {
  return fs.readdirSync(path.join(project.gov, 'gates')).filter((name) => name.includes(needle)).sort();
}

function freeze(project, stage = 'grow-x', extra = {}) {
  return run(project.base, [
    'freeze', project.gov,
    '--charter-confirmed',
    '--stage', stage,
    '--scope', '测试范围',
    '--budget', '1 天',
    '--stop', 'S1 或预算耗尽',
    '--acceptance', '测试通过',
    ...Object.entries(extra).flatMap(([key, value]) => [key, value]),
  ]);
}

test.after(() => {
  fs.rmSync(TMP_BASE, { recursive: true, force: true });
});

test('verify 生成 attestation；gate 通过并绑定当前 tree；tree 变化后拒绝', () => {
  const project = makeProject();
  assert.equal(check(project).status, 0);

  const verified = run(project.base, ['verify', project.gov, '--reviewer', 'tester', '--gate', 'release']);
  assert.equal(verified.status, 0, verified.output);
  assert.match(verified.output, /PASS verify/);
  const attestation = lastAttestation(project);
  const data = JSON.parse(fs.readFileSync(attestation, 'utf8'));
  assert.equal(data.kind, 'verify');
  assert.equal(data.ok, true);
  assert.equal(data.open_s1s2, 0);
  assert.match(data.tree_hash, /^sha256:[0-9A-F]{64}$/);
  assert.match(data.product_hash, /^sha256:[0-9A-F]{64}$/);
  assert.equal(data.reviewer.name, 'tester');

  const approved = run(project.base, [
    'gate', project.gov, '--name', 'release', '--decision', '通过',
    '--attestation', attestation, '--signed-by', 'tester',
  ]);
  assert.equal(approved.status, 0, approved.output);
  assert.equal(gateFiles(project, 'release').length, 1);

  fs.appendFileSync(path.join(project.gov, 'workspace', 'landing', 'README.md'), '\nchanged\n', 'utf8');
  const stale = run(project.base, [
    'gate', project.gov, '--name', 'release-2', '--decision', '通过',
    '--attestation', attestation, '--signed-by', 'tester',
  ]);
  assert.equal(stale.status, 1, stale.output);
  assert.match(stale.output, /树不一致/);
});

test('attestation 过期/失败时 gate 拒绝', () => {
  const project = makeProject();
  assert.equal(run(project.base, ['verify', project.gov, '--reviewer', 'tester']).status, 0);
  const attestation = lastAttestation(project);
  const data = JSON.parse(fs.readFileSync(attestation, 'utf8'));

  const expiredPath = path.join(project.base, 'expired.json');
  fs.writeFileSync(expiredPath, `${JSON.stringify({ ...data, expires_at: '2020-01-01T00:00:00.000Z' }, null, 2)}\n`, 'utf8');
  const expired = run(project.base, [
    'gate', project.gov, '--name', 'x', '--decision', '通过', '--attestation', expiredPath, '--signed-by', 'tester',
  ]);
  assert.equal(expired.status, 1, expired.output);
  assert.match(expired.output, /已过期/);

  const failedPath = path.join(project.base, 'failed.json');
  fs.writeFileSync(failedPath, `${JSON.stringify({ ...data, ok: false }, null, 2)}\n`, 'utf8');
  const failed = run(project.base, [
    'gate', project.gov, '--name', 'x', '--decision', '通过', '--attestation', failedPath, '--signed-by', 'tester',
  ]);
  assert.equal(failed.status, 1, failed.output);
  assert.match(failed.output, /不是成功的 verify/);
});

test('verify 对开放 S1、失败判据、release 证据债 fail-closed', () => {
  const openS1 = makeProject();
  assert.equal(run(openS1.base, ['dissent', openS1.gov, '--severity', 'S1', '--claim', 'blocked']).status, 0);
  const blocked = run(openS1.base, ['verify', openS1.gov, '--reviewer', 'tester']);
  assert.equal(blocked.status, 1, blocked.output);
  assert.match(blocked.output, /check --strict 未通过/);
  assert.match(blocked.output, /开放 S1\/S2/);
  const blockedData = JSON.parse(fs.readFileSync(lastAttestation(openS1), 'utf8'));
  assert.equal(blockedData.ok, false);
  assert.equal(blockedData.open_s1s2, 1);

  const badCriteria = makeProject();
  let criteria = read(badCriteria, 'aecw/criteria.md');
  criteria = criteria.replace('| INIT-1 | 项目脚手架由 init 生成且结构检查通过 | met |', '| INIT-1 | 项目脚手架由 init 生成且结构检查通过 | failed |');
  write(badCriteria, 'aecw/criteria.md', criteria);
  const failedCriteria = run(badCriteria.base, ['verify', badCriteria.gov, '--reviewer', 'tester']);
  assert.equal(failedCriteria.status, 1, failedCriteria.output);
  assert.match(failedCriteria.output, /criteria INIT-1 为 failed/);

  const debt = makeProject();
  const state = JSON.parse(read(debt, 'aecw/state.json'));
  state.evidence_debt = [{ id: 'ED-T', item: 'test debt', owner: 'tester', due: '2026-11-01', impact: 'release', status: 'open' }];
  write(debt, 'aecw/state.json', `${JSON.stringify(state, null, 2)}\n`);
  const blockedDebt = run(debt.base, ['verify', debt.gov, '--reviewer', 'tester']);
  assert.equal(blockedDebt.status, 1, blockedDebt.output);
  assert.match(blockedDebt.output, /ED-T 未清/);
});

test('freeze 写入 payload；start 重算；冻结后改蓝图拒绝；close 后不可重开', () => {
  const project = makeProject();
  const frozen = freeze(project);
  assert.equal(frozen.status, 0, frozen.output);
  assert.equal(check(project).status, 0);

  const state = JSON.parse(read(project, 'aecw/state.json'));
  assert.equal(state.stage.state, 'frozen');
  assert.match(state.stage.freeze.payload_hash, /^sha256:[0-9A-F]{64}$/);
  const freezeFile = freezeFiles(project);
  assert.equal(freezeFile.length, 1);
  assert.match(read(project, `aecw/gates/${freezeFile[0]}`), /AECW-FREEZE/);

  const started = run(project.base, ['start', project.gov, '--by', 'tester']);
  assert.equal(started.status, 0, started.output);
  assert.equal(check(project).status, 0);

  assert.equal(run(project.base, ['pause', project.gov, '--by', 'tester', '--reason', 'test']).status, 0);
  assert.equal(check(project).status, 0);
  assert.equal(run(project.base, ['resume', project.gov, '--by', 'tester']).status, 0);
  assert.equal(check(project).status, 0);

  assert.equal(run(project.base, ['gate', project.gov, '--name', 'stage-close', '--decision', '暂停']).status, 0);
  const closeGate = gateFiles(project, 'stage-close')[0];
  const closed = run(project.base, [
    'close', project.gov, '--by', 'tester', '--decision', '暂停', '--gate', path.join(project.gov, 'gates', closeGate), '--reason', 'test',
  ]);
  assert.equal(closed.status, 0, closed.output);
  assert.equal(check(project).status, 0);
  assert.equal(JSON.parse(read(project, 'aecw/state.json')).stage.state, 'closed');

  const reopen = run(project.base, ['start', project.gov, '--by', 'tester']);
  assert.equal(reopen.status, 1, reopen.output);
  assert.match(reopen.output, /只允许从 frozen 进入/);
  const sameStage = freeze(project);
  assert.equal(sameStage.status, 1, sameStage.output);
  assert.match(sameStage.output, /已 closed 且是终态/);

  let blueprint = read(project, 'aecw/BLUEPRINT.md').replace('- 阶段：grow-x', '- 阶段：grow-y');
  write(project, 'aecw/BLUEPRINT.md', blueprint);
  const newStage = freeze(project, 'grow-y');
  assert.equal(newStage.status, 0, newStage.output);
});

test('freeze 后蓝图任一字节变化，start 拒绝', () => {
  const project = makeProject();
  assert.equal(freeze(project).status, 0);
  fs.appendFileSync(path.join(project.gov, 'BLUEPRINT.md'), '\n- 追加未授权范围\n', 'utf8');
  const started = run(project.base, ['start', project.gov, '--by', 'tester']);
  assert.equal(started.status, 1, started.output);
  assert.match(started.output, /冻结内容已变化/);
  assert.match(started.output, /blueprint_hash/);
});

test('同名门禁生成唯一文件，不覆盖历史', () => {
  const project = makeProject();
  assert.equal(run(project.base, ['gate', project.gov, '--name', 'same-name', '--decision', '暂停']).status, 0);
  assert.equal(run(project.base, ['gate', project.gov, '--name', 'same-name', '--decision', '退回补证']).status, 0);
  const files = gateFiles(project, 'same-name');
  assert.equal(files.length, 2);
  const texts = files.map((file) => read(project, `aecw/gates/${file}`));
  assert.ok(texts.some((text) => /决策：暂停/.test(text)));
  assert.ok(texts.some((text) => /决策：退回补证/.test(text)));
});

test('verify 要求项目根自己的 Git 工作树干净', () => {
  const project = makeProject();
  for (const args of [
    ['init'],
    ['config', 'user.email', 'tester@example.invalid'],
    ['config', 'user.name', 'tester'],
    ['add', '-A'],
    ['commit', '-m', 'fixture'],
  ]) {
    const result = git(project.root, args);
    assert.equal(result.status, 0, `${args.join(' ')}\n${result.output}`);
  }
  const clean = run(project.base, ['verify', project.gov, '--reviewer', 'tester']);
  assert.equal(clean.status, 0, clean.output);
  assert.equal(JSON.parse(fs.readFileSync(lastAttestation(project), 'utf8')).git.dirty, false);

  fs.writeFileSync(path.join(project.root, 'dirty.txt'), 'dirty\n', 'utf8');
  const dirty = run(project.base, ['verify', project.gov, '--reviewer', 'tester']);
  assert.equal(dirty.status, 1, dirty.output);
  assert.match(dirty.output, /工作树不干净/);
});

function git(cwd, args) {
  fs.mkdirSync(TMP_BASE, { recursive: true });
  const log = path.join(TMP_BASE, `git-${process.pid}-${seq++}.log`);
  const fd = fs.openSync(log, 'w');
  const result = spawnSync('git', args, {
    cwd,
    stdio: ['ignore', fd, fd],
    windowsHide: true,
  });
  fs.closeSync(fd);
  return { status: result.status, output: fs.readFileSync(log, 'utf8') };
}

function freezeFiles(project) {
  return fs.readdirSync(path.join(project.gov, 'gates')).filter((name) => name.includes('charter-freeze')).sort();
}
