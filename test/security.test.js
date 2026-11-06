import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createHealthHandler,
  createSettingsHandler,
  createSettingsTokenHandler,
  hasJsonContentType,
  isLoopbackHost,
  isSameOriginRequest,
  tokenMatches,
} from '../lib/host.js';
import { createFakeResponse, readResponseJson, requestJsonRoute, requestRoute } from './harness.js';

const HOST = '127.0.0.1:36137';
const ORIGIN = `http://${HOST}`;
const TOKEN = 'c'.repeat(64);
const BASE_HEADERS = Object.freeze({
  host: HOST,
  origin: ORIGIN,
  'content-type': 'application/json',
  'x-aecw-csrf': TOKEN,
});

test('health/token 只信任 loopback Host；health 不写配置', () => {
  const health = createHealthHandler({
    plugin: '@local/task-complete-toast',
    version: '1.3.1',
    instance: 'instance-1',
    routePath: '/dsh-task-complete/outcome',
    capabilities: ['outcome', 'settings'],
  });
  const ok = requestRoute({ handler: health }, 'GET', '/dsh-task-complete/health', { host: HOST });
  assert.equal(ok.statusCode, 200);
  assert.deepEqual(readResponseJson(ok), {
    schema: 1,
    plugin: '@local/task-complete-toast',
    version: '1.3.1',
    instance: 'instance-1',
    routePath: '/dsh-task-complete/outcome',
    capabilities: ['outcome', 'settings'],
  });
  assert.equal(ok.headers['cache-control'], 'no-store');

  const badHost = requestRoute({ handler: health }, 'GET', '/dsh-task-complete/health', { host: 'attacker.invalid' });
  assert.equal(badHost.statusCode, 403);
  assert.equal(readResponseJson(badHost).error, 'untrusted-host');
  const method = requestRoute({ handler: health }, 'POST', '/dsh-task-complete/health', { host: HOST });
  assert.equal(method.statusCode, 405);

  const token = createSettingsTokenHandler({ csrfToken: TOKEN, instance: 'instance-1' });
  const tokenOk = requestRoute({ handler: token }, 'GET', '/dsh-task-complete/settings-token', { host: HOST, origin: ORIGIN });
  assert.equal(tokenOk.statusCode, 200);
  assert.equal(readResponseJson(tokenOk).token, TOKEN);
  const tokenBadHost = requestRoute({ handler: token }, 'GET', '/dsh-task-complete/settings-token', { host: 'attacker.invalid' });
  assert.equal(tokenBadHost.statusCode, 403);
  const tokenBadOrigin = requestRoute({ handler: token }, 'GET', '/dsh-task-complete/settings-token', {
    host: HOST,
    origin: 'https://attacker.invalid',
  });
  assert.equal(tokenBadOrigin.statusCode, 403);
});

test('settings 写路由：Host/Origin/CSRF/Content-Type/空 patch 全部 fail-closed', async () => {
  assert.throws(() => createSettingsHandler({ save: async () => {} }), /csrfToken/);

  const saved = [];
  const route = {
    handler: createSettingsHandler({
      save: async (patch) => {
        saved.push(patch);
        return patch;
      },
      security: { csrfToken: TOKEN },
    }),
  };
  const body = { fontSize: 16, cardWidth: 340, backgroundColor: null, textColor: null };

  const noOrigin = await requestJsonRoute(route, 'POST', '/dsh-task-complete/settings', body, {
    ...BASE_HEADERS,
    origin: undefined,
  });
  assert.equal(noOrigin.statusCode, 403);
  assert.equal(readResponseJson(noOrigin).error, 'untrusted-origin');

  const evilOrigin = await requestJsonRoute(route, 'POST', '/dsh-task-complete/settings', body, {
    ...BASE_HEADERS,
    origin: 'https://attacker.invalid',
  });
  assert.equal(evilOrigin.statusCode, 403);

  const badHost = await requestJsonRoute(route, 'POST', '/dsh-task-complete/settings', body, {
    ...BASE_HEADERS,
    host: 'attacker.invalid',
  });
  assert.equal(badHost.statusCode, 403);
  assert.equal(readResponseJson(badHost).error, 'untrusted-host');

  const noToken = await requestJsonRoute(route, 'POST', '/dsh-task-complete/settings', body, {
    ...BASE_HEADERS,
    'x-aecw-csrf': undefined,
  });
  assert.equal(noToken.statusCode, 403);
  assert.equal(readResponseJson(noToken).error, 'invalid-csrf-token');

  const wrongToken = await requestJsonRoute(route, 'POST', '/dsh-task-complete/settings', body, {
    ...BASE_HEADERS,
    'x-aecw-csrf': 'd'.repeat(64),
  });
  assert.equal(wrongToken.statusCode, 403);

  const textPlain = await requestJsonRoute(route, 'POST', '/dsh-task-complete/settings', body, {
    ...BASE_HEADERS,
    'content-type': 'text/plain',
  });
  assert.equal(textPlain.statusCode, 415);
  assert.equal(readResponseJson(textPlain).error, 'unsupported-media-type');

  const empty = await requestJsonRoute(route, 'POST', '/dsh-task-complete/settings', {}, BASE_HEADERS);
  assert.equal(empty.statusCode, 400);
  assert.equal(readResponseJson(empty).error, 'empty-patch');

  const unknown = await requestJsonRoute(route, 'POST', '/dsh-task-complete/settings', { fontFamily: 'x' }, BASE_HEADERS);
  assert.equal(unknown.statusCode, 400);

  const ok = await requestJsonRoute(route, 'POST', '/dsh-task-complete/settings', body, BASE_HEADERS);
  assert.equal(ok.statusCode, 200);
  assert.deepEqual(saved[0], body);

  const method = await requestJsonRoute(route, 'GET', '/dsh-task-complete/settings', undefined);
  assert.equal(method.statusCode, 405);
});

test('settings 限速：第 31 次请求 429', async () => {
  const route = {
    handler: createSettingsHandler({
      save: async (patch) => patch,
      security: { csrfToken: TOKEN },
    }),
  };
  const body = { fontSize: 16 };
  for (let index = 0; index < 30; index++) {
    const res = await requestJsonRoute(route, 'POST', '/dsh-task-complete/settings', body, BASE_HEADERS);
    assert.equal(res.statusCode, 200);
  }
  const limited = await requestJsonRoute(route, 'POST', '/dsh-task-complete/settings', body, BASE_HEADERS);
  assert.equal(limited.statusCode, 429);
  assert.equal(readResponseJson(limited).error, 'rate-limited');
});

test('纯函数：loopback/同源/Content-Type/token 比较', () => {
  assert.equal(isLoopbackHost('127.0.0.1:36137'), true);
  assert.equal(isLoopbackHost('localhost:36137'), true);
  assert.equal(isLoopbackHost('[::1]:36137'), true);
  assert.equal(isLoopbackHost('attacker.invalid'), false);
  assert.equal(isLoopbackHost('127.0.0.1:36137@attacker.invalid'), false);
  assert.equal(isLoopbackHost('http://127.0.0.1:36137/?x=1'), false);

  assert.equal(isSameOriginRequest({ headers: { host: HOST, origin: ORIGIN } }), true);
  assert.equal(isSameOriginRequest({ headers: { host: HOST, origin: 'http://127.0.0.1:9999' } }), false);
  assert.equal(isSameOriginRequest({ headers: { host: HOST } }), false);

  assert.equal(hasJsonContentType({ headers: { 'content-type': 'application/json; charset=utf-8' } }), true);
  assert.equal(hasJsonContentType({ headers: { 'content-type': 'text/plain' } }), false);

  assert.equal(tokenMatches(TOKEN, TOKEN), true);
  assert.equal(tokenMatches(`${TOKEN}x`, TOKEN), false);
  assert.equal(tokenMatches(undefined, TOKEN), false);
});

test('JSON 响应安全头', () => {
  const res = createFakeResponse();
  // 直接验证 handler 输出的 header，避免只断言状态码。
  const health = createHealthHandler({
    plugin: '@local/task-complete-toast',
    version: '1.3.1',
    instance: 'i',
    routePath: '/x',
  });
  health({ method: 'GET', headers: { host: HOST } }, res);
  assert.equal(res.headers['content-type'], 'application/json; charset=utf-8');
  assert.equal(res.headers['cache-control'], 'no-store');
  assert.equal(res.headers['x-content-type-options'], 'nosniff');
});
