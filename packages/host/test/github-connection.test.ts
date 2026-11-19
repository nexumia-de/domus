// The GitHub connection test, the repository list and the setup links, with a fake `fetch`.
import { expect, test } from 'vitest';
import { findRepositories, setupLinks, testGithub } from '../src/github-connection';

const TOKEN = 'github_pat_SECRET123';
type Call = { url: string; headers: Record<string, string> };
function script(...answers: (Response | Error)[]) {
  const calls: Call[] = [];
  const queue = [...answers];
  const fake = (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    calls.push({ url: String(url), headers: { ...(init?.headers as Record<string, string>) } });
    const next = queue.shift();
    if (next === undefined) throw new Error('unexpected call');
    return next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
  };
  return { fetch: fake as typeof fetch, calls };
}
const json = (status: number, body: unknown, headers: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(body), { status, headers });
const test_ = (fake: ReturnType<typeof script>, extra: object = {}) =>
  testGithub({
    repository: 'me/store',
    token: TOKEN,
    fetch: fake.fetch,
    online: () => true,
    ...extra,
  });

test('reachable: private, writable, empty are read from the answer', async () => {
  const fake = script(json(200, { private: true, size: 0, permissions: { push: true } }));
  expect(await test_(fake)).toEqual({
    state: 'reachable',
    private: true,
    canWrite: true,
    empty: true,
  });
  expect(fake.calls[0]?.url).toBe('https://api.github.com/repos/me/store');
  expect(fake.calls[0]?.headers.Authorization).toBe(`Bearer ${TOKEN}`);
});
test('a public, read-only, non-empty repository', async () => {
  const fake = script(json(200, { private: false, size: 12, permissions: { push: false } }));
  expect(await test_(fake)).toEqual({
    state: 'reachable',
    private: false,
    canWrite: false,
    empty: false,
  });
});
test('answers map to states; no detail holds the token', async () => {
  const cases: [Response | Error, object][] = [
    [json(401, { message: TOKEN }), { state: 'unauthorised' }],
    [json(403, {}), { state: 'unauthorised' }],
    [json(404, {}), { state: 'not-found' }],
    [json(500, {}), { state: 'server', detail: 'HTTP 500' }],
    [json(429, {}), { state: 'server', detail: 'rate-limited' }],
    [
      json(200, 'not an object'),
      { state: 'reachable', private: false, canWrite: false, empty: false },
    ],
    [new Response('<html>', { status: 200 }), { state: 'server', detail: 'bad-answer' }],
    [new TypeError('x'), { state: 'blocked' }],
  ];
  for (const [answer, expected] of cases) {
    const result = await test_(script(answer));
    expect(result).toEqual(expected);
    expect(JSON.stringify(result)).not.toContain(TOKEN);
  }
  expect(await test_(script(new TypeError('x')), { online: () => false })).toEqual({
    state: 'unreachable',
  });
});
test('a bad repository throws before a request', async () => {
  const fake = script();
  await expect(test_(fake, { repository: 'nope' })).rejects.toThrow(RangeError);
  expect(fake.calls).toEqual([]);
});

const repo = (name: string, push = true) => ({
  full_name: name,
  private: true,
  permissions: { push },
});
test('findRepositories: one page, the request and the entries', async () => {
  const fake = script(json(200, [repo('me/a'), { ...repo('me/b', false), private: false }]));
  expect(await findRepositories(TOKEN, { fetch: fake.fetch })).toEqual({
    ok: true,
    repositories: [
      { fullName: 'me/a', private: true, canWrite: true },
      { fullName: 'me/b', private: false, canWrite: false },
    ],
    more: false,
  });
  expect(fake.calls[0]?.url).toBe(
    'https://api.github.com/user/repos?per_page=100&affiliation=owner,collaborator&sort=pushed',
  );
  expect(fake.calls[0]?.headers.Authorization).toBe(`Bearer ${TOKEN}`);
});
test('findRepositories follows one next page and then says more', async () => {
  const next = (n: number) => ({
    Link: `<https://api.github.com/user/repos?page=${n}>; rel="next"`,
  });
  const fake = script(json(200, [repo('me/a')], next(2)), json(200, [repo('me/b')], next(3)));
  const result = await findRepositories(TOKEN, { fetch: fake.fetch });
  expect(result).toMatchObject({ ok: true, more: true });
  expect(fake.calls.map((c) => c.url)[1]).toBe('https://api.github.com/user/repos?page=2');
  expect(fake.calls).toHaveLength(2);
});
test('findRepositories ends when there is no next page; never follows a link to another host', async () => {
  const fake = script(json(200, [repo('me/a')], { Link: '<https://evil.example/x>; rel="next"' }));
  expect(await findRepositories(TOKEN, { fetch: fake.fetch })).toMatchObject({ more: false });
  expect(fake.calls).toHaveLength(1);
});
test('findRepositories failures', async () => {
  expect(await findRepositories(TOKEN, { fetch: script(json(401, {})).fetch })).toEqual({
    ok: false,
    failure: 'unauthorised',
  });
  expect(await findRepositories(TOKEN, { fetch: script(json(500, {})).fetch })).toEqual({
    ok: false,
    failure: 'server',
    detail: 'HTTP 500',
  });
  expect(await findRepositories(TOKEN, { fetch: script(json(200, {})).fetch })).toMatchObject({
    detail: 'bad-answer',
  });
  expect(
    await findRepositories(TOKEN, { fetch: script(new TypeError('x')).fetch, online: () => false }),
  ).toEqual({ ok: false, failure: 'unreachable' });
  expect(await findRepositories(TOKEN, { fetch: script(new TypeError('x')).fetch })).toMatchObject({
    failure: 'blocked',
  });
});

test('setupLinks: the repository form is prefilled, the token form is the plain address', () => {
  expect(setupLinks({ name: 'my repo' })).toEqual({
    repositoryUrl: 'https://github.com/new?name=my%20repo&visibility=private',
    tokenUrl: 'https://github.com/settings/personal-access-tokens/new',
  });
  expect(setupLinks().repositoryUrl).toContain('name=domus-sync');
});
