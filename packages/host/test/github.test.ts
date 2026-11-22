// The GitHub adapter against a fake `fetch`: every mapping of an answer to a
// result, the requests it sends, the memory of ETags, and a full sync cycle
// against a small in-memory fake of the Contents API.
import { describe, expect, test } from 'vitest';
import { bytesToBase64 } from '../src/base64';
import { collectionPath, localChange, syncCollection } from '../src/cycle';
import { createGithubAdapter } from '../src/github';
import { createMemoryStore } from '../src/memory-store';
import { deriveSpace, newSecret } from '../src/space';

const TOKEN = 'github_pat_SECRET123';
interface Call {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  credentials?: string;
  cache?: string;
}
type Answer = Response | Error | ((call: Call) => Response | Error);

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
const json = (status: number, body: unknown, headers: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(body), { status, headers });
const b64 = (text: string): string => bytesToBase64(new TextEncoder().encode(text));
const file = (text: string, sha = 'sha1', extra: object = {}) => ({
  type: 'file',
  encoding: 'base64',
  sha,
  size: text.length,
  content: b64(text),
  ...extra,
});
const make = (fake: ReturnType<typeof script>, extra: object = {}) =>
  createGithubAdapter({
    repository: 'me/store',
    token: TOKEN,
    fetch: fake.fetch,
    online: () => true,
    ...extra,
  });
const URL_ = 'https://api.github.com/repos/me/store/contents';

describe('options', () => {
  test.each(['', 'a', 'a/b/c', '/b', 'a/', '../b', 'a/..', 'a b/c', 'a/b?x'])(
    'bad repository %j throws before any request',
    (repository) => {
      const fake = script();
      expect(() => make(fake, { repository })).toThrow(RangeError);
      expect(fake.calls).toEqual([]);
    },
  );
  test('a bad folder throws; a bad path throws before a request', async () => {
    const fake = script();
    expect(() => make(fake, { folder: 'a/../b' })).toThrow(RangeError);
    const adapter = make(fake);
    await expect(adapter.read('a/../b')).rejects.toThrow(RangeError);
    await expect(adapter.read('')).rejects.toThrow(RangeError);
    await expect(adapter.write('a/./b', 'x', null)).rejects.toThrow(RangeError);
    expect(fake.calls).toEqual([]);
  });
  test('the thrown message does not hold the token', () => {
    try {
      make(script(), { repository: TOKEN });
    } catch (e) {
      expect(String(e)).not.toContain(TOKEN);
    }
  });
});

describe('read', () => {
  test('a file: decoded body, blob sha as etag, headers and URL', async () => {
    const fake = script(json(200, file('{"a":1}', 'abc')));
    expect(await make(fake).read('sp/list.json')).toEqual({
      ok: true,
      missing: false,
      body: '{"a":1}',
      etag: 'abc',
    });
    expect(fake.calls).toEqual([
      {
        method: 'GET',
        url: `${URL_}/sp/list.json`,
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${TOKEN}`,
          'X-GitHub-Api-Version': '2022-11-28',
        },
        credentials: 'omit',
        cache: 'no-store',
      },
    ]);
  });
  test('base64 with newlines and non-ASCII text', async () => {
    const text = 'Käse, 日本語, 🧀';
    const wrapped = b64(text).replace(/(.{8})/g, '$1\n') + '\n';
    const fake = script(json(200, { ...file(text), content: wrapped }));
    expect(await make(fake).read('a.json')).toMatchObject({ body: text });
  });
  test('folder, branch and encoding of segments', async () => {
    const fake = script(json(200, file('x')));
    await make(fake, { folder: 'data/ü', branch: 'feat/x y' }).read('a b/c.json');
    expect(fake.calls[0]?.url).toBe(`${URL_}/data/%C3%BC/a%20b/c.json?ref=feat%2Fx%20y`);
  });
  test('a missing file', async () => {
    expect(await make(script(json(404, {}))).read('a')).toEqual({ ok: true, missing: true });
  });
  test('a folder (array) or another type is not-a-file', async () => {
    expect(await make(script(json(200, [{}]))).read('a')).toEqual({
      ok: false,
      failure: 'server',
      detail: 'not-a-file',
    });
    expect(await make(script(json(200, { type: 'dir', sha: 's' }))).read('a')).toMatchObject({
      detail: 'not-a-file',
    });
  });
  test('a file over 1 MB comes without content: too-large', async () => {
    const big = { type: 'file', encoding: 'none', sha: 's', size: 2_000_000, content: '' };
    expect(await make(script(json(200, big))).read('a')).toEqual({
      ok: false,
      failure: 'server',
      detail: 'too-large',
    });
    expect(await make(script(json(200, { ...big, encoding: 'base64' }))).read('a')).toMatchObject({
      detail: 'too-large',
    });
  });
  test('bytes that are not UTF-8 are refused', async () => {
    const bad = bytesToBase64(new Uint8Array([0xff, 0xfe]));
    const answer = json(200, { ...file('x'), content: bad });
    expect(await make(script(answer)).read('a')).toMatchObject({ detail: 'not-utf8' });
  });
  test('401 unauthorised; plain 403 unauthorised', async () => {
    expect(await make(script(json(401, {}))).read('a')).toEqual({
      ok: false,
      failure: 'unauthorised',
    });
    expect(await make(script(json(403, {}))).read('a')).toEqual({
      ok: false,
      failure: 'unauthorised',
    });
  });
  test('403 and 429 with the limit used up are rate-limited, with the reset time', async () => {
    const reset = '1790000000';
    const iso = new Date(1_790_000_000_000).toISOString();
    const limited = (status: number) =>
      json(status, {}, { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': reset });
    expect(await make(script(limited(403))).read('a')).toEqual({
      ok: false,
      failure: 'server',
      detail: `rate-limited until ${iso}`,
    });
    expect(await make(script(limited(429))).read('a')).toMatchObject({
      detail: `rate-limited until ${iso}`,
    });
    expect(await make(script(json(403, {}, { 'retry-after': '60' }))).read('a')).toEqual({
      ok: false,
      failure: 'server',
      detail: 'rate-limited',
    });
    expect(await make(script(json(429, {}))).read('a')).toMatchObject({ detail: 'rate-limited' });
  });
  test('403 with requests left is unauthorised', async () => {
    const answer = json(403, {}, { 'x-ratelimit-remaining': '4999' });
    expect(await make(script(answer)).read('a')).toMatchObject({ failure: 'unauthorised' });
  });
  test('500 and other 4xx', async () => {
    expect(await make(script(json(500, {}))).read('a')).toEqual({
      ok: false,
      failure: 'server',
      detail: 'HTTP 500',
    });
    expect(await make(script(json(418, {}))).read('a')).toMatchObject({ detail: 'HTTP 418' });
  });
  test('TypeError: blocked online, unreachable offline; others are thrown', async () => {
    expect(await make(script(new TypeError('x'))).read('a')).toEqual({
      ok: false,
      failure: 'blocked',
    });
    expect(await make(script(new TypeError('x')), { online: () => false }).read('a')).toEqual({
      ok: false,
      failure: 'unreachable',
    });
    await expect(make(script(new Error('boom'))).read('a')).rejects.toThrow('boom');
  });
  test('the token is in no returned detail', async () => {
    for (const status of [401, 403, 404, 429, 500]) {
      const out = JSON.stringify(await make(script(json(status, { message: TOKEN }))).read('a'));
      expect(out).not.toContain(TOKEN);
    }
  });
});

describe('the memory of ETags', () => {
  test('the second read sends If-None-Match; a 304 gives the remembered result', async () => {
    const fake = script(
      json(200, file('body', 'sh'), { ETag: '"w1"' }),
      new Response(null, { status: 304 }),
    );
    const adapter = make(fake);
    const first = await adapter.read('a.json');
    const second = await adapter.read('a.json');
    expect(second).toEqual(first);
    expect(second).toEqual({ ok: true, missing: false, body: 'body', etag: 'sh' });
    expect(fake.calls[0]?.headers['If-None-Match']).toBeUndefined();
    expect(fake.calls[1]?.headers['If-None-Match']).toBe('"w1"');
  });
  test('a 200 replaces the memory; a write drops it', async () => {
    const fake = script(
      json(200, file('one', 's1'), { ETag: '"w1"' }),
      json(200, file('two', 's2'), { ETag: '"w2"' }),
      json(200, { content: { sha: 's3' } }),
      json(200, file('three', 's3'), { ETag: '"w3"' }),
    );
    const adapter = make(fake);
    await adapter.read('a.json');
    expect(await adapter.read('a.json')).toMatchObject({ body: 'two' });
    await adapter.write('a.json', 'three', 's2');
    expect(await adapter.read('a.json')).toMatchObject({ body: 'three' });
    expect(fake.calls[1]?.headers['If-None-Match']).toBe('"w1"');
    expect(fake.calls[3]?.headers['If-None-Match']).toBeUndefined();
  });
  test('without an ETag nothing is remembered; a missing file forgets', async () => {
    const fake = script(json(200, file('x')), json(404, {}), json(200, file('x')));
    const adapter = make(fake);
    await adapter.read('a');
    await adapter.read('a');
    await adapter.read('a');
    expect(fake.calls.map((c) => c.headers['If-None-Match'])).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
  });
  test('memory is per path', async () => {
    const fake = script(json(200, file('x'), { ETag: '"1"' }), json(200, file('y')));
    const adapter = make(fake);
    await adapter.read('a');
    await adapter.read('b');
    expect(fake.calls[1]?.headers['If-None-Match']).toBeUndefined();
  });
});

describe('write', () => {
  const created = () => json(201, { content: { sha: 'new' }, commit: { sha: 'c' } });
  test('with a sha: PUT with message, base64 content, sha and branch', async () => {
    const fake = script(created());
    const result = await make(fake, { branch: 'main', folder: 'f' }).write(
      'sp/list.json',
      'Käse',
      'old',
    );
    expect(result).toEqual({ ok: true, etag: 'new' });
    const call = fake.calls[0];
    expect(call?.method).toBe('PUT');
    expect(call?.url).toBe(`${URL_}/f/sp/list.json`);
    expect(call?.headers).toMatchObject({
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    });
    expect(call?.credentials).toBe('omit');
    expect(call?.cache).toBe('no-store');
    expect(JSON.parse(call?.body ?? '')).toEqual({
      message: 'sync list.json',
      content: b64('Käse'),
      sha: 'old',
      branch: 'main',
    });
  });
  test('null: no sha and no read; custom message', async () => {
    const fake = script(created());
    await make(fake, { message: 'sync' }).write('a.json', 'x', null);
    expect(fake.calls).toHaveLength(1);
    expect(JSON.parse(fake.calls[0]?.body ?? '')).toEqual({ message: 'sync', content: b64('x') });
  });
  test('message may be a function of the path', async () => {
    const fake = script(created());
    await make(fake, { message: (p: string) => `m:${p}` }).write('a/b.json', 'x', null);
    expect(JSON.parse(fake.calls[0]?.body ?? '').message).toBe('m:a/b.json');
  });
  test('unconditional with an existing file: one GET, then the sha', async () => {
    const fake = script(
      json(200, file('old', 'cur'), { ETag: '"e"' }),
      json(200, { content: { sha: 'n' } }),
    );
    const adapter = make(fake);
    expect(await adapter.write('a.json', 'x', undefined)).toEqual({ ok: true, etag: 'n' });
    expect(fake.calls.map((c) => c.method)).toEqual(['GET', 'PUT']);
    expect(fake.calls[0]?.headers['If-None-Match']).toBeUndefined();
    expect(JSON.parse(fake.calls[1]?.body ?? '').sha).toBe('cur');
  });
  test('unconditional with a missing file: no sha', async () => {
    const fake = script(json(404, {}), created());
    await make(fake).write('a.json', 'x', undefined);
    expect(JSON.parse(fake.calls[1]?.body ?? '')).not.toHaveProperty('sha');
  });
  test('unconditional: a failing GET is the result and nothing is written', async () => {
    const fake = script(json(401, {}));
    expect(await make(fake).write('a', 'x', undefined)).toEqual({
      ok: false,
      failure: 'unauthorised',
    });
    expect(fake.calls).toHaveLength(1);
  });
  test('unconditional over a too-large file still uses its sha', async () => {
    const big = { type: 'file', encoding: 'none', sha: 'big', size: 2_000_000, content: '' };
    const fake = script(json(200, big), created());
    await make(fake).write('a', 'x', undefined);
    expect(JSON.parse(fake.calls[1]?.body ?? '').sha).toBe('big');
  });
  test('200 and 201 are success; an answer without a sha gives no etag', async () => {
    expect(await make(script(json(200, { content: { sha: 's' } }))).write('a', 'x', 'o')).toEqual({
      ok: true,
      etag: 's',
    });
    expect(await make(script(json(201, {}))).write('a', 'x', 'o')).toEqual({ ok: true });
  });
  test('409 conflict', async () => {
    expect(await make(script(json(409, {}))).write('a', 'x', 'o')).toEqual({
      ok: false,
      failure: 'conflict',
    });
  });
  test('422: conflict with a condition, server without', async () => {
    expect(await make(script(json(422, {}))).write('a', 'x', 'o')).toMatchObject({
      failure: 'conflict',
    });
    expect(await make(script(json(422, {}))).write('a', 'x', null)).toMatchObject({
      failure: 'conflict',
    });
    expect(await make(script(json(404, {}), json(422, {}))).write('a', 'x', undefined)).toEqual({
      ok: false,
      failure: 'server',
      detail: 'HTTP 422',
    });
  });
  test('404 not-found; 401, 403, rate limit, 500, TypeError as for read', async () => {
    expect(await make(script(json(404, {}))).write('a', 'x', 'o')).toEqual({
      ok: false,
      failure: 'not-found',
    });
    expect(await make(script(json(401, {}))).write('a', 'x', 'o')).toMatchObject({
      failure: 'unauthorised',
    });
    expect(await make(script(json(403, {}))).write('a', 'x', 'o')).toMatchObject({
      failure: 'unauthorised',
    });
    expect(
      await make(script(json(403, {}, { 'x-ratelimit-remaining': '0' }))).write('a', 'x', 'o'),
    ).toMatchObject({ failure: 'server', detail: 'rate-limited' });
    expect(await make(script(json(429, {}))).write('a', 'x', 'o')).toMatchObject({
      detail: 'rate-limited',
    });
    expect(await make(script(json(500, {}))).write('a', 'x', 'o')).toMatchObject({
      detail: 'HTTP 500',
    });
    expect(await make(script(new TypeError('x'))).write('a', 'x', 'o')).toEqual({
      ok: false,
      failure: 'blocked',
    });
    expect(
      await make(script(new TypeError('x')), { online: () => false }).write('a', 'x', 'o'),
    ).toEqual({ ok: false, failure: 'unreachable' });
  });
  test('the token is in no returned detail', async () => {
    for (const status of [401, 403, 404, 409, 422, 429, 500]) {
      const out = JSON.stringify(
        await make(script(json(status, { message: TOKEN }))).write('a', 'x', 'o'),
      );
      expect(out).not.toContain(TOKEN);
    }
  });
});

/** A small fake of the Contents API that enforces the sha condition. */
function fakeGithub() {
  const files = new Map<string, { text: string; sha: string }>();
  let n = 0;
  const commits: string[] = [];
  const handler = (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const path = decodeURIComponent(new URL(String(url)).pathname.replace(/^.*\/contents\//, ''));
    if ((init?.method ?? 'GET') === 'GET') {
      const f = files.get(path);
      return Promise.resolve(
        f
          ? json(200, {
              type: 'file',
              encoding: 'base64',
              sha: f.sha,
              size: f.text.length,
              content: b64(f.text),
            })
          : json(404, {}),
      );
    }
    const body = JSON.parse(String(init?.body)) as {
      message: string;
      content: string;
      sha?: string;
    };
    const f = files.get(path);
    if (f && body.sha !== f.sha) return Promise.resolve(json(422, {}));
    if (!f && body.sha !== undefined) return Promise.resolve(json(422, {}));
    const text = new TextDecoder().decode(
      Uint8Array.from(atob(body.content), (c) => c.charCodeAt(0)),
    );
    const sha = `blob${++n}`;
    files.set(path, { text, sha });
    commits.push(body.message);
    return Promise.resolve(json(f ? 200 : 201, { content: { sha } }));
  };
  return { fetch: handler as typeof fetch, files, commits };
}

describe('a sync cycle against a fake Contents API', () => {
  test('two devices converge; the file is ciphertext; messages carry no data', async () => {
    const space = await deriveSpace(newSecret());
    const github = fakeGithub();
    const device = (start: string) => {
      const store = createMemoryStore();
      let t = Date.parse(start);
      const now = (): string => new Date((t += 1000)).toISOString();
      const adapter = createGithubAdapter({
        repository: 'me/store',
        token: TOKEN,
        fetch: github.fetch,
        online: () => true,
      });
      return {
        store,
        sync: () => syncCollection({ space, collection: 'list', adapter, store, now }),
        put: (key: string, value: unknown) =>
          localChange(store, space.id, 'list', now, () => ({ put: [{ key, value }] })),
        live: async () =>
          Object.fromEntries(
            (await store.readCollection(space.id, 'list')).records
              .filter((r) => !r.deleted)
              .map((r) => [r.key, r.value]),
          ),
      };
    };
    const a = device('2026-01-01T00:00:00Z');
    const b = device('2026-01-01T00:01:00Z');
    await a.put('milk', 'Vollmilch');
    await b.put('eggs', 2);
    expect(await a.sync()).toMatchObject({ ok: true, wrote: true });
    expect(await b.sync()).toMatchObject({ ok: true, wrote: true, changed: true });
    expect(await a.sync()).toMatchObject({ ok: true, changed: true });
    expect(await a.live()).toEqual({ milk: 'Vollmilch', eggs: 2 });
    expect(await b.live()).toEqual({ milk: 'Vollmilch', eggs: 2 });
    const stored = github.files.get(collectionPath(space.id, 'list'));
    expect(stored?.text).not.toContain('Vollmilch');
    expect(github.commits.every((m) => m === 'sync list.json')).toBe(true);
  });
});
