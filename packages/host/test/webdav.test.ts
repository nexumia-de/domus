// The WebDAV adapter against a fake `fetch`: every mapping of an answer to a
// result, the requests it sends and the failure of a request that gets no answer.
import { expect, test } from 'vitest';
import { createWebdavAdapter } from '../src/webdav';
import { PROBE_PATH, testConnection } from '../src/webdav-connection';

interface Call {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  credentials?: string;
  cache?: string;
}
type Answer = Response | Error | ((call: Call) => Response | Error);

/** A fetch that records every call and answers from a script, in order. */
function script(...answers: Answer[]): { fetch: typeof fetch; calls: Call[] } {
  const calls: Call[] = [];
  const queue = [...answers];
  const fake = (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const call: Call = {
      method: init?.method ?? 'GET',
      url: String(url),
      headers: { ...(init?.headers as Record<string, string>) },
    };
    if (typeof init?.body === 'string') call.body = init.body;
    if (init?.credentials) call.credentials = init.credentials;
    if (init?.cache) call.cache = init.cache;
    calls.push(call);
    const next = queue.shift();
    if (next === undefined) throw new Error(`unexpected call ${call.method} ${call.url}`);
    const answer = typeof next === 'function' ? next(call) : next;
    return answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer);
  };
  return { fetch: fake as typeof fetch, calls };
}
const reply = (status: number, body = '', headers: Record<string, string> = {}): Response =>
  new Response(status === 204 || status === 205 ? null : body, { status, headers });
const make = (fake: ReturnType<typeof script>, extra: object = {}) =>
  createWebdavAdapter({
    baseUrl: 'https://dav.example/files/me/mixtura',
    fetch: fake.fetch,
    online: () => true,
    ...extra,
  });

test('read: 200 with an ETag gives body and etag; the request is a plain GET without cookies', async () => {
  const fake = script(reply(200, '{"a":1}', { ETag: '"e1"' }));
  expect(await make(fake).read('places/p1/stock.json')).toEqual({
    ok: true,
    missing: false,
    body: '{"a":1}',
    etag: '"e1"',
  });
  expect(fake.calls).toEqual([
    {
      method: 'GET',
      url: 'https://dav.example/files/me/mixtura/places/p1/stock.json',
      headers: {},
      credentials: 'omit',
      cache: 'no-store',
    },
  ]);
});

test('read: a weak ETag is passed on as it is', async () => {
  const fake = script(reply(200, 'x', { ETag: 'W/"1-abc"' }));
  expect(await make(fake).read('a.json')).toMatchObject({ etag: 'W/"1-abc"' });
});

test('read: 404 is a missing file, not a failure', async () => {
  expect(await make(script(reply(404))).read('a.json')).toEqual({ ok: true, missing: true });
});

test('read: 200 without a readable ETag is blocked with etag-not-exposed', async () => {
  expect(await make(script(reply(200, 'body'))).read('a.json')).toEqual({
    ok: false,
    failure: 'blocked',
    detail: 'etag-not-exposed',
  });
});

test.each([
  [401, 'unauthorised', undefined],
  [403, 'unauthorised', undefined],
  [500, 'server', 'HTTP 500'],
  [503, 'server', 'HTTP 503'],
  [400, 'server', 'HTTP 400'],
  [423, 'server', 'HTTP 423'],
])('read: status %i is %s', async (status, failure, detail) => {
  const result = await make(script(reply(status))).read('a.json');
  expect(result).toEqual(
    detail === undefined ? { ok: false, failure } : { ok: false, failure, detail },
  );
});

test('credentials become a Basic header, UTF-8 encoded, on every request', async () => {
  const fake = script(reply(200, '', { ETag: '"e"' }), reply(201));
  const adapter = make(fake, { username: 'jörg', password: 'päss:word' });
  await adapter.read('a.json');
  await adapter.write('a.json', '{}');
  const expected = `Basic ${Buffer.from('jörg:päss:word', 'utf8').toString('base64')}`;
  expect(fake.calls.map((c) => c.headers['Authorization'])).toEqual([expected, expected]);
});

test('without credentials no Authorization header is sent', async () => {
  const fake = script(reply(404));
  await make(fake).read('a.json');
  expect(fake.calls[0]?.headers).not.toHaveProperty('Authorization');
});

test('write without a condition: PUT with JSON content type and neither precondition header', async () => {
  const fake = script(reply(204, '', { ETag: '"e2"' }));
  expect(await make(fake).write('a.json', '{"b":2}')).toEqual({ ok: true, etag: '"e2"' });
  expect(fake.calls).toEqual([
    {
      method: 'PUT',
      url: 'https://dav.example/files/me/mixtura/a.json',
      headers: { 'Content-Type': 'application/json' },
      body: '{"b":2}',
      credentials: 'omit',
      cache: 'no-store',
    },
  ]);
});

test('write: a server that sends no ETag on PUT is still a success, without etag', async () => {
  expect(await make(script(reply(201))).write('a.json', '{}')).toEqual({ ok: true });
});

test('write with an etag sends If-Match; with null sends If-None-Match: *', async () => {
  const fake = script(reply(204), reply(201));
  const adapter = make(fake);
  await adapter.write('a.json', '{}', '"e1"');
  await adapter.write('a.json', '{}', null);
  expect(fake.calls[0]?.headers).toEqual({
    'Content-Type': 'application/json',
    'If-Match': '"e1"',
  });
  expect(fake.calls[1]?.headers).toEqual({
    'Content-Type': 'application/json',
    'If-None-Match': '*',
  });
});

test('write: 412 is a conflict; 401 and 403 are unauthorised; other statuses are server', async () => {
  const fake = script(reply(412), reply(401), reply(403), reply(500), reply(507));
  const adapter = make(fake);
  expect(await adapter.write('a.json', '{}', '"x"')).toEqual({ ok: false, failure: 'conflict' });
  expect(await adapter.write('a.json', '{}')).toEqual({ ok: false, failure: 'unauthorised' });
  expect(await adapter.write('a.json', '{}')).toEqual({ ok: false, failure: 'unauthorised' });
  expect(await adapter.write('a.json', '{}')).toEqual({
    ok: false,
    failure: 'server',
    detail: 'HTTP 500',
  });
  expect(await adapter.write('a.json', '{}')).toMatchObject({
    failure: 'server',
    detail: 'HTTP 507',
  });
});

test.each([409, 404])('write: %i makes the folders once, then retries the PUT', async (status) => {
  const fake = script(reply(status), reply(201), reply(201), reply(201, '', { ETag: '"n"' }));
  const result = await make(fake).write('places/p1/stock.json', '{}', null);
  expect(result).toEqual({ ok: true, etag: '"n"' });
  expect(
    fake.calls.map(
      (c) => `${c.method} ${c.url.replace('https://dav.example/files/me/mixtura', '')}`,
    ),
  ).toEqual([
    'PUT /places/p1/stock.json',
    'MKCOL /places/',
    'MKCOL /places/p1/',
    'PUT /places/p1/stock.json',
  ]);
  expect(fake.calls[3]?.headers['If-None-Match']).toBe('*');
});

test('write: a folder that exists (MKCOL 405) is fine', async () => {
  const fake = script(reply(409), reply(405), reply(201), reply(204));
  expect(await make(fake).write('a/b/f.json', '{}')).toEqual({ ok: true });
});

test('write: when the retry still finds no folder the result is not-found, and the PUT is not tried a third time', async () => {
  const fake = script(reply(409), reply(201), reply(409));
  expect(await make(fake).write('a/f.json', '{}')).toEqual({
    ok: false,
    failure: 'not-found',
    detail: 'HTTP 409',
  });
  expect(fake.calls).toHaveLength(3);
});

test('write: a MKCOL that fails is not-found, or unauthorised for 401 and 403', async () => {
  expect(await make(script(reply(409), reply(409))).write('a/f.json', '{}')).toEqual({
    ok: false,
    failure: 'not-found',
    detail: 'MKCOL HTTP 409',
  });
  expect(await make(script(reply(404), reply(403))).write('a/f.json', '{}')).toEqual({
    ok: false,
    failure: 'unauthorised',
  });
});

test('write: 404 or 409 for a file in the base folder is not-found without a MKCOL', async () => {
  const fake = script(reply(409));
  expect(await make(fake).write('f.json', '{}')).toEqual({
    ok: false,
    failure: 'not-found',
    detail: 'HTTP 409',
  });
  expect(fake.calls).toHaveLength(1);
});

test('write: a conditional write after the folder was made can still conflict', async () => {
  expect(
    await make(script(reply(409), reply(201), reply(412))).write('a/f.json', '{}', '"x"'),
  ).toEqual({
    ok: false,
    failure: 'conflict',
  });
});

test.each([
  [true, 'blocked'],
  [false, 'unreachable'],
])('a TypeError from fetch with navigator.onLine %s is %s', async (online, failure) => {
  const adapter = make(
    script(new TypeError('Failed to fetch'), new TypeError('x'), new TypeError('x')),
    {
      online: () => online,
    },
  );
  expect(await adapter.read('a.json')).toEqual({ ok: false, failure });
  expect(await adapter.write('a.json', '{}')).toEqual({ ok: false, failure });
  expect(await adapter.write('x/a.json', '{}', null)).toEqual({ ok: false, failure });
});

test('a TypeError while making folders is reported the same way', async () => {
  const adapter = make(script(reply(409), new TypeError('Failed to fetch')), {
    online: () => false,
  });
  expect(await adapter.write('a/f.json', '{}')).toEqual({ ok: false, failure: 'unreachable' });
});

test('an error that is not a TypeError is not swallowed', async () => {
  const adapter = make(script(new Error('boom')));
  await expect(adapter.read('a.json')).rejects.toThrow('boom');
});

test('without an injected clock it follows navigator.onLine', async () => {
  const adapter = createWebdavAdapter({
    baseUrl: 'https://h',
    fetch: script(new TypeError('x')).fetch,
  });
  expect(await adapter.read('a.json')).toMatchObject({ ok: false, failure: 'blocked' });
});

test('a path with .. never reaches fetch', async () => {
  const fake = script();
  await expect(make(fake).read('../secret')).rejects.toThrow(RangeError);
  await expect(make(fake).write('a/../b', '{}')).rejects.toThrow(RangeError);
  expect(fake.calls).toEqual([]);
});

test('testConnection: reachable for a file and for a missing file', async () => {
  const found = script(reply(200, 'x', { ETag: '"1"' }));
  expect(await testConnection(make(found))).toEqual({ state: 'reachable' });
  expect(found.calls[0]?.url).toBe(`https://dav.example/files/me/mixtura/${PROBE_PATH}`);
  expect(await testConnection(make(script(reply(404))))).toEqual({ state: 'reachable' });
});

test('testConnection: unauthorised, blocked, unreachable and server', async () => {
  expect(await testConnection(make(script(reply(401))))).toEqual({ state: 'unauthorised' });
  expect(await testConnection(make(script(new TypeError('x'))))).toEqual({ state: 'blocked' });
  expect(await testConnection(make(script(new TypeError('x')), { online: () => false }))).toEqual({
    state: 'unreachable',
  });
  expect(await testConnection(make(script(reply(200, 'x'))))).toEqual({
    state: 'blocked',
    detail: 'etag-not-exposed',
  });
  expect(await testConnection(make(script(reply(502))))).toEqual({
    state: 'server',
    detail: 'HTTP 502',
  });
});

test('write: If-Match is sent in the strong form for a weak ETag', async () => {
  const fake = script(reply(204));
  await make(fake).write('a.json', '{}', 'W/"e1"');
  expect(fake.calls[0]?.headers['If-Match']).toBe('"e1"');
});

test('write: a weak ETag that meets 412 waits 1,100 ms and repeats once; success then counts', async () => {
  const fake = script(reply(412), reply(204, '', { ETag: '"e2"' }));
  const waits: number[] = [];
  const adapter = make(fake, { delay: async (ms: number) => void waits.push(ms) });
  expect(await adapter.write('a.json', '{}', 'W/"e1"')).toEqual({ ok: true, etag: '"e2"' });
  expect(waits).toEqual([1100]);
  expect(fake.calls.map((c) => c.headers['If-Match'])).toEqual(['"e1"', '"e1"']);
});

test('write: a weak ETag that meets 412 twice is a conflict after one wait only', async () => {
  const fake = script(reply(412), reply(412));
  const waits: number[] = [];
  const adapter = make(fake, { delay: async (ms: number) => void waits.push(ms) });
  expect(await adapter.write('a.json', '{}', 'W/"e1"')).toEqual({ ok: false, failure: 'conflict' });
  expect(waits).toEqual([1100]);
});

test('write: a strong ETag that meets 412 is a conflict at once, without waiting', async () => {
  const fake = script(reply(412));
  const waits: number[] = [];
  const adapter = make(fake, { delay: async (ms: number) => void waits.push(ms) });
  expect(await adapter.write('a.json', '{}', '"e1"')).toEqual({ ok: false, failure: 'conflict' });
  expect(waits).toEqual([]);
});
