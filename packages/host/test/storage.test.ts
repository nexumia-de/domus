// The storage registry: a stored `{ type, address, access }` gives its adapter.
import { expect, test } from 'vitest';
import { UnknownStorage, adapterFor } from '../src/storage';

const answer =
  (status: number, body: unknown = {}) =>
  () =>
    Promise.resolve(new Response(JSON.stringify(body), { status }));
function spy(status: number) {
  const calls: { url: string; headers: Record<string, string> }[] = [];
  const fake = (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), headers: { ...(init?.headers as Record<string, string>) } });
    return answer(status)();
  };
  return { fetch: fake as typeof fetch, calls };
}

test('github: the address is owner/name and the token goes in the header', async () => {
  const s = spy(404);
  const adapter = adapterFor(
    { type: 'github', address: 'me/store', access: { token: 't0k' } },
    { fetch: s.fetch, online: () => true },
  );
  expect(await adapter.read('a.json')).toEqual({ ok: true, missing: true });
  expect(s.calls[0]?.url).toBe('https://api.github.com/repos/me/store/contents/a.json');
  expect(s.calls[0]?.headers.Authorization).toBe('Bearer t0k');
});
test('github: the api base comes from the caller, never from the stored storage', async () => {
  const s = spy(404);
  const adapter = adapterFor(
    // Extra fields on a stored storage are not read.
    {
      type: 'github',
      address: 'me/store',
      access: { token: 't0k', apiBase: 'https://evil.example' },
    },
    { fetch: s.fetch, online: () => true, apiBase: 'http://127.0.0.1:9999' },
  );
  await adapter.read('a.json');
  expect(s.calls[0]?.url).toBe('http://127.0.0.1:9999/repos/me/store/contents/a.json');
});
test('github without a token or with a bad address throws', () => {
  expect(() => adapterFor({ type: 'github', address: 'me/store' })).toThrow(RangeError);
  expect(() => adapterFor({ type: 'github', address: 'nope', access: { token: 't' } })).toThrow(
    RangeError,
  );
});
test('webdav: the address is the base URL, credentials are optional', async () => {
  const s = spy(404);
  const withLogin = adapterFor(
    { type: 'webdav', address: 'https://dav.example/x', access: { username: 'u', password: 'p' } },
    { fetch: s.fetch },
  );
  await withLogin.read('a.json');
  expect(s.calls[0]?.url).toBe('https://dav.example/x/a.json');
  expect(s.calls[0]?.headers.Authorization).toBe(`Basic ${btoa('u:p')}`);
  const without = adapterFor(
    { type: 'webdav', address: 'https://dav.example/x' },
    { fetch: s.fetch },
  );
  await without.read('a.json');
  expect(s.calls[1]?.headers.Authorization).toBeUndefined();
});
test('an unknown type is a typed error', () => {
  expect(() => adapterFor({ type: 's3', address: 'x' })).toThrow(UnknownStorage);
  try {
    adapterFor({ type: 's3', address: 'x' });
  } catch (e) {
    expect(e).toBeInstanceOf(UnknownStorage);
    expect((e as Error).message).toContain('s3');
  }
});
