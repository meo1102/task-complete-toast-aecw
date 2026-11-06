import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
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

test('L2：high 无 freeze 拒绝；freeze + start + independent verify 后接受', { timeout: 120000 }, () => {
  const project = initProject('l2');
  const review = path.join(project.gov, 'workspace', 'evidence', 'review-l2.md');
  fs.writeFileSync(review, 'independent L2 review\n', 'utf8');
  const verified = cli(project, ['verify', project.gov, '--reviewer', 'tester', '--risk', 'high']);
  assert.equal(verified.code, 0, verified.output);
  const attestations = () => fs.readdirSync(path.join(project.gov, 'workspace', 'evidence', 'attestations')).filter((name) => name.endsWith('.json')).map((name) => path.join(project.gov, 'workspace', 'evidence', 'attestations', name));
  const first = attestations()[0];
  const rejected = cli(project, ['decide', project.gov, '--attestation', first, '--scope', 'stage l2', '--risk', 'high', '--by', 'tester', '--decision', 'accept', '--residual', 'r', '--independent-review', review, '--id', 'DR-L2-1']);
  assert.equal(rejected.code, 1, rejected.output);
  assert.match(rejected.output, /frozen|freeze/);
  const freeze = cli(project, ['freeze', project.gov, '--stage', 'l2', '--scope', 's', '--budget', '1', '--stop', 'x', '--acceptance', 'a', '--by', 'tester']);
  assert.equal(freeze.code, 0, freeze.output);
  const start = cli(project, ['start', project.gov, '--by', 'tester']);
  assert.equal(start.code, 0, start.output);
  // L2 允许 start 后在冻结授权范围内实现变更；final verify 绑定新树。
  fs.appendFileSync(path.join(project.project, 'README.md'), '\nchanged after start\n', 'utf8');
  const independent = cli(project, ['verify', project.gov, '--reviewer', 'independent', '--risk', 'high', '--independent']);
  assert.equal(independent.code, 0, independent.output);
  const latest = attestations()
    .map((file) => ({ file, mtime: fs.statSync(file).mtimeMs }))
    .sort((left, right) => left.mtime - right.mtime)
    .at(-1).file;
  const accepted = cli(project, ['decide', project.gov, '--attestation', latest, '--scope', 'stage l2', '--risk', 'high', '--by', 'tester', '--decision', 'accept', '--residual', 'r', '--independent-review', review, '--id', 'DR-L2-2']);
  assert.equal(accepted.code, 0, accepted.output);
  const checked = cli(project, ['check', project.gov]);
  assert.equal(checked.code, 0, checked.output);
});

test('32 路并发 evolve propose 不丢/不重/不截断', { timeout: 120000 }, async () => {
  const project = initProject('concurrent');
  const jobs = [];
  for (let index = 0; index < 32; index += 1) {
    jobs.push(new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [
        project.cli, 'evolve', 'propose', project.gov,
        '--id', `EV-C-${index}`, '--type', 'test', '--scope', 'project',
        '--observation', 'o', '--change', 'c', '--expected', 'e',
        '--risk', 'low', '--rollback', 'r', '--run', `run-${index}`,
        '--artifact', 'README.md', '--version', '1', '--metric', 'open-conditions',
      ], { cwd: project.project, stdio: 'ignore', windowsHide: true });
      child.on('error', reject);
      child.on('exit', (code) => resolve(code));
    }));
  }
  const codes = await Promise.all(jobs);
  assert.deepEqual(codes, Array(32).fill(0));
  const candidates = fs.readdirSync(path.join(project.gov, 'workspace', 'evolution', 'candidates')).filter((name) => name.endsWith('.json'));
  assert.equal(candidates.length, 32);
  const ledger = fs.readFileSync(path.join(project.gov, 'workspace', 'evolution', 'ledger.jsonl'), 'utf8').trim().split(/\r?\n/).filter(Boolean);
  assert.equal(ledger.length, 32);
  const checked = cli(project, ['check', project.gov]);
  assert.equal(checked.code, 0, checked.output);
});

test('E1 自动采纳、E2 必须人类、失败候选 retired', () => {
  const project = initProject();
  const evalLog = path.join(project.gov, 'workspace', 'evidence', 'eval.txt');
  fs.writeFileSync(evalLog, 'baseline=10 candidate=9\n', 'utf8');
  assert.equal(cli(project, ['evolve', 'propose', project.gov, '--id', 'EV-E1', '--type', 'skill', '--scope', 'project', '--observation', 'o', '--change', 'c', '--expected', 'e', '--risk', 'low', '--rollback', 'r', '--run', 'r1', '--artifact', 'README.md', '--version', '1', '--metric', 'open-conditions']).code, 0);
  assert.equal(cli(project, ['evolve', 'evaluate', project.gov, '--id', 'EV-E1', '--baseline', '10', '--candidate', '9', '--eval-log', evalLog]).code, 0);
  assert.equal(cli(project, ['evolve', 'adopt', project.gov, '--id', 'EV-E1']).code, 0);
  assert.equal(cli(project, ['evolve', 'propose', project.gov, '--id', 'EV-E2', '--type', 'workflow', '--scope', 'governance', '--observation', 'o', '--change', 'c', '--expected', 'e', '--risk', 'high', '--rollback', 'r', '--run', 'r2', '--artifact', 'README.md', '--version', '1', '--metric', 'open-conditions']).code, 0);
  const review = path.join(project.gov, 'workspace', 'evidence', 'review.md');
  fs.writeFileSync(review, 'independent review\n', 'utf8');
  assert.equal(cli(project, ['evolve', 'evaluate', project.gov, '--id', 'EV-E2', '--independent-review', review]).code, 0);
  const noHuman = cli(project, ['evolve', 'adopt', project.gov, '--id', 'EV-E2']);
  assert.equal(noHuman.code, 1, noHuman.output);
  assert.match(noHuman.output, /--by 必须是 owner/);
  assert.equal(cli(project, ['evolve', 'adopt', project.gov, '--id', 'EV-E2', '--by', 'tester', '--decision', 'accept', '--independent-review', review]).code, 0);
  assert.equal(cli(project, ['evolve', 'propose', project.gov, '--id', 'EV-BAD', '--type', 'test', '--scope', 'project', '--observation', 'o', '--change', 'c', '--expected', 'e', '--risk', 'low', '--rollback', 'r', '--run', 'r3', '--artifact', 'README.md', '--version', '1', '--metric', 'open-conditions']).code, 0);
  const badEval = cli(project, ['evolve', 'evaluate', project.gov, '--id', 'EV-BAD', '--tests-pass', 'true', '--probe-pass', 'false']);
  assert.equal(badEval.code, 0, badEval.output);
  assert.equal(cli(project, ['evolve', 'retire', project.gov, '--id', 'EV-BAD', '--reason', 'no improvement']).code, 0);
  const checked = cli(project, ['check', project.gov]);
  assert.equal(checked.code, 0, checked.output);
  const state = JSON.parse(fs.readFileSync(path.join(project.gov, 'state.json'), 'utf8'));
  assert.deepEqual(state.evolution.active, ['EV-E1', 'EV-E2']);
});
