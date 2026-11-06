#!/usr/bin/env node
/**
 * AECW EV-001：运行态探针（只读，零依赖）。
 *
 * 用途：每道门/接手前确认“文档说已安装”是否成立：
 *   包版本、profile link、junction 目标、bundles、patch 配置、health 身份、outcome 错误体。
 * 不读会话正文/工具参数/文件内容/密钥；不写任何文件；不改配置；不向写端点 POST。
 *
 * 用法：
 *   node scripts/probe.mjs
 *   node scripts/probe.mjs --url http://127.0.0.1:36574 --profile desktop
 * 环境：DSH_HOME / DSH_PROFILE / DSH_WEB_URL
 * 退出码：0 = 全部通过；1 = 有失败（用于门禁前阻断）。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PRODUCT = path.resolve(ROOT, '..');
const HEALTH_PATH = '/dsh-task-complete/health';
const DEFAULT_ROUTE_PATH = '/dsh-task-complete/outcome';
const LOOPBACK = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] ?? fallback : fallback;
};

const DSH_HOME = process.env.DSH_HOME ?? path.join(os.homedir(), '.dsh');
const profile = arg('profile', process.env.DSH_PROFILE ?? 'desktop');
const rawBaseUrl = String(arg('url', process.env.DSH_WEB_URL ?? '')).replace(/\/+$/, '');
const profileDir = path.join(DSH_HOME, 'profiles', profile);
const results = [];

async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail: detail ?? '' });
  } catch (error) {
    results.push({ name, ok: false, detail: String(error?.message ?? error) });
  }
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/** 只接受 loopback、根路径、无 userinfo/query/fragment 的 canonical URL。 */
function parseBaseUrl(raw) {
  if (raw === '') throw new Error('DSH_WEB_URL/--url missing');
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`invalid url: ${raw}`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error(`unsupported protocol: ${url.protocol}`);
  if (url.username || url.password) throw new Error('userinfo not allowed');
  if (url.search || url.hash) throw new Error('query/fragment not allowed');
  if (url.pathname !== '/' && url.pathname !== '') throw new Error(`base path not allowed: ${url.pathname}`);
  if (!LOOPBACK.has(url.hostname.toLowerCase())) throw new Error(`non-loopback host: ${url.hostname}`);
  return `${url.protocol}//${url.host}`;
}

/** 从 patch 读取 bridge.routePath；拒绝 network-path/相对/带 query 的路径。 */
function readRoutePath(patch) {
  const match = patch.match(/routePath:\s*['"]?([^'"\s#]+)/);
  const routePath = match ? match[1] : DEFAULT_ROUTE_PATH;
  if (!routePath.startsWith('/') || routePath.startsWith('//')) throw new Error(`invalid routePath: ${routePath}`);
  if (routePath.includes('..') || /[?#\s]/.test(routePath)) throw new Error(`unsafe routePath: ${routePath}`);
  return routePath;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    redirect: 'manual',
    signal: AbortSignal.timeout(3000),
    ...options,
  });
  if (response.status >= 300 && response.status < 400) {
    throw new Error(`redirect not allowed (${response.status})`);
  }
  const contentType = String(response.headers.get('content-type') ?? '');
  if (!contentType.includes('application/json')) throw new Error(`not json: ${contentType || '(empty)'}`);
  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error('invalid json body');
  }
  return { response, body };
}

let parsedBase = '';
let baseError = '';
try {
  parsedBase = parseBaseUrl(rawBaseUrl);
} catch (error) {
  baseError = String(error?.message ?? error);
}

let pkg;
let routePath = '';
let patchText = '';

await check('宿主 package.json', () => {
  pkg = readJson(path.join(PRODUCT, 'package.json'));
  if (pkg.name !== '@local/task-complete-toast') throw new Error(`unexpected name ${pkg.name}`);
  if (typeof pkg.version !== 'string' || pkg.version.length === 0) throw new Error('missing version');
  return `${pkg.name}@${pkg.version} (${PRODUCT})`;
});

await check('profile dependency link', () => {
  const profilePkg = readJson(path.join(profileDir, 'package.json'));
  const link = profilePkg.dependencies?.['@local/task-complete-toast'];
  if (typeof link !== 'string') throw new Error('dependency missing');
  const normalized = link.replace(/\\/g, '/').replace(/\/+$/, '');
  if (!/task-complete-toast-aecw$/.test(normalized)) throw new Error(`not pointing to repo root: ${link}`);
  return link;
});

await check('profile bundles', () => {
  const profilePkg = readJson(path.join(profileDir, 'package.json'));
  const bundles = profilePkg.dsh?.profile?.bundles ?? [];
  if (!bundles.includes('@local/task-complete-toast')) throw new Error('bundle entry missing');
  return '@local/task-complete-toast';
});

await check('junction target', () => {
  const link = path.join(profileDir, 'node_modules', '@local', 'task-complete-toast');
  const target = fs.realpathSync(link);
  const normalized = target.replace(/\\/g, '/').replace(/\/+$/, '');
  if (!/task-complete-toast-aecw$/.test(normalized)) throw new Error(`unexpected target: ${target}`);
  return target;
});

await check('profile patch config', () => {
  patchText = fs.readFileSync(path.join(profileDir, 'cordis.patch.yml'), 'utf8');
  if (!/id:\s*task-complete-toast\b/.test(patchText)) throw new Error('task-complete-toast patch entry missing');
  if (!/appearance:\s*/.test(patchText)) throw new Error('appearance config missing');
  routePath = readRoutePath(patchText);
  return `task-complete-toast + appearance + ${routePath}`;
});

await check('HTTP health identity', async () => {
  if (baseError) throw new Error(baseError);
  const { response, body } = await fetchJson(`${parsedBase}${HEALTH_PATH}`, {
    headers: { accept: 'application/json' },
  });
  if (response.status !== 200) throw new Error(`expected 200, got ${response.status}`);
  if (body?.plugin !== pkg.name) throw new Error(`plugin mismatch: ${body?.plugin}`);
  if (body?.version !== pkg.version) throw new Error(`version mismatch: ${body?.version} vs ${pkg.version}`);
  if (typeof body?.instance !== 'string' || body.instance.length < 8) throw new Error('instance missing');
  if (!Array.isArray(body?.capabilities) || !body.capabilities.includes('outcome') || !body.capabilities.includes('settings')) {
    throw new Error('capabilities missing outcome/settings');
  }
  if (body?.routePath !== routePath) throw new Error(`routePath mismatch: ${body?.routePath} vs ${routePath}`);
  return `${body.plugin}@${body.version} · ${body.instance.slice(0, 8)}…`;
});

await check('HTTP outcome route (expect 400 + invalid-session-id)', async () => {
  if (baseError) throw new Error(baseError);
  const { response, body } = await fetchJson(`${parsedBase}${routePath}`, {
    headers: { accept: 'application/json' },
  });
  if (response.status !== 400) throw new Error(`expected 400, got ${response.status}`);
  if (body?.error !== 'invalid-session-id') throw new Error(`unexpected error body: ${JSON.stringify(body)}`);
  return '400 invalid-session-id';
});

for (const row of results) {
  console.log(`${row.ok ? 'PASS' : 'FAIL'}  ${row.name}${row.detail ? ` — ${row.detail}` : ''}`);
}
const failed = results.filter((row) => !row.ok).length;
console.log(`\nAECW EV-001 probe: ${results.length - failed}/${results.length} passed${parsedBase ? ` · ${parsedBase}` : ' · no url'}`);
process.exit(failed === 0 ? 0 : 1);
