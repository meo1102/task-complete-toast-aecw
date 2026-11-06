import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.resolve(HERE, '..', 'bin', 'aecw.mjs');
const TMP_BASE = path.join(HERE, '.tmp-simplify');
let seq = 0;

function run(cwd, command, args) {
  fs.mkdirSync(TMP_BASE, { recursive: true });
  const log = path.join(TMP_BASE, `cli-${process.pid}-${seq++}.log`);
  const fd = fs.openSync(log, 'w');
  const result = spawnSync(command, args, {
    cwd,
    stdio: ['ignore', fd, fd],
    windowsHide: true,
  });
  fs.closeSync(fd);
  return { code: result.status ?? 1, output: fs.readFileSync(log, 'utf8') };
}

function initProject(name = 'demo') {
  fs.mkdirSync(TMP_BASE, { recursive: true });
  const base = fs.mkdtempSync(path.join(TMP_BASE, 'p-'));
  const project = path.join(base, 'proj');
  const gov = path.join(project, 'aecw');
  const created = run(base, process.execPath, [CLI, 'init', gov, '--name', name, '--owner', 'tester']);
  assert.equal(created.code, 0, created.output);
  return { base, project, gov, cli: path.join(gov, 'bin', 'aecw.mjs') };
}

function cli(project, args) {
  return run(project.project, process.execPath, [project.cli, ...args]);
}

test.after(() => {
  fs.rmSync(TMP_BASE, { recursive: true, force: true });
});

test('init + check：state/STATUS/criteria 生成，旧当前路径不存在', () => {
  const project = initProject();
  const checked = cli(project, ['check', project.gov]);
  assert.equal(checked.code, 0, checked.output);
  assert.match(checked.output, /FAIL 0/);
  assert.match(fs.readFileSync(path.join(project.gov, 'STATUS.md'), 'utf8'), /AECW-STATE/);
  assert.match(fs.readFileSync(path.join(project.gov, 'criteria.md'), 'utf8'), /当前 0 \/ 10 行/);
  assert.equal(fs.existsSync(path.join(project.gov, 'gates')), false);
  assert.equal(fs.existsSync(path.join(project.gov, 'cluster')), false);
});

test('verify + decide：facts/evidence/human 完整，tree 绑定，check 通过', () => {
  const project = initProject();
  const verified = cli(project, ['verify', project.gov, '--reviewer', 'tester', '--risk', 'low']);
  assert.equal(verified.code, 0, verified.output);
  const attestation = fs.readdirSync(path.join(project.gov, 'workspace', 'evidence', 'attestations')).find((name) => name.endsWith('.json'));
  assert.ok(attestation);
  const decided = cli(project, [
    'decide', project.gov,
    '--attestation', path.join(project.gov, 'workspace', 'evidence', 'attestations', attestation),
    '--scope', 'stage demo', '--risk', 'low', '--by', 'tester', '--decision', 'accept',
    '--id', 'DR-DEMO-1', '--fact', 'human accepted']);
  assert.equal(decided.code, 0, decided.output);
  const decision = JSON.parse(fs.readFileSync(path.join(project.gov, 'workspace', 'decisions', 'DR-DEMO-1.json'), 'utf8'));
  assert.equal(decision.human.name, 'tester');
  assert.deepEqual(decision.conditions, []);
  assert.ok(decision.facts.length > 0);
  assert.ok(decision.evidence.length > 0);
  assert.equal(decision.attestation.tree_hash.startsWith('sha256:'), true);
  const checked = cli(project, ['check', project.gov]);
  assert.equal(checked.code, 0, checked.output);
});

test('空 decision / 缺 facts / 缺 attestation → check FAIL', () => {
  const project = initProject();
  fs.writeFileSync(path.join(project.gov, 'workspace', 'decisions', 'DR-EMPTY.json'), `${JSON.stringify({
    id: 'DR-EMPTY', kind: 'decision', scope: 'x', risk: 'low', facts: [], evidence: [], conditions: [],
    residual_risk: 'none', human: {}, attestation: {},
  }, null, 2)}\n`, 'utf8');
  const checked = cli(project, ['check', project.gov]);
  assert.equal(checked.code, 1, checked.output);
  assert.match(checked.output, /facts 为空|evidence 不能为空|human\.name/);
});

test('state/STATUS 漂移 → check FAIL；render 后恢复', () => {
  const project = initProject();
  const statusPath = path.join(project.gov, 'STATUS.md');
  fs.appendFileSync(statusPath, '\n手改\n', 'utf8');
  const drifted = cli(project, ['check', project.gov]);
  assert.equal(drifted.code, 1, drifted.output);
  const rendered = cli(project, ['render', project.gov]);
  assert.equal(rendered.code, 0, rendered.output);
  const checked = cli(project, ['check', project.gov]);
  assert.equal(checked.code, 0, checked.output);
});

test('gate 是废弃别名：不生成空模板', () => {
  const project = initProject();
  const result = cli(project, ['gate', project.gov, '--name', 'x', '--decision', '通过']);
  assert.equal(result.code, 2, result.output);
  assert.match(result.output, /DEPRECATED/);
  assert.equal(fs.existsSync(path.join(project.gov, 'gates')), false);
});

test('decide 拒绝 evidence/attestations 之外的 attestation', () => {
  const project = initProject();
  const fake = path.join(project.project, 'fake-attestation.json');
  fs.writeFileSync(fake, JSON.stringify({ kind: 'verify', ok: true, tree_hash: 'sha256:' + 'A'.repeat(64) }), 'utf8');
  const rejected = cli(project, ['decide', project.gov, '--attestation', fake, '--scope', 'release 0', '--risk', 'low', '--by', 'tester', '--decision', 'accept']);
  assert.equal(rejected.code, 1, rejected.output);
  assert.match(rejected.output, /attestations/);
});

test('decide 负控：高风险缺 residual、11 个 conditions、tree 变化都拒绝', () => {
  const project = initProject();
  const verified = cli(project, ['verify', project.gov, '--reviewer', 'tester', '--risk', 'high']);
  assert.equal(verified.code, 0, verified.output);
  const attestation = path.join(project.gov, 'workspace', 'evidence', 'attestations', fs.readdirSync(path.join(project.gov, 'workspace', 'evidence', 'attestations')).find((name) => name.endsWith('.json')));
  const base = ['decide', project.gov, '--attestation', attestation, '--scope', 'release 0.1.0', '--by', 'tester', '--decision', 'accept'];
  const missingResidual = cli(project, [...base, '--risk', 'high']);
  assert.equal(missingResidual.code, 1, missingResidual.output);
  assert.match(missingResidual.output, /residual/);
  const eleven = [...base, '--risk', 'high', '--residual', 'r'];
  for (let index = 0; index < 11; index += 1) eleven.push('--condition', `c${index}|2026-11-20|tester`);
  const tooMany = cli(project, eleven);
  assert.equal(tooMany.code, 1, tooMany.output);
  assert.match(tooMany.output, /超过 10/);
  fs.appendFileSync(path.join(project.project, 'README.md'), '\ntree changed\n', 'utf8');
  const changed = cli(project, [...base, '--risk', 'high', '--residual', 'r']);
  assert.equal(changed.code, 1, changed.output);
  assert.match(changed.output, /tree/);
});

test('E1 自动采纳、E2 必须人类、失败候选 retired', () => {
  const project = initProject();
  assert.equal(cli(project, ['evolve', 'propose', project.gov, '--id', 'EV-E1', '--type', 'skill', '--scope', 'project', '--observation', 'o', '--change', 'c', '--expected', 'e', '--risk', 'low', '--rollback', 'r', '--run', 'r1']).code, 0);
  assert.equal(cli(project, ['evolve', 'evaluate', project.gov, '--id', 'EV-E1']).code, 0);
  assert.equal(cli(project, ['evolve', 'adopt', project.gov, '--id', 'EV-E1']).code, 0);
  assert.equal(cli(project, ['evolve', 'propose', project.gov, '--id', 'EV-E2', '--type', 'workflow', '--scope', 'governance', '--observation', 'o', '--change', 'c', '--expected', 'e', '--risk', 'high', '--rollback', 'r', '--run', 'r2']).code, 0);
  const review = path.join(project.gov, 'workspace', 'evidence', 'review.md');
  fs.writeFileSync(review, 'independent review\n', 'utf8');
  assert.equal(cli(project, ['evolve', 'evaluate', project.gov, '--id', 'EV-E2', '--independent-review', review]).code, 0);
  const noHuman = cli(project, ['evolve', 'adopt', project.gov, '--id', 'EV-E2']);
  assert.equal(noHuman.code, 1, noHuman.output);
  assert.match(noHuman.output, /--by 必须是 owner/);
  assert.equal(cli(project, ['evolve', 'adopt', project.gov, '--id', 'EV-E2', '--by', 'tester', '--decision', 'accept', '--independent-review', review]).code, 0);
  assert.equal(cli(project, ['evolve', 'propose', project.gov, '--id', 'EV-BAD', '--type', 'test', '--scope', 'project', '--observation', 'o', '--change', 'c', '--expected', 'e', '--risk', 'low', '--rollback', 'r', '--run', 'r3']).code, 0);
  assert.equal(cli(project, ['evolve', 'evaluate', project.gov, '--id', 'EV-BAD', '--tests-pass', 'true', '--probe-pass', 'false']).code, 0);
  assert.equal(cli(project, ['evolve', 'retire', project.gov, '--id', 'EV-BAD', '--reason', 'no improvement']).code, 0);
  const checked = cli(project, ['check', project.gov]);
  assert.equal(checked.code, 0, checked.output);
  const state = JSON.parse(fs.readFileSync(path.join(project.gov, 'state.json'), 'utf8'));
  assert.deepEqual(state.evolution.active, ['EV-E1', 'EV-E2']);
});
