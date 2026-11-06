#!/usr/bin/env node
/**
 * AECW 生态原型 v0.9 — 零依赖文件系统 CLI
 * 用法：node bin/aecw.mjs <command> <dir> [--flags]
 * 设计：人类 / 集群 / 工作区三域；state + criteria + STATUS 视图；异议与事实台账；门禁一页纸。
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CORE = path.join(ROOT, 'core');
const DATE = new Date().toISOString().slice(0, 10);
const TOOL_VERSION = '0.9.4';
const ATTESTATION_MAX_AGE_DAYS = 7;

function usage() {
  console.log(`AECW 生态原型 v${TOOL_VERSION}

用法：
  node bin/aecw.mjs init <dir> --name <名字> --owner <人类所有者> [--goal <目标>]
  node bin/aecw.mjs blueprint <dir> [--stage <阶段>] [--force]
  node bin/aecw.mjs freeze <dir> --charter-confirmed --stage <阶段> --scope <范围> --budget <预算> --stop <停止> --acceptance <验收>
  node bin/aecw.mjs start <dir> --by <人类所有者> [--first-report <报告点>]
  node bin/aecw.mjs pause <dir> --by <人类所有者> [--reason <理由>]
  node bin/aecw.mjs resume <dir> --by <人类所有者>
  node bin/aecw.mjs close <dir> --by <人类所有者> --decision 通过|有条件通过|退回补证|暂停|拒绝 --gate <门禁文件> [--reason <理由>]
  node bin/aecw.mjs change <dir> --type task|blueprint|charter --title <变更> [--reason <理由>] [--impact <影响>] [--by <提出者>] [--decision 接受|拒绝|挂起]
  node bin/aecw.mjs change <dir> --id CR-001 --decision 接受|拒绝|挂起 [--by <人类>] [--reason <理由>]
  node bin/aecw.mjs status <dir>
  node bin/aecw.mjs dissent <dir> --severity S1|S2|S3|S4 --type <类型> --claim <主张> [--evidence <证据>] [--route 本地|直达]
  node bin/aecw.mjs fact <dir> --statement <陈述> --source <来源> [--status 已捕获|已核验|有争议] [--verifier <核验人>]
  node bin/aecw.mjs gate <dir> --name <门禁名> [--decision 通过|有条件通过|退回补证|暂停] [--attestation <verify.json> --signed-by <人类>]
  node bin/aecw.mjs verify <dir> --reviewer <评审者> [--reviewer-session <id>] [--gate release|adoption|evolution|stage]
  node bin/aecw.mjs resolve <dir> --id DR-001 --decision <裁决> [--by <人类>] [--reason <理由>]
  node bin/aecw.mjs accept <dir> --item <项> --decision <接受|有条件接受|拒绝> --by <人类> [--evidence <证据>] [--risk <剩余风险>]
  node bin/aecw.mjs log <dir> --decision <决策> [--reason <理由>]
  node bin/aecw.mjs check <dir>
  node bin/aecw.mjs demo [--force]

原则：
  - 人类只做方向/S1/S2/最终验收/抽样；S3/S4 本地处理。
  - 异议必须到达有权者；S1/S2 进 inbox/，不能只留在聊天里。
  - 事实有来源/状态；模型输出默认是“主张”，不是事实。
  - STATUS.md 是唯一当前状态；旧文档标 SUPERSEDED。
  - 蓝图是“怎么做”的共享基线；开工令是人类的“现在开始”，两者都不是整个项目授权。
  - check 只做结构/一致性检查，不是授权/发布证明；通过类门禁必须引用 verify attestation。
  - S1/S2 裁决、人类验收、charter/blueprint 裁决必须由人类所有者具名执行。
`);
}

function parse(argv) {
  const flags = {};
  const args = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      args.push(a);
    }
  }
  return { args, flags };
}

function fail(msg) {
  console.error(`error: ${msg}`);
  process.exit(1);
}

// ---------- v0.9.3 · 表格/身份/事务基础件（S1：P0-1 + P0-7） ----------

const PLACEHOLDER = /^(?:-|—|–|无|待补|待定|待填|未填|未具名|todo|tbd|n\/a|（待填）|（未填）|（待补）)$/i;

function isPlaceholder(value) {
  const text = String(value ?? '').trim();
  return !text || PLACEHOLDER.test(text) || /待补|未具名|TODO/i.test(text);
}

/** 单行化 + 转义 Markdown 表格分隔符；多行/控制字符替换为空格。 */
function cleanCell(value) {
  return String(value ?? '')
    .replace(/\r\n?/g, ' ')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/\s+/g, ' ')
    .trim();
}

function requireText(value, label) {
  const text = String(value ?? '').trim();
  if (isPlaceholder(text)) fail(`${label} 不能为空或占位符`);
  return cleanCell(text);
}

/** 按未转义的 | 切分表格行；保留 \| 转义，重新 join 时不丢列。 */
function splitRow(line) {
  let text = String(line).trim();
  if (text.startsWith('|')) text = text.slice(1);
  if (text.endsWith('|')) text = text.slice(0, -1);
  const cells = [];
  let current = '';
  let escaped = false;
  for (const ch of text) {
    if (escaped) {
      current += `\\${ch}`;
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (ch === '|') {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

function joinRow(cells) {
  return `| ${cells.join(' | ')} |`;
}

function sectionRange(text, heading) {
  const start = text.indexOf(heading);
  if (start < 0) return null;
  const next = text.indexOf('\n## ', start + heading.length);
  return { start, end: next < 0 ? text.length : next };
}

function tableRows(text, heading, prefix) {
  const range = sectionRange(text, heading);
  if (!range) return [];
  const rows = [];
  const idPattern = new RegExp(`^${prefix}-\\d+`);
  for (const line of text.slice(range.start, range.end).split('\n')) {
    if (!line.trimStart().startsWith('|')) continue;
    const cells = splitRow(line);
    if (!cells.length) continue;
    if (cells[0] === 'ID' || /^-{3,}$/.test(cells[0])) continue;
    if (!idPattern.test(cells[0])) continue;
    rows.push({ cells, line });
  }
  return rows;
}

function nextIdInTable(text, heading, prefix) {
  let max = 0;
  for (const row of tableRows(text, heading, prefix)) {
    const match = row.cells[0].match(new RegExp(`^${prefix}-(\\d+)`));
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
}

function idMatchesCell(cell, id) {
  return cell === id || cell.startsWith(`${id}（`) || cell.startsWith(`${id}(`);
}

function writeFileAtomic(file, content) {
  ensureDir(path.dirname(file));
  const temp = `${file}.tmp-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;
  fs.writeFileSync(temp, content, 'utf8');
  try {
    fs.renameSync(temp, file);
  } catch (error) {
    try { fs.rmSync(temp, { force: true }); } catch { /* ignore */ }
    throw error;
  }
}

function txnDirOf(dir) {
  return path.join(dir, '.aecw-txn');
}

function recoverTxn(dir) {
  const txnDir = txnDirOf(dir);
  const journal = path.join(txnDir, 'journal.json');
  if (!fs.existsSync(journal)) return;
  try {
    const entries = JSON.parse(fs.readFileSync(journal, 'utf8')).entries ?? [];
    for (const entry of entries) {
      if (entry.backup && fs.existsSync(entry.backup)) fs.copyFileSync(entry.backup, entry.target);
      else if (entry.created) fs.rmSync(entry.target, { force: true });
    }
  } catch { /* 恢复尽力而为；下面是显式告警 */ }
  fs.rmSync(txnDir, { recursive: true, force: true });
  console.error('warn: 检测到未完成事务，已回滚到提交前状态');
}

/** 多文件提交：先备份 + journal，再原子替换；任一步失败回滚全部目标。 */
function commitFiles(dir, files) {
  recoverTxn(dir);
  const txnDir = txnDirOf(dir);
  ensureDir(txnDir);
  const entries = [];
  try {
    for (const file of files) {
      const exists = fs.existsSync(file.path);
      const backup = path.join(txnDir, `b${entries.length}.bak`);
      if (exists) fs.copyFileSync(file.path, backup);
      entries.push({ target: file.path, backup: exists ? backup : null, created: !exists });
    }
    fs.writeFileSync(
      path.join(txnDir, 'journal.json'),
      JSON.stringify({ version: 1, at: new Date().toISOString(), entries }, null, 2),
      'utf8',
    );
    for (const file of files) writeFileAtomic(file.path, file.content);
    fs.rmSync(txnDir, { recursive: true, force: true });
  } catch (error) {
    for (const entry of [...entries].reverse()) {
      try {
        if (entry.backup && fs.existsSync(entry.backup)) fs.copyFileSync(entry.backup, entry.target);
        else if (entry.created) fs.rmSync(entry.target, { force: true });
      } catch { /* 回滚失败时保留 txn 目录，下一次命令会再次尝试 */ }
    }
    fs.rmSync(txnDir, { recursive: true, force: true });
    throw error;
  }
}

function readJsonMaybe(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  } catch {
    return null;
  }
}

function readStateFile(dir) {
  return readJsonMaybe(path.join(dir, 'state.json'));
}

function projectOf(dir) {
  const parent = path.dirname(dir);
  return String(readJsonMaybe(path.join(parent, 'PROJECT.json'))?.project ?? readStateFile(dir)?.project ?? path.basename(dir));
}

function ownerIdentity(dir) {
  const state = readStateFile(dir);
  if (state?.owner?.name) return String(state.owner.name).trim();
  if (fs.existsSync(path.join(dir, 'STATUS.md'))) return ownerOf(fs.readFileSync(path.join(dir, 'STATUS.md'), 'utf8'));
  return '';
}

function requireHuman(by, dir, action) {
  const owner = ownerIdentity(dir);
  if (isPlaceholder(owner)) fail(`${action} 被拒绝：人类所有者未具名（state.owner）`);
  const who = String(by ?? '').trim();
  if (!who) fail(`${action} 需要 --by <人类所有者>（${owner}）`);
  if (/[\r\n|]/.test(who) || /[\r\n|]/.test(owner)) fail(`${action} 被拒绝：身份不得含换行或表格分隔符`);
  const allowlist = readStateFile(dir)?.owner?.allowlist;
  const allowed = Array.isArray(allowlist) && allowlist.map((x) => String(x)).includes(who);
  if (who !== owner && !allowed) fail(`${action} 被拒绝：${who} 不是人类所有者（${owner}）`);
  return who;
}

function stateSummary(state) {
  const g4 = state?.features?.G4;
  const ev = state?.evolution?.['EV-001'];
  return {
    stage: `${state?.stage?.name}/${state?.stage?.state}`,
    release: `${state?.release?.version}/${state?.release?.state}`,
    g4: g4 ? `${g4.state}/${g4.release}` : null,
    evolution: ev ? `EV-001/${ev.state}` : null,
    adoption: state?.adoption?.state ?? null,
    evidence_debt: (state?.evidence_debt ?? []).map((row) => row.id),
  };
}

function assertGateName(name) {
  const text = String(name ?? '').trim();
  if (text.length < 1 || text.length > 60) fail('gate --name 长度必须 1–60 字符');
  if (/[\u0000-\u001F\u007F|\\/:*?"<>]/.test(text)) fail('gate --name 含非法字符（控制字符/路径/表格分隔符）');
  if (/^[.\s]/.test(text)) fail('gate --name 不能以点或空白开头');
  return text;
}

function normalizeGateDecision(raw) {
  const value = String(raw ?? '').trim().toLowerCase();
  if (['通过', 'pass', 'passed', 'approved'].includes(value)) return '通过';
  if (['有条件通过', 'conditional', 'conditional-pass'].includes(value)) return '有条件通过';
  if (['退回补证', '退回', 'rework'].includes(value)) return '退回补证';
  if (['暂停', 'hold', 'blocked'].includes(value)) return '暂停';
  if (['拒绝', 'reject', 'rejected'].includes(value)) return '拒绝';
  return '';
}

function readAttestation(file, dir) {
  if (!file || file === true) fail('通过类门禁必须提供 --attestation <verify 结果 json>；自由文本 --decision 不再放行');
  const abs = path.resolve(String(file));
  if (!fs.existsSync(abs)) fail(`attestation 不存在：${abs}`);
  const data = readJsonMaybe(abs);
  if (!data) fail(`attestation 无法解析：${abs}`);
  if (data.kind !== 'verify' || data.ok !== true) fail('attestation 不是成功的 verify 结果');
  if (data.open_s1s2 !== 0) fail(`attestation 记录开放 S1/S2=${data.open_s1s2}，不得通过`);
  if (data.criteria?.failed || data.criteria?.['not-started'] || data.criteria?.not_started) {
    fail('attestation 记录 criteria 存在 failed/not-started');
  }
  if (typeof data.tree_hash !== 'string' || data.tree_hash.length < 16) fail('attestation 缺少有效 tree_hash');
  if (!/^(?:sha256:)?[0-9a-fA-F]{64}$/.test(data.tree_hash)) fail('attestation.tree_hash 必须是 sha256 十六进制');
  if (data.id !== undefined && !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/.test(String(data.id))) {
    fail('attestation.id 含非法字符');
  }
  const project = projectOf(dir);
  if (data.project && data.project !== project) fail(`attestation 项目不匹配：${data.project} vs ${project}`);
  const expires = Date.parse(data.expires_at ?? '');
  if (!Number.isFinite(expires)) fail('attestation 缺少有效 expires_at');
  if (expires < Date.now()) fail('attestation 已过期');
  const created = Date.parse(data.created_at ?? '');
  if (Number.isFinite(created) && Date.now() - created > ATTESTATION_MAX_AGE_DAYS * 86400000) {
    fail('attestation 过旧（超过 7 天）');
  }
  if (data.git?.available && data.git?.dirty) fail('attestation 记录工作树不干净；不得用于通过类门禁');
  return data;
}

// ---------- v0.9.4 · verify / 冻结哈希 / 阶段状态机（S2：P0-2 + P0-3） ----------

function projectRootOf(dir) {
  return path.dirname(dir);
}

function projectManifest(dir) {
  return readJsonMaybe(path.join(projectRootOf(dir), 'PROJECT.json'));
}

function rootsFor(dir) {
  const manifest = projectManifest(dir) ?? {};
  const governance = path.basename(dir);
  return {
    product: manifest.roots?.product ?? '.',
    governance: manifest.roots?.governance ?? governance,
    workspace: manifest.roots?.workspace ?? `${governance}/workspace`,
  };
}

function listTreeFiles(root, { excludeDirs = [] } = {}) {
  const out = [];
  const excluded = new Set(excludeDirs);
  const walk = (abs, rel) => {
    if (!fs.existsSync(abs)) return;
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      const childAbs = path.join(abs, entry.name);
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === '.aecw-txn' || entry.name.startsWith('.tmp')) continue;
        if (excluded.has(childRel)) continue;
        walk(childAbs, childRel);
      } else {
        if (/\.tmp-/.test(entry.name)) continue;
        out.push(childRel);
      }
    }
  };
  walk(root, '');
  return out.sort();
}

function treeHash(root, { excludeDirs = [] } = {}) {
  const hash = crypto.createHash('sha256');
  for (const rel of listTreeFiles(root, { excludeDirs })) {
    hash.update(rel);
    hash.update('\0');
    const text = fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');
    hash.update(text);
    hash.update('\0');
  }
  return `sha256:${hash.digest('hex').toUpperCase()}`;
}

function attestationDir(dir) {
  return path.join(dir, 'workspace', 'evidence', 'attestations');
}

function projectTreeHash(dir) {
  const root = projectRootOf(dir);
  const rel = (p) => path.relative(root, p).replace(/\\/g, '/');
  return treeHash(root, { excludeDirs: [rel(attestationDir(dir)), rel(path.join(dir, 'test', '.tmp'))] });
}

function productTreeHash(dir) {
  const root = projectRootOf(dir);
  const productRoot = path.resolve(root, rootsFor(dir).product);
  if (!fs.existsSync(productRoot)) throw new Error(`产品根不存在：${productRoot}`);
  const excludeDirs = [];
  if (path.resolve(productRoot) === path.resolve(root)) {
    excludeDirs.push(rootsFor(dir).governance);
    excludeDirs.push(path.relative(root, attestationDir(dir)).replace(/\\/g, '/'));
    excludeDirs.push(path.relative(root, path.join(dir, 'test', '.tmp')).replace(/\\/g, '/'));
  }
  return treeHash(productRoot, { excludeDirs });
}

function hashFile(file) {
  return `sha256:${crypto.createHash('sha256').update(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')).digest('hex').toUpperCase()}`;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(',')}]`;
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function hashPayload(payload) {
  return `sha256:${crypto.createHash('sha256').update(stableJson(payload)).digest('hex').toUpperCase()}`;
}

function stageGateFiles(p, needle) {
  if (!fs.existsSync(p.gates)) return [];
  return fs.readdirSync(p.gates).filter((name) => name.includes(needle)).sort();
}

function freezeMarker(text) {
  const match = text.match(/<!--\s*AECW-FREEZE\s*(\{[\s\S]*?\})\s*-->/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function stageOfGateFile(file, text, kind) {
  if (kind === 'charter-freeze') {
    const marker = freezeMarker(text);
    if (marker?.stage) return String(marker.stage);
    const legacy = text.match(/^- 阶段：([^\n（(]+)/m);
    return legacy ? legacy[1].trim() : '';
  }
  const match = text.match(/^# 开工令 · ([^\n（(]+)/m);
  return match ? match[1].trim() : '';
}

function latestStageGate(p, stage, kind) {
  const files = stageGateFiles(p, kind);
  for (let i = files.length - 1; i >= 0; i--) {
    const file = path.join(p.gates, files[i]);
    let text;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    if (stageOfGateFile(file, text, kind) === stage) return file;
  }
  return '';
}

function readStageInfo(dir) {
  const state = readStateFile(dir);
  const status = fs.existsSync(path.join(dir, 'STATUS.md')) ? fs.readFileSync(path.join(dir, 'STATUS.md'), 'utf8') : '';
  const name = state?.stage?.name ?? stageOf(status);
  const rawState = state?.stage?.state;
  return {
    name,
    state: rawState ? String(rawState).toLowerCase() : (status.match(/- 阶段状态：([^\n]+)/) ? stageStateOf(status.match(/- 阶段状态：([^\n]+)/)[1]) : 'seed'),
  };
}

function runCaptured(command, args, cwd, logFile, options = {}) {
  ensureDir(path.dirname(logFile));
  const fd = fs.openSync(logFile, 'w');
  let result;
  try {
    result = spawnSync(command, args, {
      cwd,
      shell: Boolean(options.shell),
      stdio: ['ignore', fd, fd],
      windowsHide: true,
      timeout: options.timeout ?? 600000,
    });
  } catch (error) {
    result = { status: null, error };
  } finally {
    fs.closeSync(fd);
  }
  const output = fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8') : '';
  return {
    status: typeof result.status === 'number' ? result.status : 1,
    output,
    error: result.error?.message ?? '',
    logFile,
    sha256: hashPayload(output),
  };
}

function gitFacts(projectRoot, logDir, excludeRel = '') {
  const top = runCaptured('git', ['rev-parse', '--show-toplevel'], projectRoot, path.join(logDir, 'git-top.log'), { timeout: 20000 });
  if (top.status !== 0) return { available: false };
  const topPath = top.output.trim();
  if (!topPath || path.resolve(topPath).toLowerCase() !== path.resolve(projectRoot).toLowerCase()) {
    return { available: false, reason: '项目根不是 Git 顶层（可能是外层仓库的子目录）' };
  }
  const head = runCaptured('git', ['rev-parse', 'HEAD'], projectRoot, path.join(logDir, 'git-head.log'), { timeout: 20000 });
  const tree = runCaptured('git', ['rev-parse', 'HEAD^{tree}'], projectRoot, path.join(logDir, 'git-tree.log'), { timeout: 20000 });
  const statusArgs = ['status', '--porcelain'];
  if (excludeRel) statusArgs.push('--', '.', `:(exclude)${excludeRel}`);
  const status = runCaptured('git', statusArgs, projectRoot, path.join(logDir, 'git-status.log'), { timeout: 20000 });
  if (head.status !== 0) return { available: false };
  return {
    available: true,
    head: head.output.trim(),
    tree: tree.status === 0 ? tree.output.trim() : '',
    dirty: status.status === 0 && status.output.trim().length > 0,
  };
}

function readCriteria(dir) {
  const file = path.join(dir, 'criteria.md');
  if (!fs.existsSync(file)) return { ok: false, reason: '缺少 criteria.md' };
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => line.trimStart().startsWith('| ID | 判据 |'));
  if (headerIndex < 0) return { ok: false, reason: 'criteria.md 缺少判据表头' };
  const header = splitRow(lines[headerIndex]);
  if (header.length !== 8) return { ok: false, reason: `criteria.md 表头应为 8 列（含到期），实际 ${header.length}` };
  const rows = [];
  for (let i = headerIndex + 1; i < lines.length && lines[i].trimStart().startsWith('|'); i++) {
    const cells = splitRow(lines[i]);
    if (cells[0] === 'ID' || /^-+$/.test(cells[0])) continue;
    rows.push(cells);
  }
  return { ok: true, rows };
}

function currentFreezePayload(dir, stage) {
  const p = projectPaths(dir);
  if (!fs.existsSync(p.direction) || !fs.existsSync(p.blueprint) || !fs.existsSync(path.join(dir, 'criteria.md'))) {
    fail('freeze 需要 human/direction.md、BLUEPRINT.md、criteria.md 都存在');
  }
  const bp = blueprintMeta(p);
  return {
    version: 1,
    project: projectOf(dir),
    stage,
    blueprint_version: bp.version,
    direction_hash: hashFile(p.direction),
    blueprint_hash: hashFile(p.blueprint),
    criteria_hash: hashFile(path.join(dir, 'criteria.md')),
    product_hash: productTreeHash(dir),
  };
}

function assertFreezePayload(dir, payload) {
  const current = currentFreezePayload(dir, String(payload.stage));
  const keys = ['direction_hash', 'blueprint_hash', 'criteria_hash', 'product_hash', 'blueprint_version'];
  const changed = keys.filter((key) => current[key] !== payload[key]);
  if (changed.length) {
    fail(`冻结内容已变化（${changed.join('、')}）；start 拒绝。先走 change 升版本并重新 freeze`);
  }
  const expected = hashPayload(payload);
  return expected;
}


function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function writeIfAbsent(p, content, force = false) {
  if (!force && fs.existsSync(p)) return false;
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, content, 'utf8');
  return true;
}

function readTemplate(name, vars = {}) {
  let s = fs.readFileSync(path.join(CORE, name), 'utf8');
  for (const [k, v] of Object.entries(vars)) s = s.split(`{{${k}}}`).join(String(v));
  return s;
}

function appendTableRow(text, heading, row) {
  const range = sectionRange(text, heading);
  if (!range) throw new Error(`section not found: ${heading}`);
  const lines = text.slice(range.start, range.end).split('\n');
  let last = -1;
  for (let i = 0; i < lines.length; i++) if (lines[i].trimStart().startsWith('|')) last = i;
  if (last < 0) lines.push('', row);
  else lines.splice(last + 1, 0, row);
  return text.slice(0, range.start) + lines.join('\n') + text.slice(range.end);
}

/** 在指定表头之后的表格末尾追加一行；避免 appendLastTableRow 写错文件里的第二张表。 */
function appendRowByHeader(text, headerMarker, row) {
  const lines = text.split('\n');
  const start = lines.findIndex((line) => line.trimStart().startsWith(headerMarker));
  if (start < 0) throw new Error(`table not found: ${headerMarker}`);
  let last = start;
  for (let i = start + 1; i < lines.length; i++) {
    if (!lines[i].trimStart().startsWith('|')) break;
    last = i;
  }
  lines.splice(last + 1, 0, row);
  return lines.join('\n');
}

function openHigh(text) {
  return tableRows(text, '## A. 异议台账', 'DR')
    .filter((row) => /^(S1|S2)$/i.test(row.cells[2]) && /^open$/i.test(row.cells[7])).length;
}

function openChangeRows(text) {
  return tableRows(text, '## C. 变更台账', 'CR')
    .filter((row) => /^open$/i.test(row.cells[7]));
}

function openHighRows(text) {
  return tableRows(text, '## A. 异议台账', 'DR')
    .filter((row) => /^(S1|S2)$/i.test(row.cells[2]) && /^open$/i.test(row.cells[7]));
}

function slug(s) {
  return String(s || 'gate').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff-]+/g, '-').replace(/^-+|-+$/g, '') || 'gate';
}

function ownerOf(status) {
  const m = status.match(/人类所有者：([^\n|]+)/);
  return m ? cleanCell(m[1]) : '';
}

function stageOf(status) {
  const m = status.match(/- 阶段：([^\n（(]+)/);
  return m ? m[1].trim().split(/\s*\/\s*/)[0] : '';
}

function stageStateOf(raw) {
  return String(raw || '').trim().split(/[（(/]/)[0].trim().toLowerCase();
}

function blueprintMeta(p) {
  if (!fs.existsSync(p.blueprint)) return { ok: false, reason: '缺少 BLUEPRINT.md' };
  const text = fs.readFileSync(p.blueprint, 'utf8');
  const approved = /^- 状态：\s*approved\s*$/m.test(text);
  const approverMatch = text.match(/^- 批准人：([^\n]+)/m);
  const approver = approverMatch ? approverMatch[1].trim() : '';
  const versionMatch = text.match(/^- 版本：([^\n]+)/m);
  const version = versionMatch ? versionMatch[1].trim() : 'v?';
  const named = Boolean(approver) && !/待批准|待补|未具名|TODO/i.test(approver);
  return { ok: approved && named, approved, approver, version, text };
}

function projectPaths(dir) {
  return {
    dir,
    status: path.join(dir, 'STATUS.md'),
    direction: path.join(dir, 'human', 'direction.md'),
    blueprint: path.join(dir, 'BLUEPRINT.md'),
    decisions: path.join(dir, 'human', 'decisions.md'),
    acceptance: path.join(dir, 'human', 'acceptance.md'),
    ledger: path.join(dir, 'ledger.md'),
    board: path.join(dir, 'cluster', 'board.md'),
    roster: path.join(dir, 'cluster', 'roster.md'),
    runs: path.join(dir, 'cluster', 'runs.md'),
    learning: path.join(dir, 'cluster', 'learning.md'),
    work: path.join(dir, 'workspace', 'work'),
    evidence: path.join(dir, 'workspace', 'evidence'),
    memory: path.join(dir, 'workspace', 'memory'),
    landing: path.join(dir, 'workspace', 'landing'),
    gates: path.join(dir, 'gates'),
    inbox: path.join(dir, 'inbox'),
  };
}

function cmdInit(args, flags) {
  const target = args[0] || flags.dir;
  if (!target) fail('init 需要一个治理目录：node bin/aecw.mjs init <dir> --name ... --owner ...');
  const dir = path.resolve(target);
  const projectRoot = path.dirname(dir);
  const governance = path.basename(dir);
  const name = cleanCell(flags.name || path.basename(projectRoot)) || 'project';
  const owner = cleanCell(flags.owner || '');
  if (isPlaceholder(owner)) fail('init 需要具名 --owner <人类所有者>；占位符不允许');
  const goal = cleanCell(flags.goal || '（待填）');
  const p = projectPaths(dir);

  const state = {
    project: name,
    updated: DATE,
    owner: { name: owner },
    layout: { root: '.', governance, since: DATE },
    install: { target: '.', profile: '' },
    stage: { name: 'seed', state: 'seed', gate: null },
    features: {},
    release: { version: '0.1.0', state: 'unreleased' },
    evolution: {},
    adoption: { state: 'pending' },
    evidence_debt: [],
  };
  const summary = stateSummary(state);
  const vars = { PROJECT: name, OWNER: owner, DATE, GOAL: goal, STAGE: 'seed', SUMMARY: JSON.stringify(summary) };

  ensureDir(dir);
  for (const folder of ['human', 'cluster', p.work, p.evidence, p.memory, p.landing, p.gates, p.inbox]) {
    ensureDir(folder);
  }

  const created = [];
  const binTarget = path.join(dir, 'bin', 'aecw.mjs');
  if (!fs.existsSync(binTarget) || flags.force) {
    ensureDir(path.dirname(binTarget));
    fs.copyFileSync(fileURLToPath(import.meta.url), binTarget);
    created.push(binTarget);
  }
  const coreTarget = path.join(dir, 'core');
  if (!fs.existsSync(coreTarget) || flags.force) {
    fs.cpSync(CORE, coreTarget, { recursive: true });
    created.push(coreTarget);
  }

  const add = (file, content) => { if (writeIfAbsent(file, content, Boolean(flags.force))) created.push(file); };
  const header = (title) => `# ${title}\n\n> 状态：current｜最后核对：${DATE}\n`;

  add(p.status, readTemplate('status.template.md', vars));
  add(p.direction, readTemplate('direction.template.md', vars));
  add(p.blueprint, readTemplate('blueprint.template.md', vars));
  add(p.acceptance, readTemplate('acceptance.template.md', vars));

  let ledger = readTemplate('ledger.template.md', vars);
  ledger = ledger
    .split('\n')
    .filter((line) => !(line.trim().startsWith('|') && splitRow(line).every((cell) => /^(?:-|—)$/.test(cell))))
    .join('\n');
  ledger = appendTableRow(
    ledger,
    '## B. 事实台账',
    joinRow(['F-001', DATE, '项目由 aecw init 生成（PROJECT/state/criteria/模板）', 'node bin/aecw.mjs init', '已捕获', 'agent', 'seed']),
  );
  add(p.ledger, ledger);

  add(p.decisions, `${header(`人类决策记录 · ${name}`)}
> 只记“决定 / 理由 / 影响”。S1/S2 见 \`ledger.md\` 与 \`inbox/\`。

## 决策记录

| 日期 | 决策 | 理由 | 影响 |
|---|---|---|---|
`);
  add(p.roster, `${header(`集群名册 · ${name}`)}
> 默认是“单 agent + 人类”；角色是功能，不是必须新增的人头。

| 角色 | 谁 | 职责 | 当前状态 |
|---|---|---|---|
| 人类方向所有者 | ${cleanCell(owner)} | 方向/边界/S1/S2/最终验收 | active |
| 集群管家 | 集群管家 | 路由、任务板、S3/S4、升级 | active |
| 实现者 | 实现者 | 实现/测试/事实记录 | active |
| 验证者（可选/轮值） | （按需） | 高影响事实复核 | on-demand |
| 工作区策展 | 工作区策展 | STATUS/台账/证据/时效 | active |
`);
  add(p.board, `${header(`任务板 · ${name}`)}
| ID | 任务 | 负责人 | 状态 | 输入 | 输出 | 验收 |
|---|---|---|---|---|---|---|
`);
  add(p.runs, `${header(`运行记录 · ${name}`)}
| 时间 | agent | 任务 | 结果 | 证据 |
|---|---|---|---|---|
`);
  add(p.learning, `${header(`学习账 · ${name}`)}
> 观察/教训/候选；不自动晋升为规则。

| 日期 | 观察 | 教训 | 状态 |
|---|---|---|---|
`);
  add(path.join(dir, 'cluster', 'evolution.md'), `${header(`进化台账 · ${name}`)}
> 试验/激活/退役；不自动晋升为规则。

| ID | 提案 | 状态 | 证据 |
|---|---|---|---|
`);
  add(path.join(dir, 'cluster', 'maintenance.md'), `${header(`维护台账 · ${name}`)}
| 日期 | 事项 | 结果 | 证据 |
|---|---|---|---|
`);
  add(path.join(dir, 'cluster', 'release.md'), `${header(`发布台账 · ${name}`)}
| 版本 | 日期 | 门禁 | 状态 |
|---|---|---|---|
`);

  add(path.join(p.work, 'README.md'), `${header('workspace/work')}
任务产物、草稿、候选。候选不得当作已验收事实；当前状态见 \`../../STATUS.md\`。
`);
  add(path.join(p.evidence, 'README.md'), `${header('workspace/evidence')}
原始证据：测试输出、日志、截图、复现步骤。E1 放这里；E2 人类目视要写清“无截图”或附截图。
`);
  add(path.join(p.memory, 'README.md'), `${header('workspace/memory')}
项目记忆：决策、判例、负记忆、术语。判断/规范必须引用事实；过期条目标 SUPERSEDED。
`);
  add(path.join(p.landing, 'README.md'), `${header('workspace/landing')}
落地清单/交接/退役：可用、可运维、可交接、可审计、成本、遗留接受、照护者。
`);
  add(path.join(p.gates, 'README.md'), `${header('gates')}
每道门一页；用 \`node bin/aecw.mjs gate <dir> --name <name>\` 生成。通过类门禁必须引用 verify attestation。
`);
  add(path.join(p.inbox, 'README.md'), `${header('inbox（S1/S2 与变更详情）')}
S1/S2 的完整异议记录放这里，不能被集群管家过滤。人类必须回应；未回应默认暂停/缩小。
blueprint/charter 变更的详情（CR-xxx）也放这里；裁决状态以 ledger C 表为准。
`);

  add(path.join(dir, 'criteria.md'), `${header(`验收矩阵 · ${name}`)}
> 权威：本矩阵与 \`state.json\`；\`met\` 必须有证据；\`waived/deferred\` 必须有人类裁决/日期/影响门。

| ID | 判据 | 状态 | 证据 | 核验人 | 人类裁决 | 到期 | 影响门 |
|---|---|---|---|---|---|---|---|
| INIT-1 | 项目脚手架由 init 生成且结构检查通过 | met | F-001（init 运行记录） | agent | — | — | seed |
`);

  add(path.join(dir, 'state.json'), `${JSON.stringify(state, null, 2)}\n`);

  const toolFile = fileURLToPath(import.meta.url);
  const toolHash = crypto.createHash('sha256').update(fs.readFileSync(toolFile, 'utf8').replace(/\r\n/g, '\n')).digest('hex').toUpperCase();
  const manifest = {
    project: name,
    roots: { product: '.', governance, workspace: `${governance}/workspace` },
    install: { target: '.', profile: '' },
    commands: { check: `node ${governance}/bin/aecw.mjs check ${governance}` },
    tool: { name: 'aecw', version: TOOL_VERSION, mode: 'vendored', hash: toolHash },
  };
  const manifestPath = path.join(projectRoot, 'PROJECT.json');
  if (fs.existsSync(manifestPath) && !flags.force) {
    console.log(`warn: PROJECT.json 已存在，未覆盖：${manifestPath}`);
  } else {
    writeFileAtomic(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    created.push(manifestPath);
  }

  console.log(`AECW 项目已初始化：${dir}`);
  console.log(`  项目：${name}｜人类所有者：${owner}`);
  console.log(`  项目根：${projectRoot}（PROJECT.json）`);
  console.log(`  当前状态：${p.status}`);
  console.log(`  已创建/跳过：${created.length} 个文件`);
  console.log(`下一步：node ${governance}/bin/aecw.mjs check ${governance} 应为 0 FAIL`);
  return dir;
}

function needDir(args, cmd) {
  const dir = args[0] ? path.resolve(args[0]) : '';
  if (!dir) fail(`${cmd} 需要一个项目目录`);
  if (!fs.existsSync(path.join(dir, 'STATUS.md'))) fail(`不是 AECW 项目（缺 STATUS.md）：${dir}`);
  return dir;
}

function cmdDissent(args, flags) {
  const dir = needDir(args, 'dissent');
  const p = projectPaths(dir);
  const severity = String(flags.severity || 'S3').toUpperCase();
  if (!['S1', 'S2', 'S3', 'S4'].includes(severity)) fail('severity 必须是 S1/S2/S3/S4');
  const type = requireText(flags.type || 'risk', 'dissent --type');
  const claim = requireText(flags.claim, 'dissent --claim');
  const evidence = cleanCell(flags.evidence ?? '-') || '-';
  const route = cleanCell(flags.route || (severity === 'S1' || severity === 'S2' ? '直达' : '本地'));
  const handler = cleanCell(flags.owner || '集群管家') || '集群管家';
  let ledger = fs.readFileSync(p.ledger, 'utf8');
  const id = nextIdInTable(ledger, '## A. 异议台账', 'DR');
  ledger = appendTableRow(ledger, '## A. 异议台账', joinRow([id, DATE, severity, type, claim, evidence, handler, 'open', '-']));

  const files = [{ path: p.ledger, content: ledger }];
  const inboxFile = path.join(p.inbox, `${id}.md`);
  if (severity === 'S1' || severity === 'S2') {
    if (fs.existsSync(inboxFile)) fail(`${inboxFile} 已存在，拒绝覆盖历史异议记录`);
    const detail = `# ${id} · ${severity} · ${type}

> 状态：current｜最后核对：${DATE}

- 日期：${DATE}
- 路由：${route}
- 提出者/角色：${handler}
- 一句话主张：${claim}
- 事实依据：${evidence}
- 不确定性：
- 影响（谁/什么/可逆性）：
- 建议替代：
- 什么会改变我的判断：
- 请求动作：

> S1/S2：人类必须在 SLA 内回应；未回应默认暂停/缩小。
`;
    files.push({ path: inboxFile, content: detail });
  }

  try {
    commitFiles(dir, files);
  } catch (error) {
    fail(`异议写入失败，已回滚（ledger/inbox 均未提交）：${error.message}`);
  }

  console.log(`${id} 已记录（${severity} / ${type}）`);
  if (severity === 'S1' || severity === 'S2') {
    console.log(`  → 直达人类：${inboxFile}`);
    console.log('  → 未解决前，高风险门禁应暂停/缩小；不要只留在聊天里。');
  } else {
    console.log('  → 本地处理；周会记录，人类抽样。');
  }
}

function cmdFact(args, flags) {
  const dir = needDir(args, 'fact');
  const p = projectPaths(dir);
  const statement = requireText(flags.statement, 'fact --statement');
  const source = requireText(flags.source, 'fact --source');
  const status = String(flags.status || '已捕获').trim();
  if (!['已捕获', '已核验', '有争议'].includes(status)) fail('fact --status 必须是 已捕获/已核验/有争议');
  const verifier = cleanCell(flags.verifier ?? '-') || '-';
  if (status === '已核验' && isPlaceholder(verifier)) fail('fact --status 已核验 时必须提供具名 --verifier');
  const link = cleanCell(flags.link ?? '-') || '-';
  const ledger = fs.readFileSync(p.ledger, 'utf8');
  const id = nextIdInTable(ledger, '## B. 事实台账', 'F');
  const next = appendTableRow(ledger, '## B. 事实台账', joinRow([id, DATE, statement, source, status, verifier, link]));
  try {
    commitFiles(dir, [{ path: p.ledger, content: next }]);
  } catch (error) {
    fail(`事实写入失败，已回滚：${error.message}`);
  }
  console.log(`${id} 已记录（${status}）`);
  console.log('  模型输出默认是“主张”；高影响事实需非作者核验。');
}

function cmdGate(args, flags) {
  const dir = needDir(args, 'gate');
  const p = projectPaths(dir);
  const name = assertGateName(flags.name);
  const decision = normalizeGateDecision(flags.decision ?? '退回补证');
  if (!decision) fail('gate --decision 必须是 通过|有条件通过|退回补证|暂停|拒绝');
  const host = requireText(flags.host || '集群管家', 'gate --host');
  const ledger = fs.existsSync(p.ledger) ? fs.readFileSync(p.ledger, 'utf8') : '';
  const openRows = openHighRows(ledger);
  const open = openRows.length;

  let attestation = null;
  let signedBy = '';
  if (decision === '通过' || decision === '有条件通过') {
    if (open > 0) {
      fail(`拒绝生成“${decision}”门禁：仍有 ${open} 条开放 S1/S2（${openRows.map((row) => row.cells[0]).join('、')}）`);
    }
    attestation = readAttestation(flags.attestation, dir);
    const currentTree = projectTreeHash(dir);
    if (attestation.tree_hash !== currentTree) {
      fail(`attestation 树不一致：verify 后文件已变化（${attestation.tree_hash} vs ${currentTree}）；重新 verify 后再开门`);
    }
    signedBy = cleanCell(requireHuman(flags['signed-by'], dir, `gate --decision ${decision}`));
  } else if (flags['signed-by']) {
    signedBy = cleanCell(flags['signed-by']);
  }

  const stamp = `${new Date().toISOString().slice(11, 19).replace(/:/g, '')}${crypto.randomBytes(2).toString('hex')}`;
  const file = path.join(p.gates, `${DATE}-${slug(name)}-${stamp}.md`);
  if (fs.existsSync(file)) {
    fail(`门禁文件已存在，拒绝覆盖历史：${file}`);
  }
  const content = readTemplate('gate.template.md', {
    PROJECT: cleanCell(projectOf(dir)),
    GATE: name,
    DATE,
    HOST: host,
    DECISION: decision,
    OPEN_S1S2: open > 0 ? `${open} 条（阻断高风险）` : '0',
    ATTESTATION: attestation
      ? cleanCell(`${attestation.id ?? 'verify'}｜tree ${attestation.tree_hash}`)
      : '—（非通过类门禁不需要）',
    SIGNED_BY: signedBy || '—（非通过类门禁不需要）',
  });
  try {
    commitFiles(dir, [{ path: file, content }]);
  } catch (error) {
    fail(`门禁写入失败，已回滚：${error.message}`);
  }
  console.log(`门禁已生成：${file}`);
  console.log(`  决策：${decision}｜开放 S1/S2：${open}`);
  if (attestation) console.log(`  attestation：${attestation.id ?? 'verify'}｜人类签署：${signedBy}`);
}

function cmdResolve(args, flags) {
  const dir = needDir(args, 'resolve');
  const p = projectPaths(dir);
  const id = String(flags.id || '').trim();
  if (!/^DR-\d{3}$/.test(id)) fail('resolve 只接受 DR-xxx（A. 异议台账）；CR/F 不得跨类型裁决');
  let ledger = fs.readFileSync(p.ledger, 'utf8');
  const rows = tableRows(ledger, '## A. 异议台账', 'DR');
  const row = rows.find((item) => idMatchesCell(item.cells[0], id));
  if (!row) fail(`未找到异议 ${id}（只查 A 表）`);
  if (/^closed$/i.test(row.cells[7])) fail(`${id} 已关闭，拒绝重复裁决`);
  const severity = String(row.cells[2] || '').toUpperCase();
  let by;
  if (severity === 'S1' || severity === 'S2') {
    by = cleanCell(requireHuman(flags.by, dir, `resolve ${id}（${severity}）`));
  } else {
    by = cleanCell(flags.by || '集群管家') || '集群管家';
  }
  const decision = requireText(flags.decision, `resolve ${id} --decision`);
  const reason = cleanCell(flags.reason ?? '') || '';
  row.cells[6] = by;
  row.cells[7] = 'closed';
  row.cells[8] = reason ? `${decision}；${reason}` : decision;
  const lines = ledger.split('\n');
  const index = lines.indexOf(row.line);
  if (index < 0) fail(`无法定位 ${id} 的原始行`);
  lines[index] = joinRow(row.cells);
  ledger = lines.join('\n');
  try {
    commitFiles(dir, [{ path: p.ledger, content: ledger }]);
  } catch (error) {
    fail(`裁决写入失败，已回滚：${error.message}`);
  }
  console.log(`${id} 已关闭：${decision}（${by}）`);
}

function cmdAccept(args, flags) {
  const dir = needDir(args, 'accept');
  const p = projectPaths(dir);
  const item = requireText(flags.item, 'accept --item');
  const decision = String(flags.decision || '接受').trim();
  if (!['接受', '有条件接受', '拒绝'].includes(decision)) fail('accept --decision 必须是 接受/有条件接受/拒绝');
  const by = cleanCell(requireHuman(flags.by, dir, 'accept（人类验收）'));
  const evidence = cleanCell(flags.evidence ?? '');
  if (decision !== '拒绝' && isPlaceholder(evidence)) {
    fail('accept 接受/有条件接受 必须提供 --evidence；不得无证据验收');
  }
  const risk = cleanCell(flags.risk ?? '-') || '-';
  let text = fs.readFileSync(p.acceptance, 'utf8');
  text = appendRowByHeader(text, '| 日期 | 项 |', joinRow([DATE, item, decision, evidence || '-', risk, by]));
  try {
    commitFiles(dir, [{ path: p.acceptance, content: text }]);
  } catch (error) {
    fail(`验收写入失败，已回滚：${error.message}`);
  }
  console.log(`验收已记录：${item} → ${decision}（${by}）`);
}

function cmdLog(args, flags) {
  const dir = needDir(args, 'log');
  const p = projectPaths(dir);
  const decision = requireText(flags.decision, 'log --decision');
  const reason = cleanCell(flags.reason ?? '-') || '-';
  let text = fs.readFileSync(p.decisions, 'utf8');
  text = appendRowByHeader(text, '| 日期 | 决策 |', joinRow([DATE, decision, reason, '-']));
  try {
    commitFiles(dir, [{ path: p.decisions, content: text }]);
  } catch (error) {
    fail(`决策写入失败，已回滚：${error.message}`);
  }
  console.log(`决策已记录：${decision}`);
}

function cmdBlueprint(args, flags) {
  const dir = needDir(args, 'blueprint');
  const p = projectPaths(dir);
  const status = fs.readFileSync(p.status, 'utf8');
  const owner = ownerOf(status);
  const stage = cleanCell(flags.stage || stageOf(status) || 'stage-1');

  if (fs.existsSync(p.blueprint) && !flags.force) {
    let text = fs.readFileSync(p.blueprint, 'utf8');
    const approved = /^- 状态：\s*approved\s*$/m.test(text);
    if (flags.stage && !approved) {
      text = text.replace(/^- 阶段：.*$/m, `- 阶段：${flags.stage}`);
      fs.writeFileSync(p.blueprint, text, 'utf8');
      console.log(`蓝图阶段已更新：${flags.stage}`);
    }
    console.log(`蓝图已存在：${p.blueprint}`);
    console.log(`  状态：${approved ? 'approved（已批准）' : 'draft（未批准）'}`);
    console.log('  填完后由人类把 `- 状态：draft` 改为 `- 状态：approved`，并填 `- 批准人：<人类>`。');
    console.log('  需要重建模板时加 --force（会覆盖，旧版本先自行归档）。');
    return;
  }

  const content = readTemplate('blueprint.template.md', {
    PROJECT: path.basename(dir),
    STAGE: stage,
    DATE,
    OWNER: owner || '（待补）',
  });
  fs.writeFileSync(p.blueprint, content, 'utf8');
  console.log(`施工蓝图已创建：${p.blueprint}`);
  console.log('  下一步：填工作包/接口/未知/阶段验收；人类批准后改状态为 approved。');
  console.log('  蓝图未批准，freeze 会拒绝；没有 freeze/start，集群不开工。');
}

function stageLabel(state) {
  return { seed: 'seed', frozen: 'baseline frozen', executing: 'executing', paused: 'paused', closed: 'closed' }[state] ?? state;
}

function statusWithStage(status, name, state, gateName) {
  let text = status
    .replace(/- 阶段：.*/, `- 阶段：${name}（${stageLabel(state)}）`)
    .replace(/- 当前门禁：.*/, `- 当前门禁：${gateName || '-'}`);
  if (/- 阶段状态：/.test(text)) text = text.replace(/- 阶段状态：.*/, `- 阶段状态：${state}`);
  else text = text.replace(/(- 阶段：.*\n)/, `$1- 阶段状态：${state}\n`);
  return text;
}

function replaceStatusSection(status, heading, block) {
  const start = status.indexOf(heading);
  if (start < 0) return `${status.trimEnd()}\n\n${block.trimEnd()}\n`;
  const next = status.indexOf('\n## ', start + heading.length);
  const tail = next < 0 ? '' : status.slice(next);
  return `${status.slice(0, start)}${block.trimEnd()}\n${tail}`;
}

function removeStatusSection(status, heading) {
  const start = status.indexOf(heading);
  if (start < 0) return status;
  const next = status.indexOf('\n## ', start + heading.length);
  return next < 0 ? `${status.slice(0, start).trimEnd()}\n` : `${status.slice(0, start)}${status.slice(next + 1)}`;
}

function appendStageEvent(status, line) {
  const heading = '## 9. 阶段事件';
  let text = status;
  if (!text.includes(heading)) text = `${text.trimEnd()}\n\n${heading}\n`;
  return `${text.trimEnd()}\n- ${line}\n`;
}

function stampNow() {
  return `${new Date().toISOString().slice(11, 19).replace(/:/g, '')}${crypto.randomBytes(2).toString('hex')}`;
}

function uniqueGatePath(p, base) {
  let candidate = path.join(p.gates, `${base}.md`);
  if (!fs.existsSync(candidate)) return candidate;
  for (let i = 1; i < 1000; i++) {
    candidate = path.join(p.gates, `${base}-${i}.md`);
    if (!fs.existsSync(candidate)) return candidate;
  }
  fail('无法分配唯一门禁文件名');
}

function stateFileContent(dir, stagePatch) {
  const state = readStateFile(dir) ?? { project: projectOf(dir) };
  state.updated = DATE;
  state.stage = stagePatch;
  return `${JSON.stringify(state, null, 2)}\n`;
}

function syncStatusSummary(status, state) {
  const summary = JSON.stringify(stateSummary(state));
  if (/<!--\s*AECW-STATE\s*\{[\s\S]*?\}\s*-->/.test(status)) {
    return status.replace(/<!--\s*AECW-STATE\s*\{[\s\S]*?\}\s*-->/, `<!-- AECW-STATE ${summary} -->`);
  }
  return status;
}

function relGate(dir, file) {
  return path.relative(dir, file).replace(/\\/g, '/');
}

function cmdFreeze(args, flags) {
  const dir = needDir(args, 'freeze');
  const p = projectPaths(dir);
  const status = fs.readFileSync(p.status, 'utf8');
  const owner = cleanCell(ownerOf(status));
  if (!owner || /待补|未具名|TODO/i.test(owner)) fail('人类所有者未具名；先补 owner 再冻结');
  if (!flags['charter-confirmed']) fail('freeze 需要 --charter-confirmed（人类确认宪章）');

  const current = readStageInfo(dir);
  if (['frozen', 'executing', 'paused'].includes(current.state)) {
    fail(`当前阶段 ${current.name} 状态为 ${current.state}；不能重新 freeze。先 close 或继续执行`);
  }
  const stage = cleanCell(String(flags.stage || ''));
  if (!stage) fail('freeze 需要 --stage <新阶段 id>');
  if (stage === 'seed') fail('阶段 id 不能是 seed');
  if (!/^[a-z0-9][a-z0-9._-]{0,39}$/.test(stage)) fail('阶段 id 必须匹配 [a-z0-9][a-z0-9._-]{0,39}');
  if (current.state === 'closed' && current.name === stage) {
    fail(`阶段 ${stage} 已 closed 且是终态；不能重开，新阶段必须使用新 stage id`);
  }

  const direction = fs.readFileSync(p.direction, 'utf8');
  if (/（待填）|（明确不做|（待填：/.test(direction)) {
    fail('direction 还有未填模板项（失败定义/非目标等）；先填完再冻结');
  }

  const bp = blueprintMeta(p);
  if (!bp.ok) fail(`蓝图未获人类批准：${p.blueprint}（需要 “- 状态：approved” 和具名批准人）`);
  const bpStageMatch = bp.text.match(/^- 阶段：([^\n]+)/m);
  const bpStage = bpStageMatch ? cleanCell(bpStageMatch[1]) : '';
  if (bpStage && bpStage !== stage) {
    fail(`蓝图阶段（${bpStage}）与 freeze 阶段（${stage}）不一致；先改蓝图或用 blueprint --stage`);
  }

  const ledger = fs.existsSync(p.ledger) ? fs.readFileSync(p.ledger, 'utf8') : '';
  const openRows = openHighRows(ledger);
  if (openRows.length) fail(`还有 ${openRows.length} 条开放 S1/S2（${openRows.map((row) => row.cells[0]).join('、')}）；先 resolve 再冻结阶段基线`);

  const scope = requireText(flags.scope, 'freeze --scope');
  const budget = requireText(flags.budget, 'freeze --budget');
  const stop = requireText(flags.stop, 'freeze --stop');
  const acceptance = requireText(flags.acceptance, 'freeze --acceptance');
  const payload = currentFreezePayload(dir, stage);
  payload.payload_hash = hashPayload(payload);

  const base = `${DATE}-${stage}-charter-freeze-${stampNow()}`;
  const file = uniqueGatePath(p, base);
  const fileRel = relGate(dir, file);
  const marker = JSON.stringify(payload);
  const content = `# 宪章冻结与阶段授权 · ${path.basename(dir)}

> 状态：historical｜最后核对：${DATE}

- 日期：${DATE}
- 人类所有者：${owner}
- 宪章：human/direction.md（人类确认：是）
- 蓝图：BLUEPRINT.md ${bp.version}（批准人：${bp.approver}）
- 异议状态：开放 S1/S2 = 0；S3/S4 已记录/抽样
- 阶段：${stage}
- 范围：${scope}
- 预算：${budget}
- 停止：${stop}
- 验收：${acceptance}
- 冻结 payload：${payload.payload_hash}
- direction hash：${payload.direction_hash}
- blueprint hash：${payload.blueprint_hash}
- criteria hash：${payload.criteria_hash}
- product hash：${payload.product_hash}

<!-- AECW-FREEZE ${marker} -->

## 授权

集群只可执行**本阶段**；阶段结束必须停止、报告、等下一道门。
不得把本授权解释为“整个项目”或“继续做下去”的授权；新增范围需重新冻结。

## 冻结依据

- 宪章无开放 S1/S2；
- 人类已确认宪章；
- 阶段范围/预算/停止/验收已写明；
- direction / BLUEPRINT / criteria / product 已写入 canonical hash；
- 当前状态写入 STATUS.md，旧文档标 SUPERSEDED。

## 签署

- 人类所有者：${owner}
- 集群管家：
`;

  const section7 = `## 7. 阶段授权（冻结）

- 阶段：${stage}
- 蓝图：${bp.version}（批准：${bp.approver}）
- 范围：${scope}
- 预算：${budget}
- 停止：${stop}
- 验收：${acceptance}
- payload：${payload.payload_hash}
- 冻结：${DATE}；宪章确认：${owner}
- 集群只可执行本阶段；阶段结束必须停、报告、等下一道门。
`;

  let nextStatus = statusWithStage(status, stage, 'frozen', path.basename(file));
  nextStatus = replaceStatusSection(nextStatus, '## 7. 阶段授权（冻结）', section7);
  nextStatus = removeStatusSection(nextStatus, '## 8. 开工令');
  nextStatus = removeStatusSection(nextStatus, '## 9. 阶段事件');
  nextStatus = removeStatusSection(nextStatus, '## 10. 阶段关闭');

  const nextState = stateFileContent(dir, {
    name: stage,
    state: 'frozen',
    gate: fileRel,
    freeze: {
      gate: fileRel,
      payload_hash: payload.payload_hash,
      direction_hash: payload.direction_hash,
      blueprint_hash: payload.blueprint_hash,
      criteria_hash: payload.criteria_hash,
      product_hash: payload.product_hash,
      blueprint_version: payload.blueprint_version,
      frozen_at: new Date().toISOString(),
    },
  });
  nextStatus = syncStatusSummary(nextStatus, JSON.parse(nextState));

  commitFiles(dir, [
    { path: file, content },
    { path: path.join(dir, 'state.json'), content: nextState },
    { path: p.status, content: nextStatus },
  ]);

  console.log(`阶段基线已冻结：${file}`);
  console.log(`  阶段：${stage}｜范围：${scope}`);
  console.log(`  payload：${payload.payload_hash}`);
  console.log('  集群只可执行本阶段；阶段结束必须停、报告、等下一道门。');
}

function cmdStart(args, flags) {
  const dir = needDir(args, 'start');
  const p = projectPaths(dir);
  const by = cleanCell(requireHuman(flags.by, dir, 'start（开工令）'));
  const info = readStageInfo(dir);
  if (info.state !== 'frozen') {
    fail(`start 只允许从 frozen 进入；当前 ${info.name}/${info.state}。已 closed 的阶段不能重开，需新 stage + 新 freeze`);
  }
  const stage = info.name;

  const freezeFile = latestStageGate(p, stage, 'charter-freeze');
  if (!freezeFile) fail(`阶段 ${stage} 没有 charter-freeze；先 freeze 阶段基线`);
  const freezeText = fs.readFileSync(freezeFile, 'utf8');
  const marker = freezeMarker(freezeText);
  if (!marker) fail(`冻结门禁缺少 AECW-FREEZE payload：${freezeFile}`);
  const { payload_hash: recordedHash, ...payload } = marker;
  if (!recordedHash || hashPayload(payload) !== recordedHash) fail('冻结 payload hash 不自洽；拒绝开工');
  const currentHash = assertFreezePayload(dir, payload);
  if (currentHash !== recordedHash) fail('冻结 payload hash 与当前内容不一致；拒绝开工');

  const bp = blueprintMeta(p);
  if (!bp.ok) fail('蓝图未获人类批准；先让人类批准 BLUEPRINT.md，再下开工令');
  const bpStageMatch = bp.text.match(/^- 阶段：([^\n]+)/m);
  const bpStage = bpStageMatch ? cleanCell(bpStageMatch[1]) : '';
  if (bpStage && bpStage !== stage) fail(`蓝图阶段（${bpStage}）与当前阶段（${stage}）不一致`);

  const ledger = fs.existsSync(p.ledger) ? fs.readFileSync(p.ledger, 'utf8') : '';
  const openRows = openHighRows(ledger);
  if (openRows.length) fail(`还有 ${openRows.length} 条开放 S1/S2；先裁决再开工`);

  const firstReport = cleanCell(flags['first-report'] || '阶段结束、触发 S1/S2、或预算耗尽时');
  const base = `${DATE}-${stage}-start-order-${stampNow()}`;
  const file = uniqueGatePath(p, base);
  const fileRel = relGate(dir, file);
  const content = `# 开工令 · ${stage}

> 状态：historical｜最后核对：${DATE}

- 日期：${DATE}
- 下达人：${by}
- 阶段：${stage}
- 蓝图：BLUEPRINT.md ${bp.version}（批准人：${bp.approver}）
- 冻结门禁：${relGate(dir, freezeFile)}
- 冻结 payload：${recordedHash}
- 开工条件：宪章确认；蓝图批准；冻结 payload 与当前内容一致；开放 S1/S2 = 0
- 首次报告点：${firstReport}
- 预算/停止：见冻结门禁与 STATUS.md 第 7 节

## 授权

集群可以开始执行**本阶段**，但只限冻结蓝图和冻结范围；任务板/证据/异议按原型规则记录。

## 不授权

- 不授权整个项目；
- 不授权阶段结束后自动续跑；
- 不授权改变验收判据；
- 不授权新增范围、依赖或外部发布；
- 不授权绕过开放 S1/S2。

## 暂停权

人类可以在任何时候暂停、收缩或终止；集群应立即停止、保存证据、更新 STATUS.md。

## 签署

- 人类：${by}
- 集群管家：
`;

  const section8 = `## 8. 开工令

- 下达人：${by}
- 日期：${DATE}
- 首次报告点：${firstReport}
- 依据：${relGate(dir, freezeFile)} + payload ${recordedHash}
- 只授权本阶段；阶段结束或触发停止条件必须停、报告、等下一道门。
`;

  let nextStatus = statusWithStage(fs.readFileSync(p.status, 'utf8'), stage, 'executing', path.basename(file));
  nextStatus = replaceStatusSection(nextStatus, '## 8. 开工令', section8);

  const previous = readStateFile(dir) ?? {};
  const nextState = stateFileContent(dir, {
    ...previous.stage,
    name: stage,
    state: 'executing',
    gate: fileRel,
    start: {
      gate: fileRel,
      at: new Date().toISOString(),
      by,
      freeze_payload_hash: recordedHash,
    },
  });
  nextStatus = syncStatusSummary(nextStatus, JSON.parse(nextState));

  commitFiles(dir, [
    { path: file, content },
    { path: path.join(dir, 'state.json'), content: nextState },
    { path: p.status, content: nextStatus },
  ]);

  console.log(`开工令已下达：${file}`);
  console.log(`  阶段：${stage}｜蓝图：${bp.version}｜下达人：${by}`);
  console.log(`  冻结 payload：${recordedHash}`);
  console.log('  只授权本阶段；阶段结束或触发停止条件必须停。');
}

function cmdPause(args, flags) {
  const dir = needDir(args, 'pause');
  const p = projectPaths(dir);
  const info = readStageInfo(dir);
  if (info.state !== 'executing') fail(`pause 只允许从 executing 进入；当前 ${info.name}/${info.state}`);
  const by = cleanCell(requireHuman(flags.by, dir, 'pause'));
  const reason = cleanCell(flags.reason || '-') || '-';
  let nextStatus = appendStageEvent(
    statusWithStage(fs.readFileSync(p.status, 'utf8'), info.name, 'paused', '-'),
    `${DATE} 暂停（${by}）：${reason}`,
  );
  const state = readStateFile(dir) ?? {};
  state.updated = DATE;
  state.stage = { ...(state.stage ?? {}), state: 'paused', paused: { at: new Date().toISOString(), by, reason } };
  nextStatus = syncStatusSummary(nextStatus, state);
  commitFiles(dir, [
    { path: path.join(dir, 'state.json'), content: `${JSON.stringify(state, null, 2)}\n` },
    { path: p.status, content: nextStatus },
  ]);
  console.log(`阶段已暂停：${info.name}（${by}）`);
}

function cmdResume(args, flags) {
  const dir = needDir(args, 'resume');
  const p = projectPaths(dir);
  const info = readStageInfo(dir);
  if (info.state !== 'paused') fail(`resume 只允许从 paused 进入；当前 ${info.name}/${info.state}`);
  const by = cleanCell(requireHuman(flags.by, dir, 'resume'));
  let nextStatus = appendStageEvent(
    statusWithStage(fs.readFileSync(p.status, 'utf8'), info.name, 'executing', readStateFile(dir)?.stage?.gate ? path.basename(readStateFile(dir).stage.gate) : '-'),
    `${DATE} 恢复（${by}）`,
  );
  const state = readStateFile(dir) ?? {};
  state.updated = DATE;
  state.stage = { ...(state.stage ?? {}), state: 'executing', resumed: { at: new Date().toISOString(), by } };
  nextStatus = syncStatusSummary(nextStatus, state);
  commitFiles(dir, [
    { path: path.join(dir, 'state.json'), content: `${JSON.stringify(state, null, 2)}\n` },
    { path: p.status, content: nextStatus },
  ]);
  console.log(`阶段已恢复执行：${info.name}（${by}）`);
}

function cmdClose(args, flags) {
  const dir = needDir(args, 'close');
  const p = projectPaths(dir);
  const info = readStageInfo(dir);
  if (info.state !== 'executing') fail(`close 只允许从 executing 进入；当前 ${info.name}/${info.state}`);
  const by = cleanCell(requireHuman(flags.by, dir, 'close（阶段关闭）'));
  const decision = normalizeGateDecision(flags.decision);
  if (!['通过', '有条件通过', '退回补证', '暂停', '拒绝'].includes(decision)) {
    fail('close --decision 必须是 通过/有条件通过/退回补证/暂停/拒绝');
  }
  if (!flags.gate || flags.gate === true) fail('close 需要 --gate <阶段门禁文件>');
  const gateAbs = path.resolve(projectRootOf(dir), String(flags.gate));
  const gateRelToGates = path.relative(p.gates, gateAbs);
  if (gateRelToGates.startsWith('..') || path.isAbsolute(gateRelToGates)) fail('close --gate 必须位于 gates/ 内');
  if (!fs.existsSync(gateAbs)) fail(`阶段门禁不存在：${gateAbs}`);
  const gateText = fs.readFileSync(gateAbs, 'utf8');
  const gateDecisionMatch = gateText.match(/^- 决策：\s*([^\n]+)/m);
  if (!gateDecisionMatch || normalizeGateDecision(gateDecisionMatch[1]) !== decision) {
    fail(`close --decision（${decision}）与门禁记录（${gateDecisionMatch?.[1] ?? '缺失'}）不一致`);
  }
  const reason = cleanCell(flags.reason || '-') || '-';
  const gateName = path.basename(gateAbs);
  let nextStatus = statusWithStage(fs.readFileSync(p.status, 'utf8'), info.name, 'closed', gateName);
  nextStatus = appendStageEvent(nextStatus, `${DATE} 关闭（${by}）：${decision}；gate ${gateName}；${reason}`);
  const state = readStateFile(dir) ?? {};
  state.updated = DATE;
  state.stage = {
    ...(state.stage ?? {}),
    state: 'closed',
    gate: relGate(dir, gateAbs),
    closed: { gate: relGate(dir, gateAbs), decision, reason, at: new Date().toISOString(), by },
  };
  nextStatus = syncStatusSummary(nextStatus, state);
  commitFiles(dir, [
    { path: path.join(dir, 'state.json'), content: `${JSON.stringify(state, null, 2)}\n` },
    { path: p.status, content: nextStatus },
  ]);
  console.log(`阶段已关闭：${info.name}（${decision}，${by}）`);
}

function normalizeDecision(raw) {
  const v = String(raw || '').trim().toLowerCase();
  if (['接受', 'accepted', 'accept'].includes(v)) return 'accepted';
  if (['拒绝', 'rejected', 'reject'].includes(v)) return 'rejected';
  if (['挂起', 'defer', 'deferred', '推迟'].includes(v)) return 'deferred';
  return '';
}

function cmdChange(args, flags) {
  const dir = needDir(args, 'change');
  const p = projectPaths(dir);
  let ledger = fs.readFileSync(p.ledger, 'utf8');

  if (!ledger.includes('## C. 变更台账')) {
    ledger = ledger.trimEnd() + `\n\n## C. 变更台账\n\n| ID | 日期 | 类型 | 变更 | 理由 | 影响 | 提出者 | 状态 | 裁决 |\n|---|---|---|---|---|---|---|---|---|\n`;
  }

  const id = String(flags.id || '').trim();
  if (id) {
    if (!/^CR-\d{3}$/.test(id)) fail('change --id 只接受 CR-xxx（C. 变更台账）；DR/F 不得跨类型裁决');
    const decision = normalizeDecision(flags.decision);
    if (!decision) fail('--decision 必须是 接受/拒绝/挂起');
    const rows = tableRows(ledger, '## C. 变更台账', 'CR');
    const row = rows.find((item) => idMatchesCell(item.cells[0], id));
    if (!row) fail(`未找到变更 ${id}（只查 C 表）`);
    if (!/^open$/i.test(row.cells[7])) fail(`${id} 已裁决（${row.cells[7]}），拒绝重复裁决`);
    const type = row.cells[2].trim();
    let by = cleanCell(flags.by || '') || '集群管家';
    if (type === 'blueprint' || type === 'charter') {
      by = cleanCell(requireHuman(flags.by, dir, `change ${id}（${type} 裁决）`));
    }
    row.cells[7] = decision;
    row.cells[8] = cleanCell(flags.reason || decision) || decision;
    const lines = ledger.split('\n');
    const index = lines.indexOf(row.line);
    if (index < 0) fail(`无法定位 ${id} 的原始行`);
    lines[index] = joinRow(row.cells);
    ledger = lines.join('\n');
    try {
      commitFiles(dir, [{ path: p.ledger, content: ledger }]);
    } catch (error) {
      fail(`变更裁决写入失败，已回滚：${error.message}`);
    }
    console.log(`${id} 已裁决：${decision}（${by}）`);
    if (decision === 'accepted' && (type === 'blueprint' || type === 'charter')) {
      console.log('  → 不得原地修改冻结基线：升蓝图版本，重新 freeze + start（charter 变更先停）。');
    }
    return;
  }

  const type = String(flags.type || 'task').toLowerCase();
  if (!['task', 'blueprint', 'charter'].includes(type)) fail('--type 必须是 task/blueprint/charter');
  const title = requireText(flags.title, 'change --title');
  const reason = cleanCell(flags.reason ?? '-') || '-';
  const impact = cleanCell(flags.impact ?? '-') || '-';
  const by = cleanCell(flags.by || '集群管家') || '集群管家';
  const decision = normalizeDecision(flags.decision);
  if (decision && type !== 'task') {
    fail(`${type} 变更不得在提出命令里直接裁决；先记录为 open，再由人类所有者单独裁决（change --id CR-xxx）`);
  }
  const changeState = decision || 'open';
  const crId = nextIdInTable(ledger, '## C. 变更台账', 'CR');
  ledger = appendTableRow(
    ledger,
    '## C. 变更台账',
    joinRow([crId, DATE, type, title, reason, impact, by, changeState, decision || '-']),
  );

  const inboxFile = path.join(p.inbox, `${crId}.md`);
  if (fs.existsSync(inboxFile)) fail(`${inboxFile} 已存在，拒绝覆盖历史变更记录`);
  const detail = `# ${crId} · ${type} 变更

> 状态：current｜最后核对：${DATE}

- 日期：${DATE}
- 提出者：${by}
- 类型：${type}
- 变更：${title}
- 理由：${reason}
- 影响：${impact}
- 状态：${changeState}
- 裁决：${decision || '待人类裁决'}

## 影响分析（提出者填）

- 影响哪个阶段/工作包：
- 已完成的什么会作废/返工：
- 预算/时间影响：
- 验收判据是否改变：
- 风险/外部性：

## 选项

1. 接受（新版本 + 重新 freeze/start）：
2. 拒绝/推迟（维持当前基线）：
3. 缩小/替代：

## 裁决

- 人类：
- 日期：
- 理由：
`;
  try {
    commitFiles(dir, [
      { path: p.ledger, content: ledger },
      { path: inboxFile, content: detail },
    ]);
  } catch (error) {
    fail(`变更写入失败，已回滚（ledger/inbox 均未提交）：${error.message}`);
  }

  console.log(`${crId} 已记录（${type} / ${changeState}）`);
  console.log(`  → 详情：${inboxFile}`);
  if (type === 'task') {
    console.log('  → 阶段内处理；记 board/runs；若改验收/范围/预算，升级为 blueprint。');
  } else if (type === 'blueprint') {
    console.log('  → 需影响分析 + 人类裁决 + 新蓝图版本 + 重新 freeze/start；不得原地改冻结基线。');
  } else {
    console.log('  → 先停；重谈宪章；新 freeze；可能按新项目处理。');
  }
}

function cmdStatus(args) {
  const dir = needDir(args, 'status');
  console.log(fs.readFileSync(path.join(dir, 'STATUS.md'), 'utf8'));
}

function cmdVerify(args, flags) {
  const dir = needDir(args, 'verify');
  const p = projectPaths(dir);
  const projectRoot = projectRootOf(dir);
  const gate = String(flags.gate || 'release').toLowerCase();
  if (!['release', 'adoption', 'evolution', 'stage'].includes(gate)) {
    fail('verify --gate 必须是 release/adoption/evolution/stage');
  }
  const reviewer = requireText(flags.reviewer, 'verify --reviewer');
  const reviewerSession = cleanCell(flags['reviewer-session'] || '-') || '-';
  const attestDir = attestationDir(dir);
  ensureDir(attestDir);
  const now = new Date();
  const id = `VA-${now.toISOString().replace(/[-:T]/g, '').slice(0, 14)}-${crypto.randomBytes(3).toString('hex')}`;
  const logPath = (label) => path.join(attestDir, `${id}-${label}.log`);
  const failures = [];

  // 1. check --strict
  const cli = fileURLToPath(import.meta.url);
  const checkRun = runCaptured(process.execPath, [cli, 'check', dir, '--strict'], projectRoot, logPath('check'));
  const check = { status: checkRun.status === 0 ? 'pass' : 'fail', exit: checkRun.status, log: path.relative(dir, checkRun.logFile).replace(/\\/g, '/'), sha256: checkRun.sha256 };
  if (checkRun.status !== 0) failures.push('check --strict 未通过');

  // 2. probe
  const manifest = projectManifest(dir) ?? {};
  const commands = manifest.commands ?? {};
  let probe = { status: 'missing', exit: null };
  if (typeof commands.probe !== 'string') {
    failures.push('PROJECT.json commands.probe 缺失');
  } else {
    const run = runCaptured(commands.probe, [], projectRoot, logPath('probe'), { shell: true, timeout: 120000 });
    probe = { status: run.status === 0 ? 'pass' : 'fail', exit: run.status, log: path.relative(dir, run.logFile).replace(/\\/g, '/'), sha256: run.sha256, output: run.output };
    if (run.status !== 0) failures.push(`probe 未通过（exit ${run.status}）`);
  }

  // 3. full tests
  let tests = { status: 'missing', exit: null };
  if (typeof commands.test !== 'string') {
    failures.push('PROJECT.json commands.test 缺失');
  } else {
    const run = runCaptured(commands.test, [], projectRoot, logPath('test'), { shell: true, timeout: 900000 });
    tests = { status: run.status === 0 ? 'pass' : 'fail', exit: run.status, log: path.relative(dir, run.logFile).replace(/\\/g, '/'), sha256: run.sha256, output: run.output };
    if (run.status !== 0) failures.push(`完整测试未通过（exit ${run.status}）`);
  }

  // 4. criteria
  const criteria = readCriteria(dir);
  const criteriaStats = { total: 0, met: 0, waived: 0, deferred: 0, failed: 0, not_started: 0 };
  if (!criteria.ok) {
    failures.push(criteria.reason);
  } else {
    for (const cells of criteria.rows) {
      const [criterionId, , criterionStatus, evidence, , humanDecision, due, impact] = cells;
      criteriaStats.total++;
      if (!STATE_ENUM.criteria.has(criterionStatus)) {
        failures.push(`criteria ${criterionId} 状态非法：${criterionStatus}`);
        continue;
      }
      if (criterionStatus === 'met') criteriaStats.met++;
      if (criterionStatus === 'waived') criteriaStats.waived++;
      if (criterionStatus === 'deferred') criteriaStats.deferred++;
      if (criterionStatus === 'failed') criteriaStats.failed++;
      if (criterionStatus === 'not-started') criteriaStats.not_started++;
      if (criterionStatus === 'failed' || criterionStatus === 'not-started') {
        failures.push(`criteria ${criterionId} 为 ${criterionStatus}`);
      }
      if (criterionStatus === 'met' && isPlaceholder(evidence)) failures.push(`criteria ${criterionId} 为 met 但没有证据`);
      if ((criterionStatus === 'waived' || criterionStatus === 'deferred')
        && (isPlaceholder(humanDecision) || isPlaceholder(due) || isPlaceholder(impact))) {
        failures.push(`criteria ${criterionId} 为 ${criterionStatus} 但缺少人类裁决/到期/影响门`);
      }
    }
    if (criteriaStats.total === 0) failures.push('criteria.md 没有判据行');
  }

  // 5. open S1/S2
  const ledger = fs.existsSync(p.ledger) ? fs.readFileSync(p.ledger, 'utf8') : '';
  const openRows = openHighRows(ledger);
  if (openRows.length) failures.push(`开放 S1/S2：${openRows.map((row) => row.cells[0]).join('、')}`);

  // 6. evidence debt by impact
  const state = readStateFile(dir) ?? {};
  const debts = Array.isArray(state.evidence_debt) ? state.evidence_debt : [];
  const blockingDebt = [];
  const openOther = [];
  for (const debt of debts) {
    if (!debt?.id || !debt?.impact || !debt?.due) {
      failures.push(`evidence_debt 条目缺 id/impact/due：${debt?.id ?? '（空）'}`);
      continue;
    }
    if (!['release', 'adoption', 'evolution', 'stage'].includes(debt.impact)) {
      failures.push(`evidence_debt ${debt.id} impact 非法：${debt.impact}`);
    }
    const dueTime = Date.parse(debt.due);
    if (!Number.isFinite(dueTime)) failures.push(`evidence_debt ${debt.id} due 非法：${debt.due}`);
    const isOpen = debt.status === 'open' || debt.status === 'deferred';
    if (debt.impact === gate && isOpen) {
      blockingDebt.push({ id: debt.id, reason: 'open' });
      failures.push(`证据债 ${debt.id} 未清（impact ${debt.impact}）`);
    }
    if (debt.impact === gate && isOpen && Number.isFinite(dueTime) && dueTime < now.getTime()) {
      failures.push(`证据债 ${debt.id} 已过期（${debt.due}）`);
    }
    if (debt.impact !== gate && isOpen) openOther.push(debt.id);
  }

  // 7. tree hashes
  const hashes = {
    tree: projectTreeHash(dir),
    product: productTreeHash(dir),
    direction: hashFile(p.direction),
    blueprint: hashFile(p.blueprint),
    criteria: hashFile(path.join(dir, 'criteria.md')),
  };
  const attestRel = path.relative(projectRoot, attestDir).replace(/\\/g, '/');
  const git = gitFacts(projectRoot, attestDir, attestRel);
  if (git.available && git.dirty) failures.push('工作树不干净（git status 有未提交变更）；先提交再 verify');
  const toolHash = hashFile(cli);

  const ok = failures.length === 0;
  const attestation = {
    kind: 'verify',
    version: 1,
    id,
    ok,
    project: projectOf(dir),
    gate,
    created_at: now.toISOString(),
    expires_at: new Date(now.getTime() + 72 * 3600 * 1000).toISOString(),
    reviewer: { name: reviewer, session: reviewerSession },
    git,
    tree_hash: hashes.tree,
    product_hash: hashes.product,
    direction_hash: hashes.direction,
    blueprint_hash: hashes.blueprint,
    criteria_hash: hashes.criteria,
    tool: { version: TOOL_VERSION, hash: toolHash },
    open_s1s2: openRows.length,
    criteria: criteriaStats,
    evidence_debt: { gate, blocking: blockingDebt, open_other: openOther },
    checks: { check, probe, tests },
    failures,
  };
  const attestationPath = path.join(attestDir, `${id}.json`);
  writeFileAtomic(attestationPath, `${JSON.stringify(attestation, null, 2)}\n`);

  console.log(`${ok ? 'PASS' : 'FAIL'} verify · ${id}｜gate ${gate}`);
  console.log(`  tree      ${attestation.tree_hash}`);
  console.log(`  product   ${attestation.product_hash}`);
  console.log(`  criteria  ${criteriaStats.total} 行（met ${criteriaStats.met} / waived ${criteriaStats.waived} / deferred ${criteriaStats.deferred}）`);
  console.log(`  checks    check ${check.status}｜probe ${probe.status}｜tests ${tests.status}`);
  console.log(`  attestation ${attestationPath}`);
  if (!ok) {
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
}


function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function gitOriginUrl(root) {
  const config = path.join(root, '.git', 'config');
  if (!fs.existsSync(config)) return '';
  const text = fs.readFileSync(config, 'utf8');
  const match = text.match(/\[remote "origin"\][\s\S]*?url\s*=\s*([^\n]+)/);
  return match ? match[1].trim() : '';
}

function walkMarkdown(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === '.aecw-txn' || entry.name.startsWith('.tmp')) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkMarkdown(abs));
    else if (entry.name.endsWith('.md')) out.push(abs);
  }
  return out;
}

const STATE_ENUM = {
  stage: new Set(['seed', 'frozen', 'executing', 'paused', 'closed']),
  feature: new Set(['draft', 'candidate', 'accepted', 'released']),
  evolution: new Set(['candidate', 'trial', 'active', 'retired']),
  adoption: new Set(['pending', 'provisional', 'accepted']),
  release: new Set(['unreleased', 'release-candidate', 'released', 'superseded']),
  criteria: new Set(['met', 'waived', 'deferred', 'failed', 'not-started']),
};

function cmdCheck(args, flags = {}) {
  const dir = args[0] ? path.resolve(args[0]) : '';
  if (!dir) fail('check 需要一个项目目录');
  const strict = Boolean(flags.strict);
  const p = projectPaths(dir);
  const required = [p.status, p.direction, p.blueprint, p.ledger, p.board, p.work, p.evidence, p.memory, p.landing, p.gates, p.inbox];
  const missing = required.filter((x) => !fs.existsSync(x));
  let failCount = 0;
  let warnCount = 0;
  console.log('说明：结构/一致性检查；不是授权/发布证明。通过类门禁必须引用 verify attestation。');
  console.log(`检查：${dir}`);
  if (missing.length) {
    failCount += missing.length;
    console.log(`  FAIL 缺少 ${missing.length} 个必需文件/目录：`);
    for (const m of missing) console.log(`    - ${m}`);
  } else {
    console.log('  OK   必需文件/目录齐全');
  }

  const status = fs.existsSync(p.status) ? fs.readFileSync(p.status, 'utf8') : '';
  const ownerMatch = status.match(/人类所有者：([^\n|]+)/);
  const owner = ownerMatch ? ownerMatch[1].trim() : '';
  if (!owner || /待补|未具名|TODO/i.test(owner)) {
    failCount++;
    console.log(`  FAIL 人类所有者未具名：“${owner || '（空）'}”`);
  } else {
    console.log(`  OK   人类所有者：${owner}`);
  }

  const ledger = fs.existsSync(p.ledger) ? fs.readFileSync(p.ledger, 'utf8') : '';
  const openRows = openHighRows(ledger);
  if (openRows.length) {
    failCount++;
    console.log(`  FAIL 开放 S1/S2：${openRows.length} 条（${openRows.map((row) => row.cells[0]).join('、')}）；高风险门禁必须暂停/缩小`);
  } else {
    console.log('  OK   无开放 S1/S2');
  }

  const openCRs = openChangeRows(ledger);
  if (openCRs.length) {
    const high = openCRs.filter((row) => /^(charter|blueprint)$/i.test(row.cells[2]));
    if (high.length) {
      warnCount++;
      console.log(`  WARN 开放变更：${high.length} 条 charter/blueprint（未裁决前不得扩大范围）`);
    } else {
      console.log(`  OK   开放变更：${openCRs.length} 条 task（阶段内处理）`);
    }
  } else {
    console.log('  OK   无开放变更');
  }

  if (fs.existsSync(p.status)) {
    const age = (Date.now() - fs.statSync(p.status).mtimeMs) / 86400000;
    if (age > 14) {
      warnCount++;
      console.log(`  WARN STATUS.md 已 ${age.toFixed(0)} 天未更新（>14 天）`);
    } else {
      console.log(`  OK   STATUS.md 更新于 ${age.toFixed(1)} 天前`);
    }
  }

  const stage = stageOf(status);
  const stateMatch = status.match(/- 阶段状态：([^\n]+)/);
  let stageState = stateMatch ? stageStateOf(stateMatch[1]) : '';
  if (!stageState) {
    if (/executing|执行中/i.test(stage)) stageState = 'executing';
    else if (/frozen|冻结/i.test(stage)) stageState = 'frozen';
    else stageState = 'seed';
  }

  const hasFreeze = Boolean(latestStageGate(p, stage, 'charter-freeze'));
  const hasStart = Boolean(latestStageGate(p, stage, 'start-order'));
  const bp = blueprintMeta(p);

  if (stageState !== 'seed') {
    if (!hasFreeze) {
      failCount++;
      console.log(`  FAIL 阶段已离开 seed 但没有 charter-freeze：${stage}`);
    } else {
      console.log('  OK   阶段基线已冻结（charter-freeze）');
    }

    if (!bp.ok) {
      failCount++;
      console.log(`  FAIL 蓝图未获人类批准：${bp.reason || '状态不是 approved 或批准人未具名'}`);
    } else {
      console.log(`  OK   蓝图已批准：${bp.version}（${bp.approver}）`);
    }

    if (stageState === 'executing') {
      if (!hasStart) {
        failCount++;
        console.log('  FAIL 阶段已在执行但没有 start-order（开工令）');
      } else {
        console.log('  OK   阶段已开工（start-order）');
      }
    } else if (hasStart) {
      if (stageState === 'frozen') {
        failCount++;
        console.log('  FAIL 阶段状态为 frozen 但已有 start-order；重新冻结后必须重新 start');
      } else {
        console.log(`  OK   阶段状态为 ${stageState}（保留开工令历史）`);
      }
    } else {
      console.log(`  OK   阶段状态为 ${stageState}，尚未开工（等待 start）`);
    }
  } else if (hasFreeze) {
    console.log('  OK   阶段基线已冻结（charter-freeze）');
  } else {
    console.log('  OK   仍在 seed（未冻结；执行前请 freeze + start）');
  }

  // v0.9：项目清单、状态源、验收矩阵、文档状态与链接/围栏
  const projectRoot = path.dirname(dir);
  const manifestPath = path.join(projectRoot, 'PROJECT.json');
  let manifest = null;
  if (!fs.existsSync(manifestPath)) {
    failCount++;
    console.log('  FAIL 缺少 PROJECT.json（v0.9 项目清单）');
  } else {
    try {
      manifest = readJson(manifestPath);
      console.log('  OK   PROJECT.json');
    } catch (error) {
      failCount++;
      console.log(`  FAIL PROJECT.json 无法解析：${error.message}`);
    }
  }

  const roots = manifest?.roots ?? {};
  const productDir = path.join(projectRoot, roots.product ?? 'product');
  const governanceDir = path.join(projectRoot, roots.governance ?? 'aecw');

  if (manifest) {
    let rootsOk = true;
    for (const key of ['product', 'governance', 'workspace']) {
      if (typeof roots[key] !== 'string' || !fs.existsSync(path.join(projectRoot, roots[key]))) {
        rootsOk = false;
        failCount++;
        console.log(`  FAIL PROJECT.json roots.${key} 不存在：${roots[key] ?? '（空）'}`);
      }
    }
    if (rootsOk) console.log('  OK   PROJECT.json roots 存在');

    const installTarget = manifest.install?.target;
    if (typeof installTarget !== 'string' || !fs.existsSync(path.join(projectRoot, installTarget))) {
      failCount++;
      console.log(`  FAIL PROJECT.json install.target 不存在：${installTarget ?? '（空）'}`);
    } else {
      console.log('  OK   PROJECT.json install.target 存在');
    }

    const commandMap = manifest.commands && typeof manifest.commands === 'object' ? manifest.commands : null;
    if (!commandMap || Object.keys(commandMap).length === 0) {
      failCount++;
      console.log('  FAIL PROJECT.json commands 为空；至少需要 check');
    } else {
      if (!('check' in commandMap)) {
        failCount++;
        console.log('  FAIL PROJECT.json commands.check 缺失');
      }
      const commandTargets = {
        test: path.join(productDir, 'test'),
        governance: path.join(governanceDir, 'test'),
        probe: path.join(governanceDir, 'scripts', 'probe.mjs'),
        check: path.join(governanceDir, 'bin', 'aecw.mjs'),
      };
      for (const [name, target] of Object.entries(commandTargets)) {
        if (!(name in commandMap)) continue;
        if (!fs.existsSync(target)) {
          failCount++;
          console.log(`  FAIL PROJECT.json commands.${name} 指向不存在：${target}`);
        }
      }
    }

    if (manifest.tool?.version !== TOOL_VERSION) {
      failCount++;
      console.log(`  FAIL 工具版本不一致：manifest ${manifest.tool?.version ?? '（空）'} vs CLI ${TOOL_VERSION}`);
    } else {
      console.log(`  OK   工具版本一致：${TOOL_VERSION}`);
    }
    if (!manifest.tool?.hash || manifest.tool.hash === 'TO_BE_UPDATED') {
      failCount++;
      console.log('  FAIL PROJECT.json tool.hash 未填');
    } else {
      const toolText = fs.readFileSync(path.join(governanceDir, 'bin', 'aecw.mjs'), 'utf8').replace(/\r\n/g, '\n');
      const toolHash = crypto.createHash('sha256').update(toolText).digest('hex').toUpperCase();
      if (toolHash !== String(manifest.tool.hash).toUpperCase()) {
        failCount++;
        console.log(`  FAIL 工具哈希漂移：manifest ${manifest.tool.hash} vs ${toolHash}`);
      } else {
        console.log('  OK   工具哈希一致');
      }
    }
  }

  const statePath = path.join(dir, 'state.json');
  let stateFile = null;
  if (!fs.existsSync(statePath)) {
    failCount++;
    console.log('  FAIL 缺少 state.json（v0.9 状态源）');
  } else {
    try {
      stateFile = readJson(statePath);
      const stageValue = `${stateFile.stage?.name}/${stateFile.stage?.state}`;
      const expectedStage = `${stage}/${stageState}`;
      if (stageValue !== expectedStage) {
        failCount++;
        console.log(`  FAIL state.stage 与 STATUS 不一致：${stageValue} vs ${expectedStage}`);
      } else {
        console.log('  OK   state.stage 与 STATUS 一致');
      }
      if (stateFile.stage?.gate && !fs.existsSync(path.join(dir, stateFile.stage.gate))) {
        failCount++;
        console.log(`  FAIL state.stage.gate 不存在：${stateFile.stage.gate}`);
      }
      if (stateFile.owner?.name !== owner) {
        failCount++;
        console.log(`  FAIL state.owner 与 STATUS 不一致：${stateFile.owner?.name ?? '（空）'} vs ${owner || '（空）'}`);
      } else {
        console.log('  OK   state.owner 与 STATUS 一致');
      }
      const canonicalSummary = stateSummary(stateFile);
      const summaryMatch = status.match(/<!--\s*AECW-STATE\s*(\{[\s\S]*?\})\s*-->/);
      if (!summaryMatch) {
        failCount++;
        console.log('  FAIL STATUS 缺少 AECW-STATE 摘要块');
      } else {
        let summary;
        try {
          summary = JSON.parse(summaryMatch[1]);
        } catch (error) {
          failCount++;
          console.log(`  FAIL STATUS AECW-STATE 无法解析：${error.message}`);
        }
        if (summary) {
          for (const [label, expected] of Object.entries(canonicalSummary)) {
            if (JSON.stringify(summary[label]) !== JSON.stringify(expected)) {
              failCount++;
              console.log(`  FAIL STATUS 摘要 ${label} 与 state 不一致：${JSON.stringify(summary[label])} vs ${JSON.stringify(expected)}`);
            }
          }
          for (const key of Object.keys(summary)) {
            if (!(key in canonicalSummary)) {
              failCount++;
              console.log(`  FAIL STATUS 摘要含未知字段：${key}`);
            }
          }
        }
      }
      if (!STATE_ENUM.stage.has(stateFile.stage?.state)) {
        failCount++;
        console.log(`  FAIL state.stage.state 非法：${stateFile.stage?.state}`);
      }
      for (const [id, feature] of Object.entries(stateFile.features ?? {})) {
        if (!STATE_ENUM.feature.has(feature.state)) {
          failCount++;
          console.log(`  FAIL feature ${id} state 非法：${feature.state}`);
        }
        if (feature.release !== undefined && !STATE_ENUM.release.has(feature.release)) {
          failCount++;
          console.log(`  FAIL feature ${id} release 非法：${feature.release}`);
        }
      }
      for (const [id, evolution] of Object.entries(stateFile.evolution ?? {})) {
        if (!STATE_ENUM.evolution.has(evolution.state)) {
          failCount++;
          console.log(`  FAIL evolution ${id} state 非法：${evolution.state}`);
        }
      }
      if (!STATE_ENUM.adoption.has(stateFile.adoption?.state)) {
        failCount++;
        console.log(`  FAIL adoption.state 非法：${stateFile.adoption?.state}`);
      }
      if (!STATE_ENUM.release.has(stateFile.release?.state)) {
        failCount++;
        console.log(`  FAIL release.state 非法：${stateFile.release?.state}`);
      }
      const productPkgPath = path.join(productDir, 'package.json');
      if (fs.existsSync(productPkgPath)) {
        const productVersion = readJson(productPkgPath).version;
        if (productVersion !== stateFile.release?.version) {
          failCount++;
          console.log(`  FAIL release.version 与产品 package.json 不一致：${stateFile.release?.version} vs ${productVersion}`);
        } else {
          console.log('  OK   release.version 与产品版本一致');
        }
      }
      if (manifest) {
        const expectedLayoutRoot = roots.product ?? 'product';
        const expectedGovernance = roots.governance ?? 'aecw';
        if (stateFile.layout?.root !== expectedLayoutRoot) {
          failCount++;
          console.log(`  FAIL state.layout.root 未写回：${stateFile.layout?.root ?? '（空）'} vs PROJECT.json ${expectedLayoutRoot}`);
        } else if (stateFile.layout?.governance !== expectedGovernance) {
          failCount++;
          console.log(`  FAIL state.layout.governance 未写回：${stateFile.layout?.governance ?? '（空）'} vs PROJECT.json ${expectedGovernance}`);
        } else {
          console.log('  OK   state.layout 与 PROJECT.json 一致');
        }
        if (stateFile.install?.target !== (manifest.install?.target ?? 'product')) {
          failCount++;
          console.log(`  FAIL state.install.target 未写回：${stateFile.install?.target ?? '（空）'} vs PROJECT.json ${manifest.install?.target ?? 'product'}`);
        } else {
          console.log('  OK   state.install.target 与 PROJECT.json 一致');
        }
      }
      if (stateFile.remote?.url) {
        const actualRemote = gitOriginUrl(projectRoot);
        if (actualRemote && actualRemote !== stateFile.remote.url) {
          failCount++;
          console.log(`  FAIL state.remote.url 未写回：${stateFile.remote.url} vs git origin ${actualRemote}`);
        } else if (actualRemote) {
          console.log('  OK   state.remote.url 与 git origin 一致');
        }
      }
      const evolutionPath = path.join(dir, 'cluster', 'evolution.md');
      const evState = stateFile.evolution?.['EV-001']?.state;
      if (evState && !fs.existsSync(evolutionPath)) {
        failCount++;
        console.log('  FAIL 缺少 cluster/evolution.md，无法核对 state.evolution');
      } else if (evState) {
        const evolutionText = fs.readFileSync(evolutionPath, 'utf8');
        if (!evolutionText.includes(`**${evState}**`)) {
          failCount++;
          console.log(`  FAIL state.evolution 与 cluster/evolution.md 不一致：${evState}`);
        } else {
          console.log('  OK   state.evolution 与进化台账一致');
        }
      }
    } catch (error) {
      failCount++;
      console.log(`  FAIL state.json 无法解析：${error.message}`);
    }
  }

  const criteriaPath = path.join(dir, 'criteria.md');
  if (!fs.existsSync(criteriaPath)) {
    failCount++;
    console.log('  FAIL 缺少 criteria.md（v0.9 验收矩阵）');
  } else {
    const criteriaText = fs.readFileSync(criteriaPath, 'utf8');
    let criteriaRows = 0;
    for (const line of criteriaText.split(/\r?\n/)) {
      if (!line.trim().startsWith('|')) continue;
      const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
      if (cells.length < 8 || cells[0] === 'ID' || /^-+$/.test(cells[0])) continue;
      criteriaRows++;
      const [id, , criterionStatus, evidence, , humanDecision, due, impact] = cells;
      if (!STATE_ENUM.criteria.has(criterionStatus)) {
        failCount++;
        console.log(`  FAIL criteria ${id} 状态非法：${criterionStatus}`);
      }
      if (criterionStatus === 'met' && isPlaceholder(evidence)) {
        failCount++;
        console.log(`  FAIL criteria ${id} 为 met 但没有证据`);
      }
      if ((criterionStatus === 'waived' || criterionStatus === 'deferred') && (isPlaceholder(humanDecision) || isPlaceholder(due) || isPlaceholder(impact))) {
        failCount++;
        console.log(`  FAIL criteria ${id} 为 ${criterionStatus} 但缺少人类裁决/到期/影响门（不得用 - 占位）`);
      }
      if (criterionStatus === 'failed' || criterionStatus === 'not-started') {
        failCount++;
        console.log(`  FAIL criteria ${id} 为 ${criterionStatus}，不得通过`);
      }
    }
    if (criteriaRows === 0) {
      failCount++;
      console.log('  FAIL criteria.md 没有可解析的判据行');
    } else {
      console.log(`  OK   criteria.md（${criteriaRows} 行）`);
    }
    for (const debt of stateFile?.evidence_debt ?? []) {
      if (debt.id && !criteriaText.includes(debt.id)) {
        warnCount++;
        console.log(`  WARN 证据债 ${debt.id} 未在 criteria.md 引用`);
      }
    }
  }

  const docFiles = [
    ...walkMarkdown(dir),
    path.join(projectRoot, 'README.md'),
    path.join(projectRoot, 'AGENTS.md'),
    path.join(productDir, 'README.md'),
  ];
  let docCount = 0;
  for (const file of [...new Set(docFiles)]) {
    if (!fs.existsSync(file) || file.includes(`${path.sep}core${path.sep}`)) continue;
    docCount++;
    const text = fs.readFileSync(file, 'utf8');
    const rel = path.relative(projectRoot, file).replace(/\\/g, '/');
    const head = text.split(/\r?\n/).slice(0, 10).join('\n');
    if (!/^>\s*状态：(current|historical|superseded)/m.test(head)) {
      failCount++;
      console.log(`  FAIL 文档缺少状态头：${rel}`);
    }
    if (((text.match(/^```/gm) ?? []).length % 2) !== 0) {
      failCount++;
      console.log(`  FAIL Markdown 围栏未闭合：${rel}`);
    }
    const linkPattern = /\]\((?!https?:|mailto:|#)([^)\s]+)\)/g;
    let match;
    while ((match = linkPattern.exec(text)) !== null) {
      let target;
      try {
        target = decodeURIComponent(match[1].split('#')[0]);
      } catch {
        failCount++;
        console.log(`  FAIL 链接百分号编码非法：${rel} -> ${match[1]}`);
        continue;
      }
      if (!target) continue;
      const resolved = path.resolve(path.dirname(file), target);
      if (!fs.existsSync(resolved)) {
        failCount++;
        console.log(`  FAIL 坏链：${rel} -> ${match[1]}`);
      }
    }
  }
  console.log(`  OK   文档状态/围栏/链接检查（${docCount} 份）`);

  const contradictionChecks = [
    [p.status, /客户端 UI 未确认/, 'STATUS 仍写“客户端 UI 未确认”'],
    [p.status, /EV-001[^\n]*trial/, 'STATUS 仍把 EV-001 写成 trial'],
    [path.join(productDir, 'README.md'), /本副本未安装/, '产品 README 仍写“本副本未安装”'],
    [path.join(productDir, 'README.md'), /G2 遮挡推送修复待真机/, '产品 README 仍写“G2 待真机”'],
    [p.board, /已冻结\/已开工|UI 待确认/, '任务板仍写阶段/设置页未完成'],
    [path.join(dir, 'workspace', 'memory', 'README.md'), /trial（试用通过，未激活）/, 'memory README 仍写 EV-001 trial'],
    [path.join(dir, 'workspace', 'memory', 'ev-001-runtime-probe.md'), /结论：[\s\S]{0,60}未激活/, 'EV-001 提案仍写“未激活”'],
  ];
  for (const [file, pattern, message] of contradictionChecks) {
    if (fs.existsSync(file) && pattern.test(fs.readFileSync(file, 'utf8'))) {
      failCount++;
      console.log(`  FAIL 当前文档矛盾：${message}`);
    }
  }
  console.log('  OK   当前文档关键词一致性');

  console.log(`结果：FAIL ${failCount}｜WARN ${warnCount}${strict ? '（strict）' : ''}`);
  if (strict && warnCount > 0) console.log('  strict：WARN 视为 FAIL');
  console.log('说明：以上为结构/一致性检查；不是授权/发布证明。');
  if (failCount || (strict && warnCount > 0)) process.exit(1);
}

function demoDissentDetail() {
  return `# DR-001 · S2 · 风险/质量

- 日期：${DATE}
- 路由：直达（人类收件箱）
- 提出者/角色：人类目视（示例）
- 一句话主张：G2 常驻提醒遮挡授权/回答按钮，人类必须先关卡片才能操作。
- 事实依据：真机目视（示例，无截图）；F-002。
- 不确定性：无截图；G2-3 操作路径未记录。
- 影响：人类必须先关闭/移开卡片才能批准/回答；可逆但不可接受 → R2。
- 建议替代：不要求常驻；进入会话即收起卡片并关闭系统通知。
- 什么会改变我的判断：进入会话后卡片收起、按钮可点，且处理后不补弹。
- 请求动作：暂停 G2 高风险声明；修复后复验 G2-1~G2-7。

> S2：1 个工作日内接收、3 个工作日内裁决；未回应默认暂停/缩小。
`;
}

function demoGateBlocked() {
  return `# 门禁检查单 · G2-blocked

- 项目：demo-notify
- 日期：${DATE}
- 主持人：集群管家
- 决策：**暂停**

## 1. 关键事实（3–5 条）

| # | 事实 | 来源 | 状态 | 核验人 |
|---|---|---|---|---|
| 1 | 自动化 160/160 通过 | F-001 | 已核验 | verifier-agent |
| 2 | G2 常驻提醒遮挡授权/回答按钮 | F-002 | E2 人类目视（无截图） | 人类目视（示例） |

## 2. 主张 vs 事实（只列影响裁决的）

| 主张 | 来源 | 状态 | 差异 |
|---|---|---|---|
| “G2 可用” | 开发叙述 | **被反证** | 遮挡按钮，人类无法直接操作 |

## 3. 异议

- **开放 S1/S2：1 条（DR-001，阻断高风险）**
- 本周 S3/S4：0
- 需要人类裁决：进入会话即收起，是否接受？

## 4. 负事实

- G2-1 不通过；无截图；G2-3 操作路径未记录。

## 5. 决策与理由

- 结论：**暂停** G2 高风险声明。
- 理由：开放 S2 + 直接证据显示遮挡。
- 剩余风险与接受者：暂不接受；等修复复验。

## 6. 签署

- 集群管家：agent（示例）
- 工作区策展：agent（示例）
- 人类：待 DR-001 裁决
`;
}

function demoGateResolved() {
  return `# 门禁检查单 · G2-resolved

- 项目：demo-notify
- 日期：${DATE}
- 主持人：集群管家
- 决策：**有条件通过**

## 1. 关键事实（3–5 条）

| # | 事实 | 来源 | 状态 | 核验人 |
|---|---|---|---|---|
| 1 | DR-001 已关闭；改为“进入会话即收起” | ledger / DR-001 | 已核验 | 集群管家 |
| 2 | G2-1~G2-7 复验通过；G2-8 挂起 | 真机复验（示例） | E2 人类目视（无截图） | 人类目视（示例） |

## 2. 主张 vs 事实（只列影响裁决的）

| 主张 | 来源 | 状态 | 差异 |
|---|---|---|---|
| “G2-1 遮挡已消除” | 复验记录 | 已核验（有限） | 仅本机、无截图 |

## 3. 异议

- **开放 S1/S2：0**
- 本周 S3/S4：0
- 需要人类裁决：G2-8 未测，是否接受为遗留？

## 4. 负事实

- G2-8 双会话并发未测；无截图。

## 5. 决策与理由

- 结论：**有条件通过**。
- 理由：DR-001 关闭；G2-1~G2-7 通过；G2-8 由人类接受为遗留。
- 剩余风险与接受者：G2-8 未测 → Human Owner (demo)。

## 6. 签署

- 集群管家：agent（示例）
- 工作区策展：agent（示例）
- 人类：Human Owner (demo)
`;
}

function demoDirection() {  return `# 方向与边界 · demo-notify

> 人类所有者：Human Owner (demo)｜版本：v0.1｜日期：${DATE}
> 示例项目：演示“通知遮挡人类操作”如何被异议/事实/门禁接住。

## 1. 方向

- **目的**：让 agent 完成/等待授权时可见，不必盯着屏幕；不替人做决定。
- **受益者**：本机使用 DSH 的人类；成本由人类承担。
- **价值排序**：可信 > 不打扰 > 可定制 > 功能多。
- **成功定义**：完成与等待授权时提醒；不遮挡人类操作；可关闭。
- **失败定义**：误报/漏报关键授权；遮挡按钮；替人批准/拒绝；读会话正文。

## 2. 非目标

- 任务管理、通知历史、托盘/声音、自动操作、外部发布承诺。

## 3. 风险分级

| 级别 | 定义 | 例子 | 默认动作 |
|---|---|---|---|
| S1 | 迫近伤害/违法/不可逆/隐私 | 替人批准、外发数据 | 立即停；1h 知会；24h 人裁 |
| S2 | 高风险/越界/重大分歧 | 遮挡授权按钮 | 1 工作日内报告；未修复暂停能力 |
| S3 | 质量/进度受损 | 文案错、延迟 | 本地修；周会 |
| S4 | 改进建议 | 样式微调 | 本地/周会 |

## 4. 预算与停止

- 时间：2 周；成本：20 个有效 agent 回合。
- 停止：触发 S1；信号无法取证；需要新增依赖/改宿主；连续两道门禁失败。

## 5. 升级触发

- S1/S2 → 直达人类；S3/S4 → 集群管家 + 人类周抽样。
- 人类注意力预算：≤2 小时/周。

## 6. 边界变更

- 只有 Human Owner (demo) 能改方向/红线；升版本 + 理由 + 影响 + 确认。
`;
}

function demoBlueprint() {
  return `# 施工蓝图 · demo-notify

- 版本：v1
- 阶段：grow-1
- 日期：${DATE}
- 状态：approved
- 批准人：Human Owner (demo)

> 示例：这是“怎么做”的阶段基线，不是方向。只做 grow-1，不覆盖整个项目。

## 1. 本阶段目标

- 对应宪章目的：完成/等待授权可见，不替人操作。
- 本阶段可观察结果：提醒不遮挡按钮；进入会话即收起；可关闭。
- 本阶段非目标：任务管理、通知历史、托盘/声音、自动操作、外部发布。

## 2. 工作包

| ID | 工作包 | 负责人 | 输入 | 输出 | 验收判据 | 依赖 |
|---|---|---|---|---|---|---|
| WP-1 | 完成/授权提醒 | agent | 事件探针 | 提醒卡 | G1 5/5；不遮挡 | 无 |
| WP-2 | 会话进入即收起 | agent | WP-1 | 收起逻辑 | G2-1~7 通过；处理后不补弹 | WP-1 |
| WP-3 | 外观/关闭 | agent | WP-1 | 样式/开关 | G3 6/6 | WP-1 |

## 3. 接口与契约

| 接口 | 谁提供 | 谁消费 | 契约（输入/输出/错误） | 兼容策略 |
|---|---|---|---|---|
| 事件 → 提醒 | DSH 事件 | 提醒卡 | outcome/need-auth；未知事件忽略 | 只读，不改宿主 |
| 提醒卡 → 人类 | 提醒卡 | 人类 | 可见、可关、不遮挡授权按钮 | 失败即回退为静默 |

## 4. 未知与假设

| # | 未知/假设 | 影响 | 怎么验证 | 什么时候必须有答案 |
|---|---|---|---|---|
| 1 | 双会话并发行为 | G2-8 未测 | 两窗口实测 | 发布前 |
| 2 | 卡片时长是否够读 | G3-4b 未单独 | 真机计时 | 发布前 |

## 5. 本阶段不做

- 不做通知历史、托盘、声音、自动批准、外部发布。

## 6. 阶段验收

- 聚合判据：G1 5/5；G2 7/8；G3 6/6。
- 证据要求：E1 自动化输出；E2 人类真机目视（无截图要标注）。
- 允许的遗留：G2-8 / G3-4b，由人类书面接受。

## 7. 变更记录

| 版本 | 日期 | 变更 | 理由 | 批准人 |
|---|---|---|---|---|
| v1 | ${DATE} | 初版 | 进入 grow-1 | Human Owner (demo) |
`;
}

function demoStatus() {
  return `# STATUS · demo-notify

> **唯一当前状态页。** 最后更新：${DATE}｜人类所有者：Human Owner (demo)
> 规则：本页是当前状态；其他文档是证据/历史。冲突以本页为准。
> 证据等级：**E1** 运行事实｜**E2** 人类目视（无截图）｜**E3** 文档主张。

## 1. 当前阶段

- 阶段：land（示例）
- 阶段状态：seed
- 版本：v0.1.0-demo
- 当前目标：完成/等待授权可见，不替人操作
- 当前门禁：G2（blocked → resolved；最终有条件通过）

## 2. 当前证据

### 2.1 E1（运行事实）
- 自动化 160/160；node --check 17/17（示例数据）。
- 入口/路由探针：GET /outcome → 400/404（示例数据）。

### 2.2 E2（人类目视，无截图）
- G1 5/5；G2 7/8；G3 6/6（示例数据；本 demo 不声称真实）。

### 2.3 E3（文档主张）
- 历史 142/142、10-1-13（示例历史，未复核）。

## 3. 已接受遗留

| 项 | 内容 | 接受者 | 证据 |
|---|---|---|---|
| G2-8 | 双会话并发未测 | Human Owner (demo) | acceptance.md |
| G3-4b | 提醒卡时长未单独 | Human Owner (demo) | acceptance.md |

## 4. 未测 / 开放

| # | 项 | 状态 | 下一步 |
|---|---|---|---|
| 1 | 真机截图/录屏 | 零 | 下次真机默认截图 |
| 2 | 具名所有者 | 已填（demo） | 真实项目替换 |

## 5. 文档时效

| 文档 | 时效 | 说明 |
|---|---|---|
| STATUS.md | 当前 | 唯一当前状态 |
| human/direction.md | 当前 | 方向/边界 |
| BLUEPRINT.md | 当前 | 施工蓝图（grow-1） |
| ledger.md | 当前 | 异议/事实/变更 |
| gates/ | 历史 | 每道门当时的记录 |

## 6. 下一步

1. 真实项目把 demo 数据换成 E1/E2 实测。
2. 补 G2-8/G3-4b 真机 + 截图。
3. 每周抽样 1–2 条 S3/S4。
`;
}

function cmdDemo(args, flags) {
  const target = path.join(ROOT, 'examples', 'demo-project');
  const rel = path.relative(path.join(ROOT, 'examples'), target);
  if (rel.startsWith('..') || path.isAbsolute(rel)) fail('demo 目标越界，拒绝删除');
  if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
  cmdInit([target], { name: 'demo-notify', owner: 'Human Owner (demo)', goal: '完成/等待授权可见，不替人操作', force: true });
  const p = projectPaths(target);
  fs.writeFileSync(p.direction, demoDirection(), 'utf8');
  fs.writeFileSync(p.status, demoStatus(), 'utf8');
  fs.writeFileSync(p.blueprint, demoBlueprint(), 'utf8');
  cmdFreeze([target], {
    'charter-confirmed': true,
    stage: 'grow-1',
    scope: 'G2 授权提醒 + G3 外观；不含外部发布',
    budget: '2 周 / 20 个有效 agent 回合',
    stop: 'S1 / 预算耗尽 / 连续两道门禁失败',
    acceptance: 'G1 5/5、G2 7/8、G3 6/6；G2-8/G3-4b 可由人类接受为遗留',
  });
  cmdStart([target], {
    by: 'Human Owner (demo)',
    'first-report': 'G2 门禁前，或触发 S2 / 预算耗尽时',
  });
  // 变更示例：task 级吸收；blueprint 级被拒绝，防止范围蔓延
  cmdChange([target], {
    type: 'task',
    title: '提醒卡文案改为中文',
    reason: '人类可读',
    impact: '不改验收判据',
    by: 'agent',
    decision: '接受',
  });
  cmdChange([target], {
    type: 'blueprint',
    title: '把 G2-8 双会话并发纳入本阶段',
    reason: '希望一次做完',
    impact: '需两窗口实测，+1 周；可能超预算',
    by: 'Human Owner (demo)',
    decision: '拒绝',
  });
  fs.writeFileSync(
    path.join(p.landing, 'manifest.md'),
    `# 落地清单 · demo-notify\n\n- 版本：v0.1.0-demo\n- 可用：完成/授权提醒，不遮挡\n- 可运维：本机自用；重启/刷新路径已写\n- 可交接：STATUS + 台账 + 门禁\n- 可审计：事实/异议均有 ID\n- 成本：本机零依赖\n- 遗留：G2-8、G3-4b 已接受（示例）\n- 照护者：Human Owner (demo)\n- 退役：删除插件 + 还原 profile\n`,
    'utf8',
  );

  // 示例异议/事实/门禁/裁决
  cmdFact([target], { statement: '自动化 160/160 通过，node --check 17/17', source: 'node --test（示例输出）', status: '已核验', verifier: 'verifier-agent' });
  cmdFact([target], { statement: 'G2 常驻提醒遮挡会话底部授权/回答按钮', source: '人类目视（示例，无截图）', status: '已捕获', verifier: '人类目视' });
  cmdDissent([target], { severity: 'S2', type: '风险/质量', claim: 'G2 常驻提醒遮挡授权/回答按钮，人类必须先关卡片才能操作', evidence: '真机目视（示例，无截图）', route: '直达', owner: '人类目视（示例）' });
  fs.writeFileSync(path.join(p.inbox, 'DR-001.md'), demoDissentDetail(), 'utf8');
  cmdGate([target], { name: 'G2-blocked', decision: '暂停', host: '集群管家' });
  fs.writeFileSync(path.join(p.gates, `${DATE}-g2-blocked.md`), demoGateBlocked(), 'utf8');
  cmdResolve([target], { id: 'DR-001', decision: '接受：改为进入会话即收起；复验 G2-1~G2-7 通过' });
  cmdGate([target], { name: 'G2-resolved', decision: '有条件通过', host: '集群管家' });
  fs.writeFileSync(path.join(p.gates, `${DATE}-g2-resolved.md`), demoGateResolved(), 'utf8');
  cmdAccept([target], { item: 'G2 7/8；G2-8 未测', decision: '有条件接受', evidence: '真机目视（示例，无截图）', risk: 'G2-8 双会话并发未测', by: 'Human Owner (demo)' });
  cmdAccept([target], { item: 'G3 6/6；G3-4b 未单独', decision: '有条件接受', evidence: '真机目视（示例，无截图）', risk: 'G3-4b 未单独实测', by: 'Human Owner (demo)' });
  cmdLog([target], { decision: '发布 v0.1.0-demo', reason: 'G2-1 遮挡已修复；接受 G2-8/G3-4b 遗留' });

  let finalStatus = fs.readFileSync(p.status, 'utf8')
    .replace(/- 阶段：.*/, '- 阶段：grow-1（closed）')
    .replace(/- 阶段状态：.*/, '- 阶段状态：closed');
  fs.writeFileSync(p.status, finalStatus, 'utf8');

  console.log('\n=== Demo 完成 ===');
  console.log(`项目：${target}`);
  console.log('阅读顺序：STATUS.md → human/direction.md → BLUEPRINT.md → gates/（charter-freeze → start-order → g2-blocked → g2-resolved）→ ledger.md → workspace/landing/manifest.md');
  console.log(`检查：node bin/aecw.mjs check "${target}"`);
  console.log('说明：这是原型演示数据，不是真实验收；真实项目必须换成 E1/E2 实测。');
}

function main() {
  const { args, flags } = parse(process.argv.slice(2));
  const cmd = args.shift();
  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') return usage();
  switch (cmd) {
    case 'init': return cmdInit(args, flags);
    case 'blueprint': return cmdBlueprint(args, flags);
    case 'freeze': return cmdFreeze(args, flags);
    case 'start': return cmdStart(args, flags);
    case 'pause': return cmdPause(args, flags);
    case 'resume': return cmdResume(args, flags);
    case 'close': return cmdClose(args, flags);
    case 'change': return cmdChange(args, flags);
    case 'status': return cmdStatus(args);
    case 'dissent': return cmdDissent(args, flags);
    case 'fact': return cmdFact(args, flags);
    case 'gate': return cmdGate(args, flags);
    case 'verify': return cmdVerify(args, flags);
    case 'resolve': return cmdResolve(args, flags);
    case 'accept': return cmdAccept(args, flags);
    case 'log': return cmdLog(args, flags);
    case 'check': return cmdCheck(args, flags);
    case 'demo': return cmdDemo(args, flags);
    default: return fail(`未知命令：${cmd}（用 help 查看）`);
  }
}

main();
