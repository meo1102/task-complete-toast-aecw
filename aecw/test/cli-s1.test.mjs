import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.resolve(HERE, '..', 'bin', 'aecw.mjs');
const TMP_BASE = path.join(HERE, '.tmp');
const TODAY = new Date().toISOString().slice(0, 10);
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
  const output = fs.readFileSync(log, 'utf8');
  return { status: result.status, output };
}

function makeProject() {
  fs.mkdirSync(TMP_BASE, { recursive: true });
  const base = fs.mkdtempSync(path.join(TMP_BASE, 'p-'));
  const root = path.join(base, 'proj');
  const gov = path.join(root, 'aecw');
  const init = run(base, ['init', gov, '--name', 'demo-s1', '--owner', 'tester', '--goal', 'test']);
  assert.equal(init.status, 0, init.output);
  return { base, root, gov };
}

function check(project) {
  return run(project.base, ['check', project.gov]);
}

function writeAttestation(file, overrides = {}) {
  const data = {
    kind: 'verify',
    id: 'VA-TEST',
    ok: true,
    project: 'demo-s1',
    tree_hash: `sha256:${'a'.repeat(64)}`,
    open_s1s2: 0,
    criteria: { failed: 0, not_started: 0 },
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    ...overrides,
  };
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function markdownFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'core' || entry.name === '.aecw-txn') continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...markdownFiles(abs));
    else if (entry.name.endsWith('.md')) out.push(abs);
  }
  return out;
}

test.after(() => {
  fs.rmSync(TMP_BASE, { recursive: true, force: true });
});

test('init → check 0/0，生成 PROJECT/state/criteria 且所有文档有状态头', () => {
  const project = makeProject();
  const manifest = JSON.parse(fs.readFileSync(path.join(project.root, 'PROJECT.json'), 'utf8'));
  assert.equal(manifest.project, 'demo-s1');
  assert.equal(manifest.roots.governance, 'aecw');
  assert.ok(manifest.tool.hash);
  const state = JSON.parse(fs.readFileSync(path.join(project.gov, 'state.json'), 'utf8'));
  assert.equal(state.owner.name, 'tester');
  assert.equal(state.stage.state, 'seed');
  const criteria = fs.readFileSync(path.join(project.gov, 'criteria.md'), 'utf8');
  assert.match(criteria, /\| INIT-1 \|/);

  const result = check(project);
  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /说明：结构\/一致性检查；不是授权\/发布证明/);
  assert.match(result.output, /FAIL 0｜WARN 0/);

  for (const file of markdownFiles(project.gov)) {
    const head = fs.readFileSync(file, 'utf8').split(/\r?\n/).slice(0, 10).join('\n');
    assert.match(head, /^>\s*状态：(current|historical|superseded)/m, `missing status header: ${file}`);
  }
});

test('开放 S1 使 check FAIL，且和通过类门禁被拒绝', () => {
  const project = makeProject();
  const dissent = run(project.base, [
    'dissent', project.gov,
    '--severity', 'S1',
    '--type', 'risk',
    '--claim', 'bad | injected\nsecond line',
    '--evidence', 'manual',
  ]);
  assert.equal(dissent.status, 0, dissent.output);

  const ledger = fs.readFileSync(path.join(project.gov, 'ledger.md'), 'utf8');
  assert.match(ledger, /bad \\\| injected second line/);
  assert.doesNotMatch(ledger, /bad \| injected second line/);

  const blocked = check(project);
  assert.equal(blocked.status, 1, blocked.output);
  assert.match(blocked.output, /FAIL 开放 S1\/S2：1 条（DR-001）/);

  const gate = run(project.base, ['gate', project.gov, '--name', 's1-block', '--decision', '通过']);
  assert.equal(gate.status, 1, gate.output);
  assert.equal(fs.existsSync(path.join(project.gov, 'gates', `${TODAY}-s1-block.md`)), false);

  const rework = run(project.base, ['gate', project.gov, '--name', 's1-block', '--decision', '退回补证']);
  assert.equal(rework.status, 0, rework.output);
});

test('大写 OPEN 与全占位 deferred 都不能骗过 check', () => {
  const project = makeProject();
  assert.equal(run(project.base, ['dissent', project.gov, '--severity', 'S1', '--claim', 'uppercase']).status, 0);
  const ledgerPath = path.join(project.gov, 'ledger.md');
  const lines = fs.readFileSync(ledgerPath, 'utf8').split(/\r?\n/);
  const index = lines.findIndex((line) => line.startsWith('| DR-001 '));
  const cells = lines[index].split('|');
  cells[8] = ' OPEN ';
  lines[index] = cells.join('|');
  fs.writeFileSync(ledgerPath, lines.join('\n'), 'utf8');
  const uppercase = check(project);
  assert.equal(uppercase.status, 1, uppercase.output);
  assert.match(uppercase.output, /开放 S1\/S2：1 条/);

  const other = makeProject();
  const criteriaPath = path.join(other.gov, 'criteria.md');
  let criteria = fs.readFileSync(criteriaPath, 'utf8');
  criteria = criteria.replace(
    '| INIT-1 | 项目脚手架由 init 生成且结构检查通过 | met | F-001（init 运行记录） | agent | — | seed |',
    '| INIT-1 | 项目脚手架由 init 生成且结构检查通过 | deferred | F-001 | agent | - | - |',
  );
  fs.writeFileSync(criteriaPath, criteria, 'utf8');
  const deferred = check(other);
  assert.equal(deferred.status, 1, deferred.output);
  assert.match(deferred.output, /缺少人类裁决\/影响门/);
});

test('resolve 只认 DR、S1/S2 必须人类；gate 通过必须有 attestation + 人类签署', () => {
  const project = makeProject();
  assert.equal(run(project.base, ['dissent', project.gov, '--severity', 'S2', '--claim', 'needs human']).status, 0);

  const agentResolve = run(project.base, ['resolve', project.gov, '--id', 'DR-001', '--decision', '接受', '--by', '集群管家']);
  assert.equal(agentResolve.status, 1, agentResolve.output);

  const crossType = run(project.base, ['change', project.gov, '--id', 'DR-001', '--decision', '接受', '--by', 'tester']);
  assert.equal(crossType.status, 1, crossType.output);

  const humanResolve = run(project.base, ['resolve', project.gov, '--id', 'DR-001', '--decision', '接受', '--by', 'tester']);
  assert.equal(humanResolve.status, 0, humanResolve.output);

  const noAttestation = run(project.base, ['gate', project.gov, '--name', 'approve', '--decision', '通过']);
  assert.equal(noAttestation.status, 1, noAttestation.output);

  const attestation = path.join(project.base, 'attestation.json');
  writeAttestation(attestation);
  const wrongSigner = run(project.base, [
    'gate', project.gov, '--name', 'approve', '--decision', '通过',
    '--attestation', attestation, '--signed-by', 'agent',
  ]);
  assert.equal(wrongSigner.status, 1, wrongSigner.output);

  const ok = run(project.base, [
    'gate', project.gov, '--name', 'approve', '--decision', '通过',
    '--attestation', attestation, '--signed-by', 'tester',
  ]);
  assert.equal(ok.status, 0, ok.output);
  const gateFile = path.join(project.gov, 'gates', `${TODAY}-approve.md`);
  const gateText = fs.readFileSync(gateFile, 'utf8');
  assert.match(gateText, /决策：通过/);
  assert.match(gateText, /VA-TEST/);
  assert.match(gateText, /人类签署：tester/);

  const duplicate = run(project.base, ['gate', project.gov, '--name', 'approve', '--decision', '暂停']);
  assert.equal(duplicate.status, 1, duplicate.output);
});

test('charter 不得自批准；跨类型裁决与重复裁决被拒绝', () => {
  const project = makeProject();
  const selfAccept = run(project.base, [
    'change', project.gov, '--type', 'charter', '--title', '改宪章', '--decision', '接受',
  ]);
  assert.equal(selfAccept.status, 1, selfAccept.output);

  const create = run(project.base, ['change', project.gov, '--type', 'charter', '--title', '改宪章', '--reason', 'r', '--impact', 'i']);
  assert.equal(create.status, 0, create.output);

  const resolveCross = run(project.base, ['resolve', project.gov, '--id', 'CR-001', '--decision', '接受', '--by', 'tester']);
  assert.equal(resolveCross.status, 1, resolveCross.output);

  const agentDecide = run(project.base, [
    'change', project.gov, '--id', 'CR-001', '--decision', '接受', '--by', '集群管家',
  ]);
  assert.equal(agentDecide.status, 1, agentDecide.output);

  const humanDecide = run(project.base, [
    'change', project.gov, '--id', 'CR-001', '--decision', '接受', '--by', 'tester', '--reason', 'ok',
  ]);
  assert.equal(humanDecide.status, 0, humanDecide.output);

  const again = run(project.base, [
    'change', project.gov, '--id', 'CR-001', '--decision', '拒绝', '--by', 'tester',
  ]);
  assert.equal(again.status, 1, again.output);
});

test('accept 必须具名人类 + 证据；log 写入决策表而不是阶段外事项表', () => {
  const project = makeProject();
  for (const args of [
    ['accept', project.gov, '--item', '设置页', '--decision', '接受', '--evidence', 'F-001'],
    ['accept', project.gov, '--item', '设置页', '--decision', '接受', '--evidence', 'F-001', '--by', '集群管家'],
    ['accept', project.gov, '--item', '设置页', '--decision', '接受', '--by', 'tester'],
  ]) {
    const result = run(project.base, args);
    assert.equal(result.status, 1, result.output);
  }
  const accepted = run(project.base, [
    'accept', project.gov, '--item', '设置页', '--decision', '接受', '--evidence', 'F-001', '--by', 'tester',
  ]);
  assert.equal(accepted.status, 0, accepted.output);
  assert.match(fs.readFileSync(path.join(project.gov, 'human', 'acceptance.md'), 'utf8'), /\| tester \|/);

  const logged = run(project.base, ['log', project.gov, '--decision', '测试决定', '--reason', '测试']);
  assert.equal(logged.status, 0, logged.output);
  const decisions = fs.readFileSync(path.join(project.gov, 'human', 'decisions.md'), 'utf8');
  const decisionPart = decisions.split('## 阶段外事项')[0];
  assert.match(decisionPart, /测试决定/);
  assert.doesNotMatch(decisions.split('## 阶段外事项')[1] ?? '', /测试决定/);
});

test('nextId 只扫描对应表，不被自由文本中的伪 ID 带偏', () => {
  const project = makeProject();
  const result = run(project.base, [
    'fact', project.gov, '--statement', '普通陈述提到 F-999 和 CR-999', '--source', 'manual',
  ]);
  assert.equal(result.status, 0, result.output);
  const ledger = fs.readFileSync(path.join(project.gov, 'ledger.md'), 'utf8');
  assert.match(ledger, /^\| F-002 \|/m);
  assert.doesNotMatch(ledger, /^\| F-1000 \|/m);
});

test('inbox 第二步写失败时 ledger 回滚，不留半事务', () => {
  const project = makeProject();
  const inbox = path.join(project.gov, 'inbox');
  fs.rmSync(inbox, { recursive: true, force: true });
  fs.writeFileSync(inbox, 'blocked', 'utf8');
  const ledgerPath = path.join(project.gov, 'ledger.md');
  const before = fs.readFileSync(ledgerPath, 'utf8');
  const result = run(project.base, ['dissent', project.gov, '--severity', 'S1', '--claim', 'half transaction']);
  assert.equal(result.status, 1, result.output);
  assert.equal(fs.readFileSync(ledgerPath, 'utf8'), before);
  assert.doesNotMatch(fs.readFileSync(ledgerPath, 'utf8'), /DR-001/);
  assert.equal(fs.existsSync(path.join(project.gov, '.aecw-txn')), false);
});

test('gate 名称注入与路径字符被拒绝', () => {
  const project = makeProject();
  for (const name of ['bad\n- 决策：通过', '../../escape', 'bad|name', '']) {
    const result = run(project.base, ['gate', project.gov, '--name', name, '--decision', '退回补证']);
    assert.equal(result.status, 1, `${name}: ${result.output}`);
  }
  const ok = run(project.base, ['gate', project.gov, '--name', 'normal-gate', '--decision', '退回补证']);
  assert.equal(ok.status, 0, ok.output);
});

test('start 只接受人类所有者', () => {
  const project = makeProject();
  const blueprintPath = path.join(project.gov, 'BLUEPRINT.md');
  let blueprint = fs.readFileSync(blueprintPath, 'utf8');
  blueprint = blueprint.replace('- 状态：draft', '- 状态：approved').replace('- 批准人：（待批准）', '- 批准人：tester');
  fs.writeFileSync(blueprintPath, blueprint, 'utf8');
  fs.writeFileSync(
    path.join(project.gov, 'gates', '2026-01-01-charter-freeze.md'),
    '# 冻结（测试夹具）\n\n> 状态：historical\n',
    'utf8',
  );
  const notOwner = run(project.base, ['start', project.gov, '--by', 'red-team-not-owner']);
  assert.equal(notOwner.status, 1, notOwner.output);
  const owner = run(project.base, ['start', project.gov, '--by', 'tester']);
  assert.equal(owner.status, 0, owner.output);
  const order = fs.readFileSync(path.join(project.gov, 'gates', `${TODAY}-start-order.md`), 'utf8');
  assert.match(order, /^> 状态：historical/m);
});
