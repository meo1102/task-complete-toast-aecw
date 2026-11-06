import crypto from 'node:crypto';
import { classify } from './classify.js';
import { validateAppearancePatch, contrastRatio } from './config.js';

/** sessionId 长度上限（§6.3）。 */
const MAX_SESSION_ID_LENGTH = 200;
/** 设置请求体上限（G4；这是一次样式补丁，不需要大 body）。 */
const MAX_SETTINGS_BODY = 16 * 1024;
/** 设置写路由的速率限制：每个远端地址 10 秒内最多 30 次。 */
const SETTINGS_RATE_LIMIT = 30;
const SETTINGS_RATE_WINDOW_MS = 10_000;
/** CSRF header 名（小写，Node 已规范化 header key）。 */
const CSRF_HEADER = 'x-aecw-csrf';
/** 只信任 loopback 主机名。 */
const LOOPBACK_HOSTNAMES = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);
/** C0 控制字符与 DEL。 */
const CONTROL_CHARACTER = /[\u0000-\u001F\u007F]/;
/** 所有 JSON 响应共用的安全头（§7.3）。 */
const JSON_HEADERS = Object.freeze({
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
});

/**
 * Host header 必须是 loopback + 合法 host:port；拒绝 userinfo/query/fragment。
 * @param {unknown} value
 */
export function isLoopbackHost(value) {
  if (typeof value !== 'string' || value.trim() === '') return false;
  let url;
  try {
    url = new URL(`http://${value.trim()}`);
  } catch {
    return false;
  }
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/') return false;
  return LOOPBACK_HOSTNAMES.has(url.hostname.toLowerCase());
}

/**
 * settings 写请求必须同源：Host 是 loopback，Origin 存在且 host 与 Host 完全一致。
 * @param {{headers?: Record<string, string|string[]|undefined>}} req
 */
export function isSameOriginRequest(req) {
  const host = req?.headers?.host;
  if (!isLoopbackHost(host)) return false;
  const origin = req?.headers?.origin;
  if (typeof origin !== 'string' || origin === '') return false;
  let url;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  if (!LOOPBACK_HOSTNAMES.has(url.hostname.toLowerCase())) return false;
  return url.host.toLowerCase() === String(host).trim().toLowerCase();
}

/** Content-Type 必须是 application/json（允许 charset 参数）。 */
export function hasJsonContentType(req) {
  const value = req?.headers?.['content-type'];
  if (typeof value !== 'string') return false;
  return value.split(';')[0].trim().toLowerCase() === 'application/json';
}

/** 固定长度 token 的 timing-safe 比较。 */
export function tokenMatches(received, expected) {
  if (typeof received !== 'string' || typeof expected !== 'string') return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * 只接受 `?sessionId=`，长度 ≤ 200，拒绝控制字符。
 * @param {import('node:http').IncomingMessage} req
 * @returns {string|undefined}
 */
export function readSessionId(req) {
  if (req === null || typeof req !== 'object' || typeof req.url !== 'string') return undefined;

  let url;
  try {
    url = new URL(req.url, 'http://127.0.0.1');
  } catch {
    return undefined;
  }

  const sessionId = url.searchParams.get('sessionId');
  if (typeof sessionId !== 'string' || sessionId.length === 0) return undefined;
  if (sessionId.length > MAX_SESSION_ID_LENGTH) return undefined;
  if (CONTROL_CHARACTER.test(sessionId)) return undefined;
  return sessionId;
}

/**
 * 统一写出 JSON：`no-store`、`nosniff`，可追加 `allow` 等头。
 * @param {import('node:http').ServerResponse} res
 * @param {number} status
 * @param {unknown} body
 * @param {Record<string, string>} [extraHeaders]
 */
export function sendJson(res, status, body, extraHeaders) {
  res.writeHead(status, { ...JSON_HEADERS, ...extraHeaders });
  res.end(JSON.stringify(body));
}

/**
 * `turn/end` 事件 → 结果表条目；其他事件返回 undefined。
 * @param {{id: string}|undefined} session
 * @param {{type?: string, time?: number, seq?: number, data?: {reason?: object}}|undefined} event
 * @param {() => number} now
 */
export function toOutcomeEntry(session, event, now = Date.now) {
  if (event === null || typeof event !== 'object' || event.type !== 'turn/end') return undefined;

  const sessionId = session?.id;
  if (typeof sessionId !== 'string' || sessionId.length === 0) return undefined;

  const { outcome, reasonKind, cancelCause } = classify(event.data?.reason);
  const at = Number.isFinite(event.time) ? event.time : now();
  const seq = Number.isFinite(event.seq) ? event.seq : 0;

  return { sessionId, outcome, reasonKind, cancelCause, at, seq };
}

/**
 * 路由处理器：只做「方法 → id → 查表 → 200/404/400」，不读取任何会话内容。
 * @param {{table: {get: (id: string) => object|undefined}, exposeReason: boolean}} options
 */
export function createRouteHandler({ table, exposeReason }) {
  return function handle(req, res) {
    if (req?.method !== 'GET') {
      sendJson(res, 405, { error: 'method-not-allowed' }, { allow: 'GET' });
      return;
    }

    const sessionId = readSessionId(req);
    if (sessionId === undefined) {
      sendJson(res, 400, { error: 'invalid-session-id' });
      return;
    }

    const entry = table.get(sessionId);
    if (entry === undefined) {
      sendJson(res, 404, { error: 'unknown-session' });
      return;
    }

    const body = exposeReason
      ? {
        sessionId: entry.sessionId,
        outcome: entry.outcome,
        reasonKind: entry.reasonKind,
        cancelCause: entry.cancelCause,
        at: entry.at,
        seq: entry.seq,
      }
      : {
        sessionId: entry.sessionId,
        outcome: entry.outcome,
        at: entry.at,
      };

    sendJson(res, 200, body);
  };
}

/**
 * 读取并解析 JSON 请求体（G4 设置路由）；超限/非法 JSON 直接拒绝。
 * @param {import('node:http').IncomingMessage} req
 * @param {number} [maxBytes]
 */
export function readJsonBody(req, maxBytes = MAX_SETTINGS_BODY) {
  return new Promise((resolve, reject) => {
    if (req === null || typeof req !== 'object' || typeof req.on !== 'function') {
      reject(new Error('invalid-request'));
      return;
    }
    const chunks = [];
    let size = 0;
    let settled = false;
    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    req.on('data', (chunk) => {
      if (settled) return;
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
      size += bytes.length;
      if (size > maxBytes) {
        fail(new Error('body-too-large'));
        if (typeof req.destroy === 'function') req.destroy();
        return;
      }
      chunks.push(bytes);
    });
    req.on('end', () => {
      if (settled) return;
      settled = true;
      const text = Buffer.concat(chunks).toString('utf8');
      if (text.trim() === '') {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(text));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', fail);
  });
}

/**
 * 只读 health：插件身份/版本/实例/能力/路由；不读会话、不写配置。
 * @param {{plugin: string, version: string, instance: string, routePath: string, capabilities?: string[]}} options
 */
export function createHealthHandler({ plugin, version, instance, routePath, capabilities = [] }) {
  return function handle(req, res) {
    if (req?.method !== 'GET') {
      sendJson(res, 405, { error: 'method-not-allowed' }, { allow: 'GET' });
      return;
    }
    if (!isLoopbackHost(req?.headers?.host)) {
      sendJson(res, 403, { error: 'untrusted-host' });
      return;
    }
    sendJson(res, 200, {
      schema: 1,
      plugin,
      version,
      instance,
      routePath,
      capabilities,
    });
  };
}

/**
 * 同源 GET 领取 CSRF token；token 只用于 settings 写路由。
 * @param {{csrfToken: string, instance: string}} options
 */
export function createSettingsTokenHandler({ csrfToken, instance }) {
  if (typeof csrfToken !== 'string' || csrfToken.length < 32) {
    throw new TypeError('task-complete-toast: csrfToken must be at least 32 chars');
  }
  return function handle(req, res) {
    if (req?.method !== 'GET') {
      sendJson(res, 405, { error: 'method-not-allowed' }, { allow: 'GET' });
      return;
    }
    if (!isLoopbackHost(req?.headers?.host)) {
      sendJson(res, 403, { error: 'untrusted-host' });
      return;
    }
    const origin = req?.headers?.origin;
    if (origin !== undefined && !isSameOriginRequest(req)) {
      sendJson(res, 403, { error: 'untrusted-origin' });
      return;
    }
    sendJson(res, 200, { token: csrfToken, instance });
  };
}

/**
 * 设置路由：POST JSON 补丁 → Host/Origin/CSRF/Content-Type/非空 → 校验白名单 → 对比度守卫 → 交宿主保存。
 * @param {{save: (patch: object) => Promise<object|void>, security: {csrfToken: string}}} options
 */
export function createSettingsHandler({ save, security }) {
  if (security === null || typeof security !== 'object' || typeof security.csrfToken !== 'string' || security.csrfToken.length < 32) {
    throw new TypeError('task-complete-toast: createSettingsHandler requires security.csrfToken (>=32 chars)');
  }
  const hits = new Map();
  let windowStart = Date.now();
  const limited = (req) => {
    const key = req?.socket?.remoteAddress ?? 'local';
    if (Date.now() - windowStart > SETTINGS_RATE_WINDOW_MS) {
      hits.clear();
      windowStart = Date.now();
    }
    const next = (hits.get(key) ?? 0) + 1;
    hits.set(key, next);
    return next > SETTINGS_RATE_LIMIT;
  };

  return async function handle(req, res) {
    if (req?.method !== 'POST') {
      sendJson(res, 405, { error: 'method-not-allowed' }, { allow: 'POST' });
      return;
    }
    if (limited(req)) {
      sendJson(res, 429, { error: 'rate-limited' }, { 'retry-after': '10' });
      return;
    }
    if (!isLoopbackHost(req?.headers?.host)) {
      sendJson(res, 403, { error: 'untrusted-host' });
      return;
    }
    if (!isSameOriginRequest(req)) {
      sendJson(res, 403, { error: 'untrusted-origin' });
      return;
    }
    if (!tokenMatches(req?.headers?.[CSRF_HEADER], security.csrfToken)) {
      sendJson(res, 403, { error: 'invalid-csrf-token' });
      return;
    }
    if (!hasJsonContentType(req)) {
      sendJson(res, 415, { error: 'unsupported-media-type' });
      return;
    }

    let patch;
    try {
      patch = await readJsonBody(req);
    } catch (error) {
      sendJson(res, 400, { error: 'invalid-json', message: String(error?.message ?? error) });
      return;
    }
    if (patch === null || typeof patch !== 'object' || Array.isArray(patch) || Object.keys(patch).length === 0) {
      sendJson(res, 400, { error: 'empty-patch' });
      return;
    }

    const validation = validateAppearancePatch(patch);
    if (validation.issues) {
      sendJson(res, 400, { error: 'invalid-settings', details: validation.issues });
      return;
    }

    const { backgroundColor, textColor } = validation.value;
    if (typeof backgroundColor === 'string' && typeof textColor === 'string') {
      const ratio = contrastRatio(backgroundColor, textColor);
      if (ratio < 4.5) {
        sendJson(res, 422, { error: 'contrast-too-low', ratio: Number(ratio.toFixed(2)) });
        return;
      }
    }

    try {
      const saved = await save(validation.value);
      sendJson(res, 200, { ok: true, appearance: saved ?? validation.value });
    } catch (error) {
      sendJson(res, 500, { error: 'save-failed', message: String(error?.message ?? error) });
    }
  };
}
