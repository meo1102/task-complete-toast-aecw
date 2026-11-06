#!/usr/bin/env node
/**
 * AECW 0.10.0 · 精简化治理 CLI
 *
 * 一个源：state.json
 * 一个门：workspace/decisions/<id>.json
 * 一个验证：verify（tests + probe + tree + logs + reviewer）
 * 一个进化闭环：workspace/evolution
 * 按风险分级：L0/L1 默认放行；L2 才 freeze + 独立验证。
 *
 * 本文件不依赖任何第三方包；产品代码不在本目录。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const TOOL_VERSION = '0.10.0';
const CLI = fileURLToPath(import.meta.url);
const DATE = new Date().toISOString().slice(0, 10);
const NOW = () => new Date().toISOString();
const RISKS = new Set(['low', 'medium', 'high']);
const STAGE_STATES = new Set(['seed', 'frozen', 'active', 'paused', 'closed']);
const RELEASE_STATES = new Set(['unreleased', 'released', 'conditional', 'rolled_back']);
const CANDIDATE_TYPES = new Set(['skill', 'prompt', 'test', 'workflow', 'memory', 'tool']);
const CANDIDATE_SCOPES = new Set(['project', 'governance']);
const CANDIDATE_STATES = new Set(['proposed', 'evaluated', 'adopted', 'retired']);
const MAX_CRITERIA = 10;
const ATTESTATION_MAX_AGE_MS = 72 * 3600 * 1000;

function fail(message) {
  console.error(`FAIL  ${message}`);
  process.exit(1);
}

function info(message) {
  console.log(message);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function readJsonMaybe(file) {
  try {
    return readJson(file);
  } catch {
    return undefined;
  }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeAtomic(file, text) {
  ensureDir(path.dirname(file));
  const temp = `${file}.tmp-${process.pid}-${crypto.randomBytes(3).toString('hex')}`;
  fs.writeFileSync(temp, text, 'utf8');
  fs.renameSync(temp, file);
}

function writeJson(file, value) {
  writeAtomic(file, `${JSON.stringify(value, null, 2)}\n`);
}

function readHashBytes(file) {
  const buffer = fs.readFileSync(file);
  if (/\.(?:md|js|mjs|json|ya?ml|svg|txt)$/i.test(file)) {
    return Buffer.from(buffer.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
  }
  return buffer;
}

function hashFile(file) {
  return `sha256:${crypto.createHash('sha256').update(readHashBytes(file)).digest('hex').toUpperCase()}`;
}

function hashText(text) {
  return `sha256:${crypto.createHash('sha256').update(String(text), 'utf8').digest('hex').toUpperCase()}`;
}

function normalizeHash(value) {
  return String(value ?? '').replace(/^sha256:/i, '').toUpperCase();
}

function requireId(value, label = 'id') {
  const id = String(value ?? '');
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/.test(id)) fail(`${label} 非法：${id}`);
  return id;
}

/**
 * 单写者锁：同一 AECW 目录的写命令串行化。
 * 退出时兜底释放；超过 120s 的锁视为 stale；30s 拿不到即失败。
 */
function acquireLock(dir) {
  const lock = path.join(dir, '.aecw-lock');
  const started = Date.now();
  let fd;
  for (;;) {
    try {
      fd = fs.openSync(lock, 'wx');
      fs.writeFileSync(fd, `${JSON.stringify({ pid: process.pid, at: NOW() })}\n`, 'utf8');
      break;
    } catch (error) {
      if (!['EEXIST', 'EPERM', 'EACCES', 'EBUSY'].includes(error.code)) throw error;
      try {
        const stat = fs.statSync(lock);
        if (Date.now() - stat.mtimeMs > 120000) {
          fs.unlinkSync(lock);
          continue;
        }
      } catch {
        // lock disappeared; retry
      }
      if (Date.now() - started > 30000) fail(`获取写锁超时：${lock}`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
    }
  }
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    try { fs.closeSync(fd); } catch { /* ignore */ }
    try { fs.unlinkSync(lock); } catch { /* ignore */ }
  };
  process.once('exit', release);
  return release;
}

function rel(project, abs) {
  return path.relative(project, abs).replace(/\\/g, '/');
}

function isDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`));
}

function isIso(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function slug(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'item';
}

function parseArgs(argv) {
  const args = [];
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith('--')) {
      args.push(current);
      continue;
    }
    let key = current.slice(2);
    let value = true;
    const eq = key.indexOf('=');
    if (eq >= 0) {
      value = key.slice(eq + 1);
      key = key.slice(0, eq);
    } else if (argv[index + 1] !== undefined && !argv[index + 1].startsWith('--')) {
      value = argv[index + 1];
      index += 1;
    }
    if (flags[key] === undefined) flags[key] = value;
    else if (Array.isArray(flags[key])) flags[key].push(value);
    else flags[key] = [flags[key], value];
  }
  return { args, flags };
}

function one(flags, key, fallback = undefined) {
  const value = flags[key];
  if (Array.isArray(value)) return value[value.length - 1];
  return value === undefined ? fallback : value;
}

function list(flags, key) {
  const value = flags[key];
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function bool(flags, key) {
  const value = one(flags, key, false);
  return value === true || value === 'true' || value === '1' || value === 'yes';
}

function passFlag(flags, key) {
  const value = one(flags, key, undefined);
  if (value === undefined) return null;
  return !['false', '0', 'no'].includes(String(value).toLowerCase());
}

function projectRootOf(dir) {
  return path.dirname(path.resolve(dir));
}

function projectPaths(dir) {
  return {
    dir,
    project: projectRootOf(dir),
    state: path.join(dir, 'state.json'),
    status: path.join(dir, 'STATUS.md'),
    criteria: path.join(dir, 'criteria.md'),
    workspace: path.join(dir, 'workspace'),
    evidence: path.join(dir, 'workspace', 'evidence'),
    attestations: path.join(dir, 'workspace', 'evidence', 'attestations'),
    decisions: path.join(dir, 'workspace', 'decisions'),
    evolution: path.join(dir, 'workspace', 'evolution'),
    candidates: path.join(dir, 'workspace', 'evolution', 'candidates'),
    ledger: path.join(dir, 'workspace', 'evolution', 'ledger.jsonl'),
    memory: path.join(dir, 'workspace', 'memory'),
    archive: path.join(dir, 'workspace', 'archive'),
    dissent: path.join(dir, 'workspace', 'evidence', 'dissent'),
  };
}

function requireDir(args, command) {
  const target = args[0] || one(flagsGlobal, 'dir', undefined);
  if (typeof target !== 'string' || target.trim() === '') fail(`${command} 需要一个治理目录（通常是 aecw）`);
  const dir = path.resolve(target);
  if (!fs.existsSync(path.join(dir, 'state.json'))) fail(`${command}：${dir} 不是 AECW 治理目录（缺 state.json）`);
  return dir;
}

function safeInProject(project, value) {
  if (typeof value !== 'string' || value.trim() === '') fail(`非法路径：${value}`);
  const abs = path.resolve(project, value);
  if (abs !== project && !abs.startsWith(`${project}${path.sep}`)) fail(`路径逃逸项目根：${value}`);
  return abs;
}

function requireFile(abs, label) {
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) fail(`缺少${label}：${abs}`);
  return abs;
}

function projectManifest(project) {
  const file = path.join(project, 'PROJECT.json');
  if (!fs.existsSync(file)) fail(`缺少 PROJECT.json：${file}`);
  return readJson(file);
}

function loadState(dir) {
  const file = path.join(dir, 'state.json');
  if (!fs.existsSync(file)) fail(`缺少 state.json：${file}`);
  return readJson(file);
}

function saveState(dir, state) {
  writeJson(path.join(dir, 'state.json'), state);
}

function loadDecisions(dir) {
  const p = projectPaths(dir);
  if (!fs.existsSync(p.decisions)) return [];
  const out = [];
  for (const name of fs.readdirSync(p.decisions).filter((item) => item.endsWith('.json')).sort()) {
    const file = path.join(p.decisions, name);
    const value = readJson(file);
    if (value?.kind === 'freeze' || value?.kind === 'change') continue;
    out.push({ ...value, __file: file, __rel: rel(p.project, file) });
  }
  return out;
}

function appendLedger(dir, event) {
  const p = projectPaths(dir);
  ensureDir(p.evolution);
  if (!fs.existsSync(p.ledger)) fs.writeFileSync(p.ledger, '', 'utf8');
  fs.appendFileSync(p.ledger, `${JSON.stringify({ at: NOW(), ...event })}\n`, 'utf8');
}

function readLedger(dir) {
  const p = projectPaths(dir);
  if (!fs.existsSync(p.ledger)) return [];
  const out = [];
  for (const line of fs.readFileSync(p.ledger, 'utf8').split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line));
    } catch {
      fail(`evolution/ledger.jsonl 行无法解析：${line.slice(0, 100)}`);
    }
  }
  return out;
}

function runCaptured(command, args, cwd, logPath, options = {}) {
  ensureDir(path.dirname(logPath));
  const fd = fs.openSync(logPath, 'w');
  let result;
  try {
    // 受限沙箱禁止 pipe；用文件描述符直接落盘，普通环境同样可用。
    result = spawnSync(command, args, {
      cwd,
      shell: Boolean(options.shell),
      timeout: options.timeout ?? 900000,
      windowsHide: true,
      stdio: ['ignore', fd, fd],
      env: process.env,
    });
  } finally {
    fs.closeSync(fd);
  }
  let output = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : '';
  if (result?.error) output += `\n[spawn error] ${result.error.message}\n`;
  fs.writeFileSync(logPath, output, 'utf8');
  const status = result?.status === null || result?.status === undefined ? 1 : result.status;
  return { status, output, logPath, sha256: hashFile(logPath) };
}

function runCommandString(command, cwd, logPath, timeout = 900000) {
  if (typeof command !== 'string' || !command.trim()) fail(`缺少命令：${command}`);
  return runCaptured(command, [], cwd, logPath, { shell: true, timeout });
}

function gitCapture(project, args) {
  const log = path.join(os.tmpdir(), `aecw-git-${process.pid}-${crypto.randomBytes(3).toString('hex')}.log`);
  try {
    const result = runCaptured('git', args, project, log, { timeout: 20000 });
    return { status: result.status, output: result.output.trim() };
  } finally {
    try { fs.rmSync(log, { force: true }); } catch { /* ignore */ }
  }
}

function gitFacts(project) {
  const top = gitCapture(project, ['rev-parse', '--show-toplevel']);
  if (top.status !== 0) return { available: false };
  const topPath = top.output;
  if (!topPath || path.resolve(topPath).toLowerCase() !== path.resolve(project).toLowerCase()) {
    return { available: false, reason: '项目根不是 Git 顶层' };
  }
  const head = gitCapture(project, ['rev-parse', 'HEAD']);
  const status = gitCapture(project, ['status', '--porcelain']);
  return {
    available: true,
    head: head.status === 0 ? head.output : null,
    dirty: status.status === 0 && status.output.length > 0,
  };
}

/** 树：产品 + 治理代码/文档/测试/记忆；排除 state/STATUS/criteria/evidence/decisions/evolution/archive。 */
function treeFiles(dir) {
  const project = projectRootOf(dir);
  const excludedDirs = new Set([
    rel(project, path.join(dir, 'workspace', 'evidence')),
    rel(project, path.join(dir, 'workspace', 'decisions')),
    rel(project, path.join(dir, 'workspace', 'evolution')),
    rel(project, path.join(dir, 'workspace', 'archive')),
  ]);
  const excludedFiles = new Set([
    rel(project, path.join(dir, 'state.json')),
    rel(project, path.join(dir, 'STATUS.md')),
    rel(project, path.join(dir, 'criteria.md')),
  ]);
  const out = [];
  const walk = (abs, relative) => {
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      const childAbs = path.join(abs, entry.name);
      const childRel = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === '.aecw-txn' || entry.name.startsWith('.tmp')) continue;
        if (excludedDirs.has(childRel)) continue;
        walk(childAbs, childRel);
      } else {
        if (entry.name === '.aecw-lock' || /\.tmp-/.test(entry.name)) continue;
        if (excludedFiles.has(childRel)) continue;
        out.push(childRel);
      }
    }
  };
  walk(project, '');
  return out.sort();
}

function hashFiles(project, files) {
  const hash = crypto.createHash('sha256');
  for (const relative of [...new Set(files)].sort()) {
    hash.update(relative);
    hash.update('\0');
    hash.update(readHashBytes(path.join(project, relative)));
    hash.update('\0');
  }
  return `sha256:${hash.digest('hex').toUpperCase()}`;
}

function treeHash(dir) {
  const project = projectRootOf(dir);
  return hashFiles(project, treeFiles(dir));
}

function productFiles(project, manifest) {
  const productRel = manifest?.roots?.product ?? '.';
  const productRoot = path.resolve(project, productRel);
  if (productRoot === project) {
    const files = [];
    for (const name of ['package.json', 'index.js', 'client.js', 'cordis.patch.yml', 'icon.svg']) {
      if (fs.existsSync(path.join(project, name))) files.push(name);
    }
    for (const name of ['lib', 'locale', 'test']) {
      if (!fs.existsSync(path.join(project, name))) continue;
      for (const entry of treeFilesIn(path.join(project, name))) files.push(`${name}/${entry}`);
    }
    return files;
  }
  return treeFilesIn(productRoot);
}

function treeFilesIn(root) {
  const out = [];
  const walk = (abs, relative) => {
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name.startsWith('.tmp')) continue;
      const childAbs = path.join(abs, entry.name);
      const childRel = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(childAbs, childRel);
      else out.push(childRel);
    }
  };
  walk(root, '');
  return out.sort();
}

function productHash(project, manifest) {
  return hashFiles(project, productFiles(project, manifest));
}

function stateSummary(state, decisions) {
  const releaseDecision = decisions.find((row) => state.release?.decision && row.__rel === state.release.decision)
    ?? decisions.find((row) => String(row.scope ?? '').startsWith('release'));
  return {
    project: state.project,
    stage: `${state.stage?.name ?? 'none'}/${state.stage?.state ?? 'none'}`,
    release: `${state.release?.version ?? 'none'}/${state.release?.state ?? 'none'}`,
    decision: releaseDecision?.id ?? null,
    risk: state.risk ?? null,
    owner: state.owner?.name ?? null,
    evolution: (state.evolution?.active ?? []).slice().sort(),
  };
}

function collectConditions(decisions) {
  const out = [];
  for (const decision of [...decisions].sort((a, b) => String(a.id).localeCompare(String(b.id)))) {
    for (const condition of decision.conditions ?? []) {
      out.push({
        id: `C-${String(out.length + 1).padStart(3, '0')}`,
        text: String(condition.text ?? ''),
        due: condition.due ?? null,
        owner: condition.owner ?? '—',
        source: decision.id,
      });
    }
  }
  return out.sort((a, b) => {
    const left = a.due ?? '9999-99-99';
    const right = b.due ?? '9999-99-99';
    if (left !== right) return left.localeCompare(right);
    return `${a.source}${a.text}`.localeCompare(`${b.source}${b.text}`);
  }).slice(0, MAX_CRITERIA);
}

function renderStatus(state, decisions) {
  const summary = stateSummary(state, decisions);
  const decision = decisions.find((row) => row.id === summary.decision);
  const conditions = collectConditions(decisions);
  const lines = [
    `# STATUS · ${state.project}`,
    '',
    `> 状态：current｜生成视图｜最后核对：${state.updated ?? DATE}`,
    `<!-- AECW-STATE ${JSON.stringify(summary)} -->`,
    '> 本页由 `node aecw/bin/aecw.mjs render aecw` 生成；勿手改。',
    '',
    '## 当前',
    '',
    '| 项 | 值 |',
    '|---|---|',
    `| 项目 | ${state.project} |`,
    `| 人类所有者 | ${state.owner?.name ?? '—'} |`,
    `| 阶段 | \`${summary.stage}\` |`,
    `| 发布 | \`${summary.release}\`${decision ? `（${decision.human?.decision ?? '决定已记录'}）` : ''} |`,
    `| 发布决定 | ${summary.decision ? `\`${summary.decision}\`` : '—（回填中）'} |`,
    `| 风险 | \`${summary.risk ?? '—'}\` |`,
    `| 活跃进化 | ${summary.evolution.length ? summary.evolution.map((id) => `\`${id}\``).join('、') : '—'} |`,
    `| 证据 | \`${state.links?.evidence ?? '—'}\` |`,
    `| 当前阻塞项 | ${conditions.length} 项 |`,
    '',
    '## 当前阻塞项',
    '',
    ...(conditions.length === 0
      ? ['无。']
      : conditions.map((condition) => `- ${condition.text}｜到期 ${condition.due ?? '—'}｜${condition.owner}｜来源 \`${condition.source}\``)),
    '',
    '## 生成视图',
    '',
    '- 当前阻塞项：`criteria.md`（由 decisions 的 conditions 生成，只读）。',
    '- 历史门禁/旧视图：`workspace/archive/`（只读，不参与当前状态）。',
    '',
    '## 命令',
    '',
    '```powershell',
    'node aecw/bin/aecw.mjs check aecw',
    'node aecw/bin/aecw.mjs verify aecw --reviewer "reviewer" --risk high',
    'node aecw/bin/aecw.mjs decide aecw --scope "release <version>" --risk high --by meo1102 --decision "有条件接受" --attestation aecw/workspace/evidence/attestations/VA-....json',
    'node aecw/bin/aecw.mjs evolve aecw list',
    'node aecw/bin/aecw.mjs render aecw',
    '```',
    '',
  ];
  return `${lines.join('\n')}\n`;
}

function renderCriteria(decisions) {
  const conditions = collectConditions(decisions);
  const lines = [
    '# 当前阻塞项 · 生成视图',
    '',
    '> 状态：current｜本页由 `aecw render` 从 `workspace/decisions/*.json` 的 `conditions` 生成；勿手改。',
    `> 当前 ${conditions.length} / ${MAX_CRITERIA} 行；历史验收见 \`workspace/archive/\`。`,
    '',
    '| ID | 阻塞项 | 状态 | 负责人 | 到期 | 来源 |',
    '|---|---|---|---|---|---|',
    ...conditions.map((condition) => `| ${condition.id} | ${condition.text.replace(/\|/g, '\\|')} | open | ${condition.owner} | ${condition.due ?? '—'} | ${condition.source} |`),
    '',
  ];
  return `${lines.join('\n')}\n`;
}

function renderAll(dir) {
  const state = loadState(dir);
  const decisions = loadDecisions(dir);
  const p = projectPaths(dir);
  ensureDir(p.workspace);
  writeAtomic(p.status, renderStatus(state, decisions));
  writeAtomic(p.criteria, renderCriteria(decisions));
  return { state, decisions, status: p.status, criteria: p.criteria };
}

function validateEvidence(project, evidence, errors, label) {
  if (!Array.isArray(evidence) || evidence.length === 0) {
    errors.push(`${label} evidence 不能为空`);
    return;
  }
  for (const item of evidence) {
    if (!item || typeof item.path !== 'string' || typeof item.sha256 !== 'string') {
      errors.push(`${label} evidence 项必须含 path/sha256`);
      continue;
    }
    let abs;
    try {
      abs = safeInProject(project, item.path);
    } catch (error) {
      errors.push(`${label} ${error.message}`);
      continue;
    }
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
      errors.push(`${label} evidence 不存在：${item.path}`);
      continue;
    }
    if (hashFile(abs).toUpperCase() !== item.sha256.toUpperCase()) {
      errors.push(`${label} evidence 哈希不匹配：${item.path}`);
    }
  }
}

function attestationErrors(project, attestation) {
  const errors = [];
  if (!attestation || typeof attestation !== 'object') return ['attestation 不是对象'];
  if (attestation.kind !== 'verify' || attestation.ok !== true) errors.push('attestation 不是成功的 verify');
  if (attestation.version !== 2) errors.push('attestation.version 必须是 2');
  if (typeof attestation.project !== 'string' || !attestation.project) errors.push('attestation.project 为空');
  if (typeof attestation.tree_hash !== 'string' || !/^sha256:[0-9A-F]{64}$/i.test(attestation.tree_hash)) errors.push('attestation.tree_hash 非法');
  if (typeof attestation.state_hash !== 'string' || !/^sha256:[0-9A-F]{64}$/i.test(attestation.state_hash)) errors.push('attestation.state_hash 非法');
  if (typeof attestation.product_hash !== 'string' || !/^sha256:[0-9A-F]{64}$/i.test(attestation.product_hash)) errors.push('attestation.product_hash 非法');
  if (!isIso(attestation.created_at) || !isIso(attestation.expires_at)) errors.push('attestation created/expires 非法');
  if (!attestation.reviewer || typeof attestation.reviewer.name !== 'string' || !attestation.reviewer.name.trim()) errors.push('attestation.reviewer.name 为空');
  if (!attestation.reviewer || typeof attestation.reviewer.session !== 'string' || !attestation.reviewer.session.trim()) errors.push('attestation.reviewer.session 为空');
  if (typeof attestation.reviewer?.independent !== 'boolean') errors.push('attestation.reviewer.independent 必须是 boolean');
  if (!Array.isArray(attestation.facts) || attestation.facts.length === 0) errors.push('attestation.facts 为空');
  for (const key of ['check', 'probe', 'tests', 'governance']) {
    if (!attestation.checks || attestation.checks[key]?.status !== 'pass') errors.push(`attestation.checks.${key} 未 pass`);
  }
  if (!Number.isInteger(attestation.checks?.tests?.pass) || attestation.checks.tests.pass <= 0) errors.push('attestation.tests.pass 必须 > 0');
  if (!Number.isInteger(attestation.checks?.governance?.pass) || attestation.checks.governance.pass <= 0) errors.push('attestation.governance.pass 必须 > 0');
  for (const key of ['check', 'probe', 'tests', 'governance']) {
    const log = attestation.logs?.[key];
    if (!log || typeof log.path !== 'string' || typeof log.sha256 !== 'string') {
      errors.push(`attestation.logs.${key} 缺失`);
      continue;
    }
    let abs;
    try {
      abs = safeInProject(project, log.path);
    } catch (error) {
      errors.push(`attestation.logs.${key} 路径：${error.message}`);
      continue;
    }
    if (!fs.existsSync(abs) || normalizeHash(hashFile(abs)) !== normalizeHash(log.sha256)) errors.push(`attestation.logs.${key} 缺失或哈希不匹配`);
  }
  return errors;
}

function validateDecision(dir, decision, owner, currentTree, errors, state) {
  const p = projectPaths(dir);
  const project = p.project;
  const label = `decision ${decision.id ?? '（无 id）'}`;
  if (!decision || typeof decision !== 'object') {
    errors.push(`${label} 不是对象`);
    return;
  }
  if (typeof decision.id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/.test(decision.id)) {
    errors.push(`${label} id 非法`);
  }
  if (typeof decision.scope !== 'string' || !decision.scope.trim()) errors.push(`${label} scope 为空`);
  if (!RISKS.has(decision.risk)) errors.push(`${label} risk 非法`);
  if (!Array.isArray(decision.facts) || decision.facts.length === 0 || decision.facts.some((fact) => typeof fact !== 'string' || !fact.trim())) {
    errors.push(`${label} facts 为空（拒绝空模板）`);
  }
  validateEvidence(project, decision.evidence, errors, label);
  if (!Array.isArray(decision.conditions)) {
    errors.push(`${label} conditions 必须是数组（无条件也要 []）`);
  } else {
    for (const condition of decision.conditions) {
      if (!condition || typeof condition.text !== 'string' || !condition.text.trim()) errors.push(`${label} condition.text 为空`);
      if (condition.due !== null && condition.due !== undefined && !isDate(condition.due)) errors.push(`${label} condition.due 非法`);
      if (typeof condition.owner !== 'string' || !condition.owner.trim()) errors.push(`${label} condition.owner 为空`);
    }
  }
  if (typeof decision.residual_risk !== 'string' || (decision.risk === 'high' && !decision.residual_risk.trim())) {
    errors.push(`${label} high risk 必须写 residual_risk`);
  }
  if (!decision.human || decision.human.name !== owner) errors.push(`${label} human.name 必须是 owner ${owner}`);
  if (!decision.human || typeof decision.human.decision !== 'string' || !decision.human.decision.trim()) errors.push(`${label} human.decision 为空`);
  if (!decision.human || !isIso(decision.human.at)) errors.push(`${label} human.at 非法`);
  if (!decision.attestation || typeof decision.attestation !== 'object') {
    errors.push(`${label} 缺 attestation`);
    return;
  }
  if (typeof decision.attestation.path !== 'string' || !decision.attestation.path.trim()) {
    errors.push(`${label} attestation.path 为空`);
    return;
  }
  let attestationPath;
  try {
    attestationPath = safeInProject(project, decision.attestation.path);
  } catch (error) {
    errors.push(`${label} attestation 路径：${error.message}`);
    return;
  }
  const attestationsDir = path.resolve(p.attestations);
  if (!attestationPath.startsWith(`${attestationsDir}${path.sep}`)) {
    errors.push(`${label} attestation 必须在 workspace/evidence/attestations/ 下`);
  }
  if (!fs.existsSync(attestationPath)) {
    errors.push(`${label} attestation 不存在：${decision.attestation.path}`);
    return;
  }
  const attestation = readJsonMaybe(attestationPath);
  for (const error of attestationErrors(project, attestation)) errors.push(`${label} ${error}`);
  if (attestation && attestation.project !== readJsonMaybe(path.join(project, 'PROJECT.json'))?.project) {
    errors.push(`${label} attestation 项目不匹配`);
  }
  if (attestation && (attestation.tree_hash !== currentTree || decision.attestation.tree_hash !== currentTree)) {
    errors.push(`${label} tree 不一致：decision/attestation 与当前树不同`);
  }
  const riskRank = { low: 1, medium: 2, high: 3 };
  if (attestation && riskRank[decision.risk] > riskRank[attestation.risk]) {
    errors.push(`${label} risk 高于 attestation.risk（${decision.risk} > ${attestation.risk}）`);
  }
  if (decision.backfilled === true) {
    if (!isIso(decision.backfilled_at)) errors.push(`${label} backfilled_at 非法`);
    if (!decision.human?.source) errors.push(`${label} backfilled 缺 human.source`);
    if (!decision.legacy || typeof decision.legacy !== 'object') errors.push(`${label} backfilled 缺 legacy`);
    if (isIso(decision.human?.at) && isIso(decision.backfilled_at) && Date.parse(decision.human.at) > Date.parse(decision.backfilled_at)) {
      errors.push(`${label} human.at 晚于 backfilled_at`);
    }
  } else if (decision.backfilled !== undefined) {
    errors.push(`${label} backfilled 必须是 true 或不存在`);
  }
  if (decision.risk === 'high') {
    if (!decision.independent_review || typeof decision.independent_review.path !== 'string' || typeof decision.independent_review.sha256 !== 'string') {
      errors.push(`${label} high risk 缺 independent_review`);
    } else {
      let reviewPath;
      try {
        reviewPath = safeInProject(project, decision.independent_review.path);
      } catch (error) {
        errors.push(`${label} independent_review 路径：${error.message}`);
      }
      if (reviewPath && (!fs.existsSync(reviewPath) || normalizeHash(hashFile(reviewPath)) !== normalizeHash(decision.independent_review.sha256))) {
        errors.push(`${label} independent_review 缺失或哈希不匹配`);
      }
    }
    if (decision.backfilled !== true) {
      if (!['frozen', 'active'].includes(state?.stage?.state)) {
        errors.push(`${label} high risk 非回填 decision 要求 stage frozen/active`);
      } else {
        const freezePath = state.stage.freeze ? safeInProject(project, state.stage.freeze) : undefined;
        if (!freezePath || !fs.existsSync(freezePath)) errors.push(`${label} high risk 缺 freeze 文件`);
        else {
          const freeze = readJsonMaybe(freezePath);
          if (!freeze || freeze.kind !== 'freeze') errors.push(`${label} freeze 文件非法`);
          else if (typeof freeze.tree_hash !== 'string') errors.push(`${label} freeze.tree_hash 缺失`);
        }
      }
      if (attestation?.reviewer?.independent !== true) errors.push(`${label} high risk 非回填 decision 要求 independent verify`);
    }
  }
}

function checkDissent(dir, errors) {
  const p = projectPaths(dir);
  if (!fs.existsSync(p.dissent)) return;
  for (const name of fs.readdirSync(p.dissent).filter((item) => item.endsWith('.json'))) {
    const value = readJsonMaybe(path.join(p.dissent, name));
    if (!value) {
      errors.push(`dissent ${name} 无法解析`);
      continue;
    }
    if (value.status === 'open' && (value.severity === 'S1' || value.severity === 'S2')) {
      errors.push(`开放 ${value.severity} 异议：${value.id ?? name}`);
    }
  }
}

function checkEvolution(dir, state, errors) {
  const p = projectPaths(dir);
  if (!fs.existsSync(p.candidates)) {
    errors.push('缺少 workspace/evolution/candidates/');
    return;
  }
  const ledger = readLedger(dir);
  const candidates = new Map();
  for (const name of fs.readdirSync(p.candidates).filter((item) => item.endsWith('.json')).sort()) {
    const file = path.join(p.candidates, name);
    const value = readJsonMaybe(file);
    if (!value) {
      errors.push(`candidate ${name} 无法解析`);
      continue;
    }
    if (!value.id || value.id !== name.replace(/\.json$/, '')) errors.push(`candidate ${name} id 与文件名不一致`);
    if (!CANDIDATE_TYPES.has(value.type)) errors.push(`candidate ${value.id} type 非法`);
    if (!CANDIDATE_SCOPES.has(value.scope)) errors.push(`candidate ${value.id} scope 非法`);
    if (!CANDIDATE_STATES.has(value.status)) errors.push(`candidate ${value.id} status 非法`);
    if (typeof value.observation !== 'string' || !value.observation.trim()) errors.push(`candidate ${value.id} observation 为空`);
    if (typeof value.change !== 'string' || !value.change.trim()) errors.push(`candidate ${value.id} change 为空`);
    if (typeof value.expected !== 'string' || !value.expected.trim()) errors.push(`candidate ${value.id} expected 为空`);
    if (typeof value.rollback !== 'string' || !value.rollback.trim()) errors.push(`candidate ${value.id} rollback 为空`);
    candidates.set(value.id, value);
  }
  const adopted = new Set(ledger.filter((event) => event.event === 'adopted').map((event) => event.id));
  for (const id of state.evolution?.active ?? []) {
    const candidate = candidates.get(id);
    if (!candidate) errors.push(`state.evolution.active 引用了不存在的 candidate：${id}`);
    else if (candidate.status !== 'adopted') errors.push(`active candidate ${id} 不是 adopted`);
    if (!adopted.has(id)) errors.push(`active candidate ${id} 没有 adopted ledger 记录`);
  }
  for (const candidate of candidates.values()) {
    if (candidate.status === 'adopted' && !adopted.has(candidate.id)) errors.push(`candidate ${candidate.id} adopted 但 ledger 无记录`);
    if (candidate.status === 'adopted' && candidate.scope === 'project') {
      if (!candidate.evaluation?.e1) errors.push(`project candidate ${candidate.id} adopted 但缺 E1 通过证据`);
      for (const key of ['tests', 'probe']) {
        const log = candidate.evaluation?.logs?.[key];
        if (!log || typeof log.path !== 'string' || typeof log.sha256 !== 'string') {
          errors.push(`project candidate ${candidate.id} 缺 ${key} 日志/hash`);
          continue;
        }
        let abs;
        try {
          abs = safeInProject(p.project, log.path);
        } catch (error) {
          errors.push(`project candidate ${candidate.id} ${key} 日志路径：${error.message}`);
          continue;
        }
        if (!fs.existsSync(abs) || normalizeHash(hashFile(abs)) !== normalizeHash(log.sha256)) errors.push(`project candidate ${candidate.id} ${key} 日志缺失或哈希不匹配`);
      }
    }
    if (candidate.status === 'adopted' && candidate.scope === 'governance') {
      if (!candidate.human || candidate.human.name !== state.owner?.name || !candidate.human.decision) {
        errors.push(`governance candidate ${candidate.id} 缺人类决定`);
      }
      if (!candidate.evaluation?.review?.path || !candidate.evaluation?.review?.sha256) {
        errors.push(`governance candidate ${candidate.id} 缺独立 review`);
      } else {
        let reviewPath;
        try {
          reviewPath = safeInProject(p.project, candidate.evaluation.review.path);
        } catch (error) {
          errors.push(`governance candidate ${candidate.id} review 路径：${error.message}`);
        }
        if (reviewPath && (!fs.existsSync(reviewPath) || normalizeHash(hashFile(reviewPath)) !== normalizeHash(candidate.evaluation.review.sha256))) {
          errors.push(`governance candidate ${candidate.id} review 缺失或哈希不匹配`);
        }
      }
    }
  }
}

function cmdCheck(args, flags) {
  const dir = requireDir(args, 'check');
  const p = projectPaths(dir);
  const project = p.project;
  const errors = [];
  const warnings = [];
  const manifest = readJsonMaybe(path.join(project, 'PROJECT.json'));
  if (!manifest) {
    fail('check：缺少 PROJECT.json');
  }
  for (const required of [
    p.state,
    p.status,
    p.criteria,
    p.workspace,
    p.evidence,
    p.attestations,
    p.decisions,
    p.evolution,
    p.candidates,
    p.ledger,
    p.memory,
    p.archive,
    path.join(dir, 'bin', 'aecw.mjs'),
    path.join(project, 'README.md'),
    path.join(project, 'AGENTS.md'),
  ]) {
    if (!fs.existsSync(required)) errors.push(`缺少 ${rel(project, required)}`);
  }
  if (!fs.existsSync(path.join(p.memory, 'direction.md'))) errors.push('缺少 workspace/memory/direction.md');
  for (const forbidden of [
    path.join(dir, 'gates'),
    path.join(dir, 'cluster'),
    path.join(dir, 'human'),
    path.join(dir, 'inbox'),
    path.join(dir, 'core'),
    path.join(dir, 'BLUEPRINT.md'),
    path.join(dir, 'AGENTS.md'),
    path.join(dir, 'ledger.md'),
    path.join(dir, 'workspace', 'landing'),
    path.join(dir, 'workspace', 'work'),
  ]) {
    if (fs.existsSync(forbidden)) errors.push(`旧当前路径仍在，应归档：${rel(project, forbidden)}`);
  }

  let state;
  try {
    state = loadState(dir);
  } catch (error) {
    console.error(`FAIL  state.json 无法解析：${error.message}`);
    process.exit(1);
  }
  if (!state || typeof state !== 'object') errors.push('state.json 不是对象');
  if (typeof state.project !== 'string' || !state.project) errors.push('state.project 为空');
  if (state.project && manifest?.project && state.project !== manifest.project) errors.push('state.project 与 PROJECT.json 不一致');
  if (!state.owner || typeof state.owner.name !== 'string' || !state.owner.name.trim()) errors.push('state.owner.name 为空');
  if (!STAGE_STATES.has(state.stage?.state)) errors.push(`state.stage.state 非法：${state.stage?.state}`);
  if (!RELEASE_STATES.has(state.release?.state)) errors.push(`state.release.state 非法：${state.release?.state}`);
  if (!RISKS.has(state.risk)) errors.push(`state.risk 非法：${state.risk}`);
  if (!Array.isArray(state.evolution?.active)) errors.push('state.evolution.active 必须是数组');
  if (!isDate(state.updated)) errors.push(`state.updated 非法：${state.updated}`);

  const productRoot = path.resolve(project, manifest?.roots?.product ?? '.');
  if (!fs.existsSync(productRoot)) errors.push(`产品根不存在：${productRoot}`);
  const packageFile = path.join(productRoot, 'package.json');
  const packageJson = readJsonMaybe(packageFile);
  if (!packageJson) errors.push('产品 package.json 不存在或无法解析');
  else if (packageJson.version !== state.release?.version) errors.push(`产品版本 ${packageJson.version} 与 state.release.version ${state.release?.version} 不一致`);

  if (manifest?.roots?.governance && path.basename(dir) !== manifest.roots.governance) {
    errors.push(`治理目录名与 PROJECT.json 不一致：${path.basename(dir)} vs ${manifest.roots.governance}`);
  }
  if (manifest?.roots?.workspace && path.resolve(project, manifest.roots.workspace) !== path.resolve(p.workspace)) {
    errors.push('PROJECT.json roots.workspace 与 aecw/workspace 不一致');
  }
  if (state.links?.product !== (manifest?.roots?.product ?? '.')) errors.push('state.links.product 与 PROJECT.json 不一致');
  for (const [key, link] of Object.entries(state.links ?? {})) {
    if (key === 'product') continue;
    if (typeof link !== 'string') {
      errors.push(`state.links.${key} 不是路径`);
      continue;
    }
    try {
      const abs = safeInProject(project, link);
      if (!fs.existsSync(abs)) errors.push(`state.links.${key} 不存在：${link}`);
    } catch (error) {
      errors.push(`state.links.${key}：${error.message}`);
    }
  }

  if (manifest?.tool?.version !== TOOL_VERSION) errors.push(`PROJECT.tool.version ${manifest?.tool?.version} 与工具 ${TOOL_VERSION} 不一致`);
  if (manifest?.tool?.hash && normalizeHash(manifest.tool.hash) !== normalizeHash(hashFile(CLI))) errors.push('PROJECT.tool.hash 与当前 aecw.mjs 不一致');
  for (const command of ['test', 'probe', 'governance', 'check']) {
    if (typeof manifest?.commands?.[command] !== 'string' || !manifest.commands[command].trim()) errors.push(`PROJECT.commands.${command} 缺失`);
  }

  let decisions = [];
  try {
    decisions = loadDecisions(dir);
  } catch (error) {
    errors.push(`decisions 无法解析：${error.message}`);
  }
  const currentTree = treeHash(dir);
  for (const decision of decisions) {
    if (decision.__rel.split('/').pop() !== `${decision.id}.json`) errors.push(`decision 文件名与 id 不一致：${decision.__rel}`);
    validateDecision(dir, decision, state.owner?.name, currentTree, errors, state);
  }
  if ((state.release?.state === 'released' || state.release?.state === 'conditional') && !state.release?.decision) {
    errors.push('已发布版本缺 state.release.decision（不允许 migration 空窗）');
  }
  if (state.release?.decision) {
    let decisionPath;
    try {
      decisionPath = safeInProject(project, state.release.decision);
    } catch (error) {
      errors.push(`state.release.decision：${error.message}`);
    }
    if (decisionPath) {
      if (!fs.existsSync(decisionPath)) errors.push(`state.release.decision 不存在：${state.release.decision}`);
      else {
        const decision = decisions.find((row) => row.__rel === state.release.decision || row.id === path.basename(state.release.decision, '.json'));
        if (!decision) errors.push('state.release.decision 不是有效 decision');
        else if (!String(decision.scope).startsWith('release')) errors.push('state.release.decision 的 scope 不是 release');
      }
    }
  }
  if (state.migration?.active) {
    errors.push('state.migration.active 不被 check 接受；最终状态必须是 decision 或 unreleased');
  }

  if (state.stage?.state === 'frozen' || state.stage?.state === 'active') {
    const freezePath = state.stage.freeze ? safeInProject(project, state.stage.freeze) : undefined;
    if (!freezePath || !fs.existsSync(freezePath)) errors.push('stage frozen/active 但缺 freeze 文件');
    else {
      const freeze = readJsonMaybe(freezePath);
      if (!freeze || freeze.kind !== 'freeze') errors.push('freeze 文件不是 kind freeze');
      // frozen（未 start）必须仍等于基线；active 允许在冻结授权的范围内实现变更，由 final verify 绑定新树。
      else if (state.stage.state === 'frozen' && freeze.tree_hash !== currentTree) errors.push('freeze.tree_hash 与当前树不一致');
    }
  }

  const expectedStatus = renderStatus(state, decisions);
  const actualStatus = fs.existsSync(p.status) ? fs.readFileSync(p.status, 'utf8') : '';
  if (actualStatus !== expectedStatus) errors.push('STATUS.md 与 state/decisions 生成结果不一致（运行 render）');
  const expectedCriteria = renderCriteria(decisions);
  const actualCriteria = fs.existsSync(p.criteria) ? fs.readFileSync(p.criteria, 'utf8') : '';
  if (actualCriteria !== expectedCriteria) errors.push('criteria.md 与 decisions.conditions 生成结果不一致（运行 render）');
  const conditionCount = collectConditions(decisions).length;
  const allConditionCount = decisions.reduce((sum, decision) => sum + (decision.conditions?.length ?? 0), 0);
  if (allConditionCount > MAX_CRITERIA) errors.push(`当前阻塞项 ${allConditionCount} 超过上限 ${MAX_CRITERIA}`);
  if (conditionCount > MAX_CRITERIA) errors.push(`criteria 行数 ${conditionCount} 超过上限 ${MAX_CRITERIA}`);

  const readme = fs.existsSync(path.join(project, 'README.md')) ? fs.readFileSync(path.join(project, 'README.md'), 'utf8') : '';
  if (state.release?.version && !readme.includes(String(state.release.version))) errors.push('README.md 未包含当前版本号');
  const agents = fs.existsSync(path.join(project, 'AGENTS.md')) ? fs.readFileSync(path.join(project, 'AGENTS.md'), 'utf8') : '';
  if (!agents.includes('state.json')) errors.push('AGENTS.md 未指向 state.json');

  checkDissent(dir, errors);
  checkEvolution(dir, state, errors);

  console.log(`AECW ${TOOL_VERSION} · check ${dir}`);
  if (warnings.length) for (const warning of warnings) console.log(`WARN  ${warning}`);
  if (errors.length) {
    for (const error of errors) console.error(`FAIL  ${error}`);
    console.log(`结果：FAIL ${errors.length}｜WARN ${warnings.length}`);
    process.exit(1);
  }
  console.log(`  OK    state / STATUS / decisions / evolution / archive`);
  console.log(`  OK    tree ${currentTree}`);
  console.log(`  OK    decisions ${decisions.length}｜conditions ${allConditionCount}｜active evolution ${state.evolution.active.length}`);
  console.log(`结果：FAIL 0｜WARN ${warnings.length}`);
}

function cmdRender(args) {
  const dir = requireDir(args, 'render');
  acquireLock(dir);
  const result = renderAll(dir);
  const project = projectRootOf(dir);
  console.log(`rendered ${rel(project, result.status)}`);
  console.log(`rendered ${rel(project, result.criteria)}`);
}

function cmdStatus(args) {
  const dir = requireDir(args, 'status');
  const state = loadState(dir);
  const decisions = loadDecisions(dir);
  const conditions = collectConditions(decisions);
  console.log(JSON.stringify({ state, decisions: decisions.map((row) => ({ id: row.id, scope: row.scope, risk: row.risk, human: row.human, conditions: row.conditions })), blockers: conditions }, null, 2));
}

function cmdTree(args) {
  const dir = requireDir(args, 'tree');
  console.log(treeHash(dir));
}

function cmdVerify(args, flags) {
  const dir = requireDir(args, 'verify');
  const p = projectPaths(dir);
  const project = p.project;
  const manifest = projectManifest(project);
  const reviewer = one(flags, 'reviewer', undefined);
  if (typeof reviewer !== 'string' || !reviewer.trim()) fail('verify 需要 --reviewer <name>');
  const risk = one(flags, 'risk', loadState(dir).risk);
  if (!RISKS.has(risk)) fail(`verify --risk 非法：${risk}`);
  const reviewerSession = one(flags, 'reviewer-session', '-');
  const independent = bool(flags, 'independent');
  const state = loadState(dir);
  const before = treeHash(dir);
  const id = `VA-${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}-${crypto.randomBytes(3).toString('hex')}`;
  ensureDir(p.attestations);
  const checkLog = path.join(p.attestations, `${id}-check.log`);
  const probeLog = path.join(p.attestations, `${id}-probe.log`);
  const testLog = path.join(p.attestations, `${id}-test.log`);
  const governanceLog = path.join(p.attestations, `${id}-governance.log`);

  const checkRun = runCaptured(process.execPath, [CLI, 'check', dir], project, checkLog, { timeout: 120000 });
  const probeRun = runCommandString(manifest.commands?.probe, project, probeLog, 120000);
  const testRun = runCommandString(manifest.commands?.test, project, testLog, 900000);
  const governanceRun = runCommandString(manifest.commands?.governance, project, governanceLog, 900000);
  const after = treeHash(dir);
  const failures = [];
  if (checkRun.status !== 0) failures.push('check 未通过');
  if (probeRun.status !== 0) failures.push('probe 未通过');
  if (testRun.status !== 0) failures.push('tests 未通过');
  if (governanceRun.status !== 0) failures.push('governance tests 未通过');
  if (before !== after) failures.push('验证期间树发生变化');

  const parseCount = (output, key) => {
    const match = output.match(new RegExp(`ℹ ${key} (\\d+)`));
    return match ? Number(match[1]) : null;
  };
  const passCount = parseCount(testRun.output, 'pass');
  const failCount = parseCount(testRun.output, 'fail');
  const govPass = parseCount(governanceRun.output, 'pass');
  const govFail = parseCount(governanceRun.output, 'fail');
  const facts = [
    `check ${checkRun.status === 0 ? 'PASS' : 'FAIL'}`,
    `probe ${probeRun.status === 0 ? 'PASS' : 'FAIL'}`,
    `tests ${testRun.status === 0 ? 'PASS' : 'FAIL'}${passCount ? `（pass ${passCount}${failCount ? ` / fail ${failCount}` : ''}）` : ''}`,
    `governance ${governanceRun.status === 0 ? 'PASS' : 'FAIL'}${govPass ? `（pass ${govPass}${govFail ? ` / fail ${govFail}` : ''}）` : ''}`,
    `tree ${before}`,
  ];
  const attestation = {
    kind: 'verify',
    version: 2,
    id,
    ok: failures.length === 0,
    project: manifest.project,
    risk,
    created_at: NOW(),
    expires_at: new Date(Date.now() + ATTESTATION_MAX_AGE_MS).toISOString(),
    reviewer: { name: reviewer, session: reviewerSession, independent },
    git: gitFacts(project),
    tree_hash: before,
    state_hash: hashFile(p.state),
    product_hash: productHash(project, manifest),
    checks: {
      check: { status: checkRun.status === 0 ? 'pass' : 'fail', exit: checkRun.status },
      probe: { status: probeRun.status === 0 ? 'pass' : 'fail', exit: probeRun.status },
      tests: { status: testRun.status === 0 ? 'pass' : 'fail', exit: testRun.status, pass: passCount, fail: failCount },
      governance: { status: governanceRun.status === 0 ? 'pass' : 'fail', exit: governanceRun.status, pass: govPass, fail: govFail },
    },
    logs: {
      check: { path: rel(project, checkLog), sha256: hashFile(checkLog) },
      probe: { path: rel(project, probeLog), sha256: hashFile(probeLog) },
      tests: { path: rel(project, testLog), sha256: hashFile(testLog) },
      governance: { path: rel(project, governanceLog), sha256: hashFile(governanceLog) },
    },
    facts,
    failures,
  };
  const attestationPath = path.join(p.attestations, `${id}.json`);
  writeJson(attestationPath, attestation);
  console.log(`${attestation.ok ? 'PASS' : 'FAIL'} verify · ${id}｜risk ${risk}`);
  console.log(`  tree      ${before}`);
  console.log(`  product   ${attestation.product_hash}`);
  console.log(`  checks    check ${attestation.checks.check.status}｜probe ${attestation.checks.probe.status}｜tests ${attestation.checks.tests.status}`);
  console.log(`  attestation ${rel(project, attestationPath)}`);
  if (!attestation.ok) {
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
}

function cmdDecide(args, flags) {
  const dir = requireDir(args, 'decide');
  acquireLock(dir);
  const p = projectPaths(dir);
  const project = p.project;
  const state = loadState(dir);
  const owner = state.owner?.name;
  if (!owner) fail('state.owner.name 为空');
  const attestationFlag = one(flags, 'attestation', undefined);
  if (!attestationFlag) fail('decide 需要 --attestation <verify json>');
  const attestationPath = safeInProject(project, attestationFlag);
  const attestationsDir = path.resolve(p.attestations);
  if (!attestationPath.startsWith(`${attestationsDir}${path.sep}`)) fail('attestation 必须在 workspace/evidence/attestations/ 下');
  if (!fs.existsSync(attestationPath)) fail(`attestation 不存在：${attestationFlag}`);
  const attestation = readJsonMaybe(attestationPath);
  const attestationProblems = attestationErrors(project, attestation);
  if (attestationProblems.length) fail(attestationProblems.join('；'));
  if (attestation.project !== projectManifest(project).project) fail('attestation 项目不匹配');
  const currentTree = treeHash(dir);
  if (attestation.tree_hash !== currentTree) fail('attestation tree 与当前树不一致；重新 verify');
  if (!isIso(attestation.expires_at) || Date.parse(attestation.expires_at) < Date.now()) fail('attestation 已过期');
  const scope = one(flags, 'scope', undefined);
  if (typeof scope !== 'string' || !scope.trim()) fail('decide 需要 --scope');
  const risk = one(flags, 'risk', state.risk);
  if (!RISKS.has(risk)) fail(`decide --risk 非法：${risk}`);
  if (String(scope).toLowerCase().startsWith('release') && risk !== 'high') fail('release decision 必须是 high risk');
  if (state.risk === 'high' && String(scope).toLowerCase().startsWith('release') && risk !== 'high') fail('release decision 在 state.risk=high 时不得降级为 low/medium');
  const riskRank = { low: 1, medium: 2, high: 3 };
  if (riskRank[risk] > riskRank[attestation.risk]) fail(`decision risk ${risk} 高于 attestation.risk ${attestation.risk}`);
  const by = one(flags, 'by', undefined);
  if (by !== owner) fail(`decide --by 必须是 owner ${owner}`);
  const humanDecision = one(flags, 'decision', undefined);
  if (typeof humanDecision !== 'string' || !humanDecision.trim()) fail('decide 需要 --decision');
  const id = one(flags, 'id', `DR-${DATE}-${slug(scope)}`);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/.test(id)) fail(`decision id 非法：${id}`);
  const decisionPath = path.join(p.decisions, `${id}.json`);
  if (fs.existsSync(decisionPath)) fail(`decision 已存在：${rel(project, decisionPath)}`);

  const facts = [...new Set([...(attestation.facts ?? []), ...list(flags, 'fact')].map((fact) => String(fact).trim()).filter(Boolean))];
  if (facts.length === 0) fail('decision facts 不能为空');
  const evidence = [];
  const addEvidence = (file) => {
    const abs = safeInProject(project, file);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) fail(`evidence 不存在：${file}`);
    const relative = rel(project, abs);
    if (!evidence.some((row) => row.path === relative)) evidence.push({ path: relative, sha256: hashFile(abs) });
  };
  addEvidence(rel(project, attestationPath));
  for (const log of Object.values(attestation.logs ?? {})) addEvidence(log.path);
  for (const file of list(flags, 'evidence')) addEvidence(file);
  if (evidence.length === 0) fail('decision evidence 不能为空');

  const conditions = [];
  for (const text of list(flags, 'condition')) {
    const [body, due = null, conditionOwner = owner] = String(text).split('|').map((part) => part.trim());
    if (!body) fail(`condition 为空：${text}`);
    if (due && !isDate(due)) fail(`condition due 非法：${due}`);
    conditions.push({ text: body, due: due || null, owner: conditionOwner || owner });
  }
  const existingConditions = loadDecisions(dir).reduce((sum, decision) => sum + (decision.conditions?.length ?? 0), 0);
  if (existingConditions + conditions.length > MAX_CRITERIA) fail(`conditions 总数超过 ${MAX_CRITERIA}`);
  const residual = one(flags, 'residual', undefined);
  if (risk === 'high' && (typeof residual !== 'string' || !residual.trim())) fail('high risk 必须写 --residual');
  let independentReview = null;
  if (risk === 'high') {
    const reviewFlag = one(flags, 'independent-review', undefined);
    if (typeof reviewFlag !== 'string' || !reviewFlag.trim()) fail('high risk 必须提供 --independent-review <path>');
    const reviewPath = safeInProject(project, reviewFlag);
    if (!fs.existsSync(reviewPath) || !fs.readFileSync(reviewPath, 'utf8').trim()) fail(`independent review 为空：${reviewFlag}`);
    independentReview = { path: rel(project, reviewPath), sha256: hashFile(reviewPath) };
  }
  const humanAt = one(flags, 'human-at', NOW());
  if (!isIso(humanAt)) fail(`human-at 非法：${humanAt}`);
  const humanSource = one(flags, 'human-source', undefined);
  const backfill = bool(flags, 'backfill');
  const legacy = {};
  for (const key of ['legacy-tag', 'legacy-commit', 'legacy-note']) {
    const value = one(flags, key, undefined);
    if (value !== undefined) legacy[key.replace('legacy-', '')] = value;
  }
  if (risk === 'high') {
    if (backfill) {
      if (!humanSource) fail('high risk backfill 必须写 --human-source');
      if (!legacy.tag) fail('high risk backfill 必须写 --legacy-tag');
    } else {
      if (!['frozen', 'active'].includes(state.stage?.state)) fail('high risk 非回填 decision 要求 stage frozen/active');
      const freezePath = state.stage.freeze ? safeInProject(project, state.stage.freeze) : undefined;
      if (!freezePath || !fs.existsSync(freezePath)) fail('high risk 非回填 decision 缺 freeze 文件');
      const freeze = readJsonMaybe(freezePath);
      if (!freeze || freeze.kind !== 'freeze' || typeof freeze.tree_hash !== 'string') fail('freeze 文件非法/缺 tree_hash');
      if (attestation.reviewer?.independent !== true) fail('high risk 非回填 decision 要求 independent verify');
    }
  }
  const decision = {
    id,
    kind: 'decision',
    scope,
    risk,
    facts,
    evidence,
    conditions,
    residual_risk: residual ?? 'none',
    human: { name: owner, decision: humanDecision, at: humanAt, ...(humanSource ? { source: humanSource } : {}) },
    attestation: { path: rel(project, attestationPath), id: attestation.id, tree_hash: attestation.tree_hash },
    created_at: NOW(),
    ...(independentReview ? { independent_review: independentReview } : {}),
    ...(backfill ? { backfilled: true, backfilled_at: NOW() } : {}),
    ...(Object.keys(legacy).length ? { legacy } : {}),
  };
  const previous = {
    state: fs.readFileSync(p.state, 'utf8'),
    status: fs.readFileSync(p.status, 'utf8'),
    criteria: fs.readFileSync(p.criteria, 'utf8'),
  };
  const rollback = () => {
    try { writeAtomic(p.state, previous.state); } catch { /* ignore */ }
    try { writeAtomic(p.status, previous.status); } catch { /* ignore */ }
    try { writeAtomic(p.criteria, previous.criteria); } catch { /* ignore */ }
    try { fs.rmSync(decisionPath, { force: true }); } catch { /* ignore */ }
  };
  try {
    writeJson(decisionPath, decision);
    if (String(scope).toLowerCase().startsWith('release')) {
      state.release = { ...(state.release ?? {}), state: conditions.length > 0 ? 'conditional' : 'released', decision: rel(project, decisionPath) };
      state.migration = null;
    } else if (String(scope).toLowerCase().startsWith('stage')) {
      state.stage = { ...(state.stage ?? {}), decision: rel(project, decisionPath) };
    }
    state.updated = DATE;
    saveState(dir, state);
    renderAll(dir);
    const check = runCaptured(process.execPath, [CLI, 'check', dir], project, path.join(p.evidence, 'decide-check.log'), { timeout: 120000 });
    if (check.status !== 0) {
      rollback();
      console.error(check.output);
      fail('decide 后 check 失败；已回滚 decision/state/STATUS/criteria');
    }
  } catch (error) {
    rollback();
    fail(`decide 失败，已回滚：${error?.message ?? error}`);
  }
  console.log(`decision ${id}`);
  console.log(`  ${rel(project, decisionPath)}`);
}

function cmdEvolve(args, flags) {
  const sub = args[0];
  const dir = requireDir(args.slice(1), 'evolve');
  acquireLock(dir);
  const p = projectPaths(dir);
  const project = p.project;
  const state = loadState(dir);
  ensureDir(p.candidates);
  const candidatePath = (id) => path.join(p.candidates, `${requireId(id, 'candidate id')}.json`);
  const loadCandidate = (id) => {
    const file = candidatePath(id);
    if (!fs.existsSync(file)) fail(`candidate 不存在：${id}`);
    return readJson(file);
  };
  const saveCandidate = (candidate) => writeJson(candidatePath(candidate.id), candidate);
  if (sub === 'propose') {
    const id = one(flags, 'id', `EV-${DATE}-${crypto.randomBytes(2).toString('hex')}`);
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/.test(id)) fail(`candidate id 非法：${id}`);
    if (fs.existsSync(candidatePath(id))) fail(`candidate 已存在：${id}`);
    const type = one(flags, 'type', undefined);
    const scope = one(flags, 'scope', undefined);
    if (!CANDIDATE_TYPES.has(type)) fail('evolve propose --type 非法');
    if (!CANDIDATE_SCOPES.has(scope)) fail('evolve propose --scope 非法');
    const observation = one(flags, 'observation', undefined);
    const change = one(flags, 'change', undefined);
    const expected = one(flags, 'expected', undefined);
    const rollback = one(flags, 'rollback', undefined);
    const risk = one(flags, 'risk', 'low');
    if (!RISKS.has(risk)) fail('evolve propose --risk 非法');
    if (!observation || !change || !expected || !rollback) fail('propose 需要 observation/change/expected/rollback');
    const candidate = {
      id,
      type,
      scope,
      observation,
      evidence: list(flags, 'evidence'),
      change,
      expected,
      risk,
      rollback,
      run: one(flags, 'run', DATE),
      status: 'proposed',
      created_at: NOW(),
    };
    const sameRun = fs.readdirSync(p.candidates).filter((name) => name.endsWith('.json')).map((name) => readJsonMaybe(path.join(p.candidates, name))).filter(Boolean).filter((row) => row.run === candidate.run);
    if (sameRun.length > 0) fail(`run ${candidate.run} 已有候选；每轮最多 1 个`);
    saveCandidate(candidate);
    appendLedger(dir, { event: 'proposed', id, scope, risk, run: candidate.run });
    console.log(`candidate ${id} proposed`);
    return;
  }
  if (sub === 'evaluate') {
    const id = one(flags, 'id', undefined);
    if (!id) fail('evolve evaluate 需要 --id');
    const candidate = loadCandidate(id);
    if (candidate.status !== 'proposed' && candidate.status !== 'evaluated') fail(`candidate ${id} 状态不可评估：${candidate.status}`);
    const evaluation = { at: NOW() };
    if (candidate.scope === 'project') {
      const testsFlag = passFlag(flags, 'tests-pass');
      const probeFlag = passFlag(flags, 'probe-pass');
      if (testsFlag === false || probeFlag === false) {
        evaluation.e1 = false;
        evaluation.forced_failure = true;
        evaluation.tests_pass = testsFlag !== false;
        evaluation.probe_pass = probeFlag !== false;
      } else {
        ensureDir(p.evidence);
        const testLog = path.join(p.evidence, 'evolution', `${requireId(id, 'candidate id')}-tests.log`);
        const probeLog = path.join(p.evidence, 'evolution', `${requireId(id, 'candidate id')}-probe.log`);
        const tests = runCommandString(projectManifest(project).commands?.test, project, testLog, 900000);
        const probe = runCommandString(projectManifest(project).commands?.probe, project, probeLog, 120000);
        evaluation.e1 = tests.status === 0 && probe.status === 0;
        evaluation.tests_pass = tests.status === 0;
        evaluation.probe_pass = probe.status === 0;
        evaluation.logs = {
          tests: { path: rel(project, testLog), sha256: hashFile(testLog) },
          probe: { path: rel(project, probeLog), sha256: hashFile(probeLog) },
        };
      }
    } else {
      const review = one(flags, 'independent-review', undefined);
      if (!review) fail('governance candidate 需要 --independent-review');
      const reviewPath = safeInProject(project, review);
      if (!fs.existsSync(reviewPath) || !fs.readFileSync(reviewPath, 'utf8').trim()) fail(`independent review 为空：${review}`);
      evaluation.e2 = true;
      evaluation.review = { path: rel(project, reviewPath), sha256: hashFile(reviewPath) };
    }
    candidate.status = 'evaluated';
    candidate.evaluation = evaluation;
    saveCandidate(candidate);
    appendLedger(dir, { event: 'evaluated', id, e1: evaluation.e1 ?? null, e2: evaluation.e2 ?? null });
    console.log(`candidate ${id} evaluated：${candidate.scope === 'project' ? `E1 ${evaluation.e1 ? 'PASS' : 'FAIL'}` : 'E2 review recorded'}`);
    return;
  }
  if (sub === 'adopt') {
    const id = one(flags, 'id', undefined);
    if (!id) fail('evolve adopt 需要 --id');
    const candidate = loadCandidate(id);
    if (candidate.status !== 'evaluated') fail(`candidate ${id} 未评估`);
    if (candidate.scope === 'project') {
      if (!candidate.evaluation?.e1) fail('E1 未通过 tests/probe，不得采纳');
      if (!candidate.evaluation?.logs?.tests?.sha256 || !candidate.evaluation?.logs?.probe?.sha256) fail('E1 缺 tests/probe 日志哈希，不得采纳');
    } else {
      const by = one(flags, 'by', undefined);
      if (by !== state.owner?.name) fail(`E2 adopt --by 必须是 owner ${state.owner?.name}`);
      const decision = one(flags, 'decision', undefined);
      if (decision !== 'accept') fail('E2 adopt 需要人类 --decision accept');
      const review = one(flags, 'independent-review', undefined);
      if (!review) fail('E2 adopt 需要 --independent-review');
      const reviewPath = safeInProject(project, review);
      if (!fs.existsSync(reviewPath) || !fs.readFileSync(reviewPath, 'utf8').trim()) fail('independent review 为空');
      candidate.human = { name: state.owner.name, decision: 'accept', at: NOW() };
      candidate.evaluation = { ...(candidate.evaluation ?? {}), review: { path: rel(project, reviewPath), sha256: hashFile(reviewPath) } };
    }
    candidate.status = 'adopted';
    candidate.adopted_at = NOW();
    saveCandidate(candidate);
    state.evolution = { ...(state.evolution ?? {}), active: [...new Set([...(state.evolution?.active ?? []), id])] };
    state.updated = DATE;
    saveState(dir, state);
    appendLedger(dir, { event: 'adopted', id, scope: candidate.scope });
    renderAll(dir);
    console.log(`candidate ${id} adopted`);
    return;
  }
  if (sub === 'retire') {
    const id = one(flags, 'id', undefined);
    if (!id) fail('evolve retire 需要 --id');
    const candidate = loadCandidate(id);
    candidate.status = 'retired';
    candidate.retired_at = NOW();
    candidate.retired_reason = one(flags, 'reason', 'no improvement');
    saveCandidate(candidate);
    state.evolution = { ...(state.evolution ?? {}), active: (state.evolution?.active ?? []).filter((item) => item !== id) };
    state.updated = DATE;
    saveState(dir, state);
    appendLedger(dir, { event: 'retired', id, reason: candidate.retired_reason });
    renderAll(dir);
    console.log(`candidate ${id} retired`);
    return;
  }
  if (sub === 'list') {
    const rows = fs.readdirSync(p.candidates).filter((name) => name.endsWith('.json')).sort().map((name) => readJson(path.join(p.candidates, name)));
    console.log(JSON.stringify(rows, null, 2));
    return;
  }
  fail('evolve 子命令：propose|evaluate|adopt|retire|list');
}

function cmdChange(args, flags) {
  const dir = requireDir(args, 'change');
  acquireLock(dir);
  const p = projectPaths(dir);
  const state = loadState(dir);
  const id = one(flags, 'id', undefined);
  if (id && one(flags, 'decision', undefined) !== undefined) {
    const safeId = requireId(id, 'change id');
    const file = path.join(p.decisions, `${safeId}.json`);
    if (!fs.existsSync(file)) fail(`change 不存在：${safeId}`);
    const record = readJson(file);
    if (record.kind !== 'change') fail(`${safeId} 不是 change`);
    const by = one(flags, 'by', undefined);
    if (by !== state.owner?.name) fail(`change 裁决 --by 必须是 owner ${state.owner?.name}`);
    record.status = one(flags, 'decision');
    record.human = { name: state.owner.name, decision: record.status, at: NOW() };
    writeJson(file, record);
    console.log(`change ${safeId} → ${record.status}`);
    return;
  }
  const title = one(flags, 'title', undefined);
  if (!title) fail('change 需要 --title 或 --id + --decision');
  const newId = `CH-${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}-${crypto.randomBytes(2).toString('hex')}`;
  writeJson(path.join(p.decisions, `${newId}.json`), {
    id: newId,
    kind: 'change',
    title,
    reason: one(flags, 'reason', ''),
    impact: one(flags, 'impact', ''),
    proposed_by: one(flags, 'by', 'agent'),
    status: 'pending',
    created_at: NOW(),
  });
  console.log(`change ${newId} recorded（人类以 --id ${newId} --decision accept|reject --by ${state.owner?.name} 裁决）`);
}

function cmdFreeze(args, flags) {
  const dir = requireDir(args, 'freeze');
  acquireLock(dir);
  const p = projectPaths(dir);
  const state = loadState(dir);
  if (state.stage?.state === 'active') fail('stage active，不能重复 freeze');
  const by = one(flags, 'by', undefined);
  if (by !== state.owner?.name) fail(`freeze --by 必须是 owner ${state.owner?.name}`);
  const stage = requireId(one(flags, 'stage', undefined), 'stage');
  for (const key of ['scope', 'budget', 'stop', 'acceptance']) {
    if (!one(flags, key, undefined)) fail(`freeze 需要 --${key}`);
  }
  const record = {
    id: `FREEZE-${stage}`,
    kind: 'freeze',
    stage,
    scope: one(flags, 'scope'),
    budget: one(flags, 'budget'),
    stop: one(flags, 'stop'),
    acceptance: one(flags, 'acceptance'),
    tree_hash: treeHash(dir),
    human: { name: state.owner.name, at: NOW() },
    created_at: NOW(),
  };
  const file = path.join(p.decisions, `${record.id}.json`);
  if (fs.existsSync(file)) fail(`freeze 记录已存在，拒绝覆盖：${record.id}`);
  writeJson(file, record);
  state.stage = { name: stage, state: 'frozen', freeze: rel(p.project, file) };
  state.updated = DATE;
  saveState(dir, state);
  renderAll(dir);
  console.log(`freeze ${stage} → ${rel(p.project, file)}`);
}

function cmdStart(args, flags) {
  const dir = requireDir(args, 'start');
  acquireLock(dir);
  const p = projectPaths(dir);
  const state = loadState(dir);
  if (state.stage?.state !== 'frozen') fail(`start 只接受 frozen 阶段，当前 ${state.stage?.state}`);
  const by = one(flags, 'by', undefined);
  if (by !== state.owner?.name) fail(`start --by 必须是 owner ${state.owner?.name}`);
  const file = state.stage.freeze ? safeInProject(p.project, state.stage.freeze) : undefined;
  if (!file || !fs.existsSync(file)) fail('找不到 freeze 文件');
  const freeze = readJson(file);
  if (freeze.tree_hash !== treeHash(dir)) fail('freeze 后树已变化，拒绝 start');
  state.stage = { ...state.stage, state: 'active', started_at: NOW(), started_by: state.owner.name };
  state.updated = DATE;
  saveState(dir, state);
  renderAll(dir);
  console.log(`start ${state.stage.name}`);
}

function cmdDissent(args, flags) {
  const dir = requireDir(args, 'dissent');
  acquireLock(dir);
  const p = projectPaths(dir);
  const severity = String(one(flags, 'severity', '')).toUpperCase();
  if (!['S1', 'S2', 'S3', 'S4'].includes(severity)) fail('dissent --severity 必须是 S1|S2|S3|S4');
  const claim = one(flags, 'claim', undefined);
  if (!claim) fail('dissent 需要 --claim');
  const id = `D-${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}-${crypto.randomBytes(2).toString('hex')}`;
  ensureDir(p.dissent);
  writeJson(path.join(p.dissent, `${id}.json`), {
    id,
    kind: 'dissent',
    severity,
    claim,
    evidence: one(flags, 'evidence', ''),
    status: 'open',
    created_at: NOW(),
  });
  console.log(`dissent ${id}（${severity}）recorded`);
}

function cmdResolve(args, flags) {
  const dir = requireDir(args, 'resolve');
  acquireLock(dir);
  const p = projectPaths(dir);
  const state = loadState(dir);
  const id = requireId(one(flags, 'id', undefined), 'dissent id');
  const by = one(flags, 'by', undefined);
  if (by !== state.owner?.name) fail(`resolve --by 必须是 owner ${state.owner?.name}`);
  const file = path.join(p.dissent, `${id}.json`);
  if (!fs.existsSync(file)) fail(`dissent 不存在：${id}`);
  const record = readJson(file);
  record.status = 'closed';
  record.resolved_by = by;
  record.resolved_at = NOW();
  record.resolution = one(flags, 'reason', '');
  writeJson(file, record);
  console.log(`dissent ${id} closed`);
}

function cmdGate() {
  console.error('DEPRECATED  gate 已废弃：请使用 decide（从 verify attestation + 人类决定生成 decision）；未生成任何空模板。');
  process.exit(2);
}

function cmdInit(rawArgs, flags) {
  const target = rawArgs[0];
  if (!target) fail('init 需要治理目录：node aecw.mjs init aecw --name demo --owner human');
  const dir = path.resolve(target);
  const project = projectRootOf(dir);
  if (fs.existsSync(path.join(dir, 'state.json')) && !bool(flags, 'force')) fail(`init：${dir} 已有 state.json（--force 覆盖）`);
  const owner = one(flags, 'owner', undefined);
  if (!owner) fail('init 需要 --owner <人类>');
  const name = one(flags, 'name', path.basename(project));
  const gov = path.basename(dir);
  ensureDir(dir);
  for (const folder of ['bin', 'workspace/evidence/attestations', 'workspace/decisions', 'workspace/evolution/candidates', 'workspace/memory', 'workspace/archive']) {
    ensureDir(path.join(dir, folder));
  }
  fs.copyFileSync(CLI, path.join(dir, 'bin', 'aecw.mjs'));
  ensureDir(project);
  const projectFile = path.join(project, 'PROJECT.json');
  if (!fs.existsSync(projectFile) || bool(flags, 'force')) {
    writeJson(projectFile, {
      project: name,
      roots: { product: '.', governance: gov, workspace: `${gov}/workspace` },
      install: { target: '.', profile: '' },
      commands: {
        test: 'node -e "console.log(\'ℹ pass 1\')"',
        governance: 'node -e "console.log(\'ℹ pass 1\')"',
        probe: 'node -e "process.exit(0)"',
        check: `node ${gov}/bin/aecw.mjs check ${gov}`,
      },
      tool: { name: 'aecw', version: TOOL_VERSION, mode: 'vendored', hash: hashFile(CLI) },
    });
  }
  const packageFile = path.join(project, 'package.json');
  if (!fs.existsSync(packageFile)) writeJson(packageFile, { name, version: '0.1.0', private: true, type: 'module' });
  const readme = path.join(project, 'README.md');
  if (!fs.existsSync(readme)) writeAtomic(readme, `# ${name}\n\n> 状态：current｜版本：0.1.0\n\n产品说明。\n\nAECW 当前状态见 \`${gov}/STATUS.md\`。\n`);
  const agents = path.join(project, 'AGENTS.md');
  if (!fs.existsSync(agents)) writeAtomic(agents, `# AGENTS · ${name}\n\n> 状态：current\n\n- 单一状态源：\`${gov}/state.json\`。\n- 生成视图：\`${gov}/STATUS.md\`。\n- 决策：\`${gov}/workspace/decisions/\`。\n`);
  const direction = path.join(dir, 'workspace', 'memory', 'direction.md');
  if (!fs.existsSync(direction)) writeAtomic(direction, `# Direction · ${name}\n\n> 状态：current\n\n- 目标：\n- 非目标：\n- 人类只做方向/边界/一次决定/S1-S2。\n`);
  const archive = path.join(dir, 'workspace', 'archive', 'README.md');
  if (!fs.existsSync(archive)) writeAtomic(archive, '# Archive\n\n> 状态：historical\n\n只读历史；不参与当前状态。\n');
  const state = {
    project: name,
    updated: DATE,
    owner: { name: owner },
    stage: { name: 'seed', state: 'seed' },
    release: { version: '0.1.0', state: 'unreleased', decision: null },
    risk: 'low',
    evolution: { active: [] },
    links: { product: '.', evidence: `${gov}/workspace/evidence`, decisions: `${gov}/workspace/decisions` },
    migration: null,
  };
  writeJson(path.join(dir, 'state.json'), state);
  writeAtomic(path.join(dir, 'workspace', 'evolution', 'ledger.jsonl'), '');
  renderAll(dir);
  console.log(`init ${dir}`);
  console.log(`  owner ${owner}｜tool ${TOOL_VERSION}`);
}

function cmdHelp() {
  console.log(`AECW ${TOOL_VERSION} · 精简化治理`);
  console.log('Usage:');
  console.log('  node aecw.mjs check <aecw>');
  console.log('  node aecw.mjs render <aecw>');
  console.log('  node aecw.mjs verify <aecw> --reviewer <name> [--reviewer-session <id>] [--risk low|medium|high] [--independent]');
  console.log('  node aecw.mjs decide <aecw> --attestation <verify.json> --scope <scope> --risk <risk> --by <owner> --decision <text> [--fact ...] [--condition "text|due|owner"] [--residual ...] [--evidence path]');
  console.log('  node aecw.mjs evolve <aecw> propose|evaluate|adopt|retire|list ...');
  console.log('  node aecw.mjs change|freeze|start|dissent|resolve ...');
  console.log('  node aecw.mjs init <aecw> --name <name> --owner <human>');
  console.log('  node aecw.mjs gate   # 已废弃，不生成文件');
  console.log('  node aecw.mjs tree <aecw>');
}

const parsed = parseArgs(process.argv.slice(2));
var flagsGlobal = parsed.flags;
const command = parsed.args[0];
try {
  switch (command) {
    case 'check': cmdCheck(parsed.args.slice(1), parsed.flags); break;
    case 'render': cmdRender(parsed.args.slice(1)); break;
    case 'status': cmdStatus(parsed.args.slice(1)); break;
    case 'tree': cmdTree(parsed.args.slice(1)); break;
    case 'verify': cmdVerify(parsed.args.slice(1), parsed.flags); break;
    case 'decide': cmdDecide(parsed.args.slice(1), parsed.flags); break;
    case 'evolve': cmdEvolve(parsed.args.slice(1), parsed.flags); break;
    case 'change': cmdChange(parsed.args.slice(1), parsed.flags); break;
    case 'freeze': cmdFreeze(parsed.args.slice(1), parsed.flags); break;
    case 'start': cmdStart(parsed.args.slice(1), parsed.flags); break;
    case 'dissent': cmdDissent(parsed.args.slice(1), parsed.flags); break;
    case 'resolve': cmdResolve(parsed.args.slice(1), parsed.flags); break;
    case 'init': cmdInit(parsed.args.slice(1), parsed.flags); break;
    case 'gate': cmdGate(); break;
    case 'help': case undefined: cmdHelp(); break;
    default: fail(`未知命令：${command}`);
  }
} catch (error) {
  fail(error?.stack ?? String(error));
}
