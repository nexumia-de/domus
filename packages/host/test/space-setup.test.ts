// Making a space (shared by the Household app and the native apps): the name, the addresses, the
// verdict on a GitHub repository, and createSpace against the memory store and a small adapter.
// The Household app's own flows (apps/domus/test/flows.test.ts) run createSpace through its
// wrapper as well. What this does not prove: a real GitHub or WebDAV server.
import type { AdapterFailure, ReadResult, StorageAdapter, WriteResult } from '@nexumia-de/materia';
import { expect, test } from 'vitest';
import { createMemoryStore } from '../src/memory-store';
import {
  cleanSpaceName,
  createSpace,
  githubVerdict,
  isRepository,
  isWebdavAddress,
} from '../src/space-setup';

const now = (): string => '2026-11-22T10:00:00.000Z';
const github = { type: 'github', address: 'me/household', access: { token: 'TOKEN' } };

function adapter(fail?: { failure: AdapterFailure; detail?: string }): StorageAdapter & {
  files: Map<string, string>;
} {
  const files = new Map<string, string>();
  return {
    files,
    read(path): Promise<ReadResult> {
      if (fail) return Promise.resolve({ ok: false, ...fail });
      const body = files.get(path);
      return Promise.resolve(
        body === undefined
          ? { ok: true, missing: true }
          : { ok: true, missing: false, body, etag: '"1"' },
      );
    },
    write(path, body): Promise<WriteResult> {
      files.set(path, body);
      return Promise.resolve({ ok: true, etag: '"2"' });
    },
  };
}

test('a name is trimmed, inner spaces folded, and 1 to 60 characters long', () => {
  expect(cleanSpaceName('  Home   sweet  home ')).toBe('Home sweet home');
  expect(cleanSpaceName('   ')).toBeUndefined();
  expect(cleanSpaceName('x'.repeat(60))).toHaveLength(60);
  expect(cleanSpaceName('x'.repeat(61))).toBeUndefined();
});

test('a repository is owner/name without dot segments', () => {
  expect(isRepository('me/household')).toBe(true);
  expect(isRepository('me/../x')).toBe(false);
  expect(isRepository('me')).toBe(false);
  expect(isRepository('me/house hold')).toBe(false);
});

test('a WebDAV address is https with a host and no user name in it, read without URL', () => {
  expect(isWebdavAddress('https://cloud.example.org/remote.php/dav/files/me/domus/')).toBe(true);
  expect(isWebdavAddress(' https://dav.example.org:8443 ')).toBe(true);
  expect(isWebdavAddress('http://dav.example.org/')).toBe(false);
  expect(isWebdavAddress('https://me:pw@dav.example.org/')).toBe(false);
  expect(isWebdavAddress('https:///path')).toBe(false);
  expect(isWebdavAddress('dav.example.org')).toBe(false);
});

test('the verdict on a GitHub repository: private and writable, public, read-only, failed', () => {
  const reachable = { state: 'reachable', empty: true } as const;
  expect(githubVerdict({ ...reachable, private: true, canWrite: true })).toEqual({ kind: 'ok' });
  expect(githubVerdict({ ...reachable, private: false, canWrite: true })).toEqual({
    kind: 'public',
  });
  expect(githubVerdict({ ...reachable, private: true, canWrite: false })).toEqual({
    kind: 'readonly',
  });
  expect(githubVerdict({ state: 'unauthorised', detail: 'HTTP 401' })).toEqual({
    kind: 'failed',
    failure: 'unauthorised',
    detail: 'HTTP 401',
  });
});

test('createSpace stores the space, writes its name and runs one cycle that writes the file', async () => {
  const store = createMemoryStore();
  const remote = adapter();
  const result = await createSpace(
    { name: ' Home ', storage: github },
    {
      store,
      now,
      adapter: () => remote,
    },
  );
  if (!result.ok) throw new Error(result.failure);
  expect(result.name).toBe('Home');
  const [space] = await store.listSpaces();
  expect(space).toMatchObject({ id: result.id, name: 'Home', storage: github });
  const state = await store.readCollection(result.id, 'space');
  expect(state.records.find((r) => r.key === 'name')?.value).toBe('Home');
  expect(state.syncedAt).toBeDefined();
  expect([...remote.files.keys()]).toEqual([`${result.id}/space.json`]);
  expect(remote.files.get(`${result.id}/space.json`)).not.toContain('Home');
});

test('createSpace with a bad name stores nothing', async () => {
  const store = createMemoryStore();
  const result = await createSpace(
    { name: ' ', storage: github },
    {
      store,
      now,
      adapter: () => adapter(),
    },
  );
  expect(result).toEqual({ ok: false, failure: 'bad-name' });
  expect(await store.listSpaces()).toEqual([]);
});

test('createSpace takes the space off again when the cycle fails, and says why', async () => {
  const store = createMemoryStore();
  const result = await createSpace(
    { name: 'Home', storage: github },
    {
      store,
      now,
      adapter: () => adapter({ failure: 'unauthorised', detail: 'HTTP 401' }),
    },
  );
  expect(result).toEqual({ ok: false, failure: 'unauthorised', detail: 'HTTP 401' });
  expect(await store.listSpaces()).toEqual([]);
});

test('createSpace takes the space off again and throws on when the adapter cannot be made', async () => {
  const store = createMemoryStore();
  await expect(
    createSpace(
      { name: 'Home', storage: github },
      {
        store,
        now,
        adapter: () => {
          throw new RangeError('no token');
        },
      },
    ),
  ).rejects.toThrow(RangeError);
  expect(await store.listSpaces()).toEqual([]);
});
