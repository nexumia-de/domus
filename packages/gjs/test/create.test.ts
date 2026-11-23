// Creating a space from the native apps' form, against the shared database in memory, a small
// adapter and a fake look at GitHub. What this does not prove: a real GitHub or WebDAV server, and
// the GTK page around it (the interaction check drives that, against a fake GitHub on localhost).
import { expect, test } from 'vitest';
import type { ReadResult, StorageAdapter, WriteResult } from '@nexumia-de/materia';
import {
  createMemoryStore,
  type GithubConnectionResult,
  type StoredStorage,
} from '@nexumia-de/hospes';
import { createFromForm, storageOfForm, type CreateDeps, type CreateForm } from '../src/create';

const form = (extra: Partial<CreateForm> = {}): CreateForm => ({
  name: 'Household',
  kind: 'github',
  repository: 'me/household',
  token: ' github_pat_x ',
  address: '',
  user: '',
  password: '',
  ...extra,
});

function deps(
  look: GithubConnectionResult = { state: 'reachable', private: true, canWrite: true, empty: true },
): CreateDeps & { files: Map<string, string>; adapters: StoredStorage[]; looks: string[] } {
  const files = new Map<string, string>();
  const adapters: StoredStorage[] = [];
  const looks: string[] = [];
  const adapter: StorageAdapter = {
    read(path): Promise<ReadResult> {
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
  return {
    files,
    adapters,
    looks,
    store: createMemoryStore(),
    now: () => '2026-11-22T10:00:00.000Z',
    adapter: (storage) => {
      adapters.push(storage);
      return adapter;
    },
    testGithub: (repository, token) => {
      looks.push(`${repository} ${token}`);
      return Promise.resolve(look);
    },
  };
}

test('a GitHub space: the repository is looked at with the token, then created with one cycle', async () => {
  const d = deps();
  const done = await createFromForm(form(), d);
  if (!done.ok) throw new Error(JSON.stringify(done));
  expect(done.name).toBe('Household');
  expect(d.looks).toEqual(['me/household github_pat_x']);
  const [space] = await d.store.listSpaces();
  expect(space).toMatchObject({
    id: done.id,
    name: 'Household',
    storage: { type: 'github', address: 'me/household', access: { token: 'github_pat_x' } },
  });
  expect([...d.files.keys()]).toEqual([`${done.id}/space.json`]);
});

test('a WebDAV space keeps the sign-in only when one was given, and GitHub is not asked', async () => {
  const d = deps();
  const done = await createFromForm(
    form({
      kind: 'webdav',
      address: ' https://dav.example.org/domus/ ',
      user: 'me',
      password: 'pw',
    }),
    d,
  );
  expect(done.ok).toBe(true);
  expect(d.looks).toEqual([]);
  expect(d.adapters).toEqual([
    {
      type: 'webdav',
      address: 'https://dav.example.org/domus/',
      access: { username: 'me', password: 'pw' },
    },
  ]);
  expect(storageOfForm(form({ kind: 'webdav', address: 'https://dav.example.org/' }))).toEqual({
    ok: true,
    storage: { type: 'webdav', address: 'https://dav.example.org/' },
  });
});

test('each wrong field is named, and nothing is stored or asked', async () => {
  const d = deps();
  expect(await createFromForm(form({ name: '  ' }), d)).toEqual({ ok: false, error: 'name' });
  expect(await createFromForm(form({ repository: 'household' }), d)).toEqual({
    ok: false,
    error: 'repository',
  });
  expect(await createFromForm(form({ token: ' ' }), d)).toEqual({ ok: false, error: 'token' });
  expect(await createFromForm(form({ kind: 'webdav', address: 'http://x.org/' }), d)).toEqual({
    ok: false,
    error: 'address',
  });
  expect(d.looks).toEqual([]);
  expect(await d.store.listSpaces()).toEqual([]);
});

test('a public repository is used only once the person agreed; a read-only token never', async () => {
  const open = deps({ state: 'reachable', private: false, canWrite: true, empty: true });
  expect(await createFromForm(form(), open)).toEqual({ ok: false, error: 'public' });
  expect(await open.store.listSpaces()).toEqual([]);
  expect((await createFromForm(form(), open, { publicAllowed: true })).ok).toBe(true);

  const readonly = deps({ state: 'reachable', private: true, canWrite: false, empty: true });
  expect(await createFromForm(form(), readonly, { publicAllowed: true })).toEqual({
    ok: false,
    error: 'readonly',
  });
  expect(await readonly.store.listSpaces()).toEqual([]);
});

test('a refused look at GitHub is a failure with its code, and nothing is stored', async () => {
  const d = deps({ state: 'unauthorised', detail: 'HTTP 401' });
  expect(await createFromForm(form(), d)).toEqual({
    ok: false,
    error: 'failed',
    failure: 'unauthorised',
    detail: 'HTTP 401',
  });
  expect(await d.store.listSpaces()).toEqual([]);
});

test('a cycle that fails or an adapter that cannot be made leaves nothing on the device', async () => {
  const d = deps();
  d.adapter = () => ({
    read: () => Promise.resolve({ ok: false, failure: 'unreachable' }),
    write: () => Promise.resolve({ ok: false, failure: 'unreachable' }),
  });
  expect(await createFromForm(form(), d)).toEqual({
    ok: false,
    error: 'failed',
    failure: 'unreachable',
  });
  d.adapter = () => {
    throw new RangeError('bad address');
  };
  expect(await createFromForm(form(), d)).toEqual({
    ok: false,
    error: 'failed',
    failure: 'storage',
  });
  expect(await d.store.listSpaces()).toEqual([]);
});
