import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.resolve(HERE, '..', 'bin', 'aecw.mjs');
const TMP_BASE = path.join(HERE, '.tmp-s3');
let seq = 0;

function syncRun(cwd, args) {
  fs.mkdirSync(TMP_BASE, { recursive: true });
  const log = path.join(TMP_BASE, `sync-${process.pid}-${seq++}.log`);
  const fd = fs.openSync(log, 'w');
  const result = spawnSync(process.execPath, [CLI, ...args], {
    cwd,
    stdio: ['ignore', fd, fd],
    windowsHide: true,
  });
  fs.closeSync(fd);
  return { code: result.status, output: fs.readFileSync(log, 'utf8') };
}

function initProject() {
  fs.mkdirSync(TMP_BASE, { recursive: true });
  const base = fs.mkdtempSync(path.join(TMP_BASE, 'p-'));
  const gov = path.join(base, 'proj', 'aecw');
  const result = syncRun(base, ['init', gov, '--name', 'demo-s3', '--owner', 'tester']);
  assert.equal(result.code, 0, result.output);
  return { base, gov };
}

function run(cwd, args) {
  return new Promise((resolve) => {
    fs.mkdirSync(TMP_BASE, { recursive: true });
    const log = path.join(TMP_BASE, `cli-${process.pid}-${seq++}.log`);
    const fd = fs.openSync(log, 'w');
    const child = spawn(process.execPath, [CLI, ...args], {
      cwd,
      stdio: ['ignore', fd, fd],
      windowsHide: true,
    });
    child.on('close', (code) => {
      fs.closeSync(fd);
      resolve({ code, output: fs.readFileSync(log, 'utf8') });
    });
    child.on('error', (error) => {
      fs.closeSync(fd);
      resolve({ code: 1, output: String(error) });
    });
  });
}

function readFactRows(gov) {
  const ledger = fs.readFileSync(path.join(gov, 'ledger.md'), 'utf8');
  const rows = [];
  for (const line of ledger.split(/\r?\n/)) {
    const match = line.match(/^\| (F-\d+) \|/);
    if (match) rows.push({ id: match[1], line });
  }
  return { ledger, rows };
}

test.after(() => {
  fs.rmSync(TMP_BASE, { recursive: true, force: true });
});

test('32 路并发 fact × 10 轮：成功全持久化、无重号、无截断', async () => {
  for (let round = 1; round <= 10; round++) {
    const project = initProject();
    const workers = await Promise.all(
      Array.from({ length: 32 }, (_, index) => run(project.base, [
        'fact', project.gov,
        '--statement', `round ${round} worker ${index}`,
        '--source', 'concurrency-test',
      ])),
    );
    const failed = workers.filter((worker) => worker.code !== 0);
    assert.equal(failed.length, 0, `round ${round} failed: ${failed.map((worker) => worker.output).join('\n')}`);

    const { ledger, rows } = readFactRows(project.gov);
    assert.equal(rows.length, 33, `round ${round}: expected init F-001 + 32 facts`);
    assert.equal(new Set(rows.map((row) => row.id)).size, rows.length, `round ${round}: duplicate F id`);
    for (let index = 0; index < 32; index++) {
      const needle = `| round ${round} worker ${index} |`;
      assert.equal((ledger.split(needle).length - 1), 1, `round ${round}: missing/duplicated ${needle}`);
    }
    assert.equal(ledger.includes('\uFFFD'), false, `round ${round}: replacement character`);
    assert.equal(fs.existsSync(path.join(project.gov, '.aecw-lock')), false, `round ${round}: lock left behind`);
  }
});

test('写入失败时锁被释放，下一次写入仍可继续', async () => {
  const project = initProject();
  const ledgerPath = path.join(project.gov, 'ledger.md');
  const backup = fs.readFileSync(ledgerPath, 'utf8');
  fs.rmSync(ledgerPath);
  fs.mkdirSync(ledgerPath);
  const failed = await run(project.base, ['fact', project.gov, '--statement', 'should fail', '--source', 'test']);
  assert.equal(failed.code, 1, failed.output);
  assert.equal(fs.existsSync(path.join(project.gov, '.aecw-lock')), false);
  fs.rmSync(ledgerPath, { recursive: true, force: true });
  fs.writeFileSync(ledgerPath, backup, 'utf8');
  const ok = await run(project.base, ['fact', project.gov, '--statement', 'after failure', '--source', 'test']);
  assert.equal(ok.code, 0, ok.output);
  assert.match(fs.readFileSync(ledgerPath, 'utf8'), /after failure/);
});

test('未完成 journal 在下次写入前回滚，再提交新记录', async () => {
  const project = initProject();
  const ledgerPath = path.join(project.gov, 'ledger.md');
  const ledger = fs.readFileSync(ledgerPath, 'utf8');
  const txn = path.join(project.gov, '.aecw-txn');
  fs.mkdirSync(txn);
  const recovered = `${ledger.trimEnd()}\n<!-- recovered-from-journal -->\n`;
  fs.writeFileSync(path.join(txn, 'b0.bak'), recovered, 'utf8');
  fs.writeFileSync(
    path.join(txn, 'journal.json'),
    JSON.stringify({ version: 1, entries: [{ target: ledgerPath, backup: path.join(txn, 'b0.bak'), created: false }] }),
    'utf8',
  );
  const result = await run(project.base, ['fact', project.gov, '--statement', 'after recovery', '--source', 'test']);
  assert.equal(result.code, 0, result.output);
  assert.match(result.output, /回滚到提交前状态/);
  const next = fs.readFileSync(ledgerPath, 'utf8');
  assert.match(next, /recovered-from-journal/);
  assert.match(next, /after recovery/);
  assert.equal(fs.existsSync(txn), false);
});
