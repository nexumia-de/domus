/* eslint-disable @typescript-eslint/no-non-null-assertion -- fixtures are indexed at known positions */
// The rules behind the Sync page: storages (what one needs, removal refused
// while a place uses it), binding and unbinding, joining a place and moving it.
import { expect, test } from 'vitest';
import { initialState } from '../src/app-state';
import { createStore } from '../src/state';
import { type LocalStore, type Storage } from '../src/store';
import { bindPlace, unbindPlace } from '../src/sync/bindings';
import { joinPlace, JOINED_PLACE_NAME } from '../src/sync/join';
import { DEFAULT_FOLDER, filePath, LEGACY_FOLDER, pathOf } from '../src/sync/location';
import { relocatePlace } from '../src/sync/relocate';
import { createScheduler } from '../src/sync/scheduler';
import { shareValues } from '../src/sync/share-values';
import {
  addStorage,
  checkAddress,
  checkStorage,
  placesUsing,
  removeStorage,
} from '../src/sync/storages';
import { createFakeStorage, type FakeStorage } from './helpers/fake-adapter';
import { FAST_CIPHER, PASS } from './helpers/sync-client';
import { openFresh } from './helpers';

const draft = {
  label: 'Mine',
  address: 'https://dav.example/files/me/',
  username: '',
  password: '',
};

test('a storage needs a name and an http(s) address; empty user and password are left out', () => {
  expect(checkStorage({ ...draft, label: ' ' })).toEqual({ ok: false, reason: 'empty-label' });
  expect(checkStorage({ ...draft, address: '' })).toEqual({ ok: false, reason: 'empty-address' });
  for (const address of ['dav.example', 'ftp://dav.example', 'https://', 'https://a b.example'])
    expect(checkStorage({ ...draft, address }), address).toEqual({
      ok: false,
      reason: 'bad-address',
    });
  expect(checkStorage(draft)).toEqual({
    ok: true,
    storage: { label: 'Mine', type: 'webdav', baseUrl: 'https://dav.example/files/me' },
  });
  expect(checkStorage({ ...draft, username: 'u', password: 'p' })).toMatchObject({
    ok: true,
    storage: { username: 'u', password: 'p' },
  });
  expect(checkAddress(' http://127.0.0.1:8080/ ')).toBe('http://127.0.0.1:8080');
});

test('an address with user info, a query or a fragment is refused', () => {
  expect(checkAddress('https://user:pass@dav.example/dav')).toBeNull();
  expect(checkAddress('https://user@dav.example/dav')).toBeNull();
  expect(checkAddress('https://dav.example/dav?token=1')).toBeNull();
  expect(checkAddress('https://dav.example/dav#top')).toBeNull();
  expect(checkStorage({ ...draft, address: 'https://u:p@dav.example/dav' })).toEqual({
    ok: false,
    reason: 'bad-address',
  });
});

interface Device {
  local: LocalStore;
  app: ReturnType<typeof createStore<ReturnType<typeof initialState>>>;
  scheduler: ReturnType<typeof createScheduler>;
  storages: Storage[];
  place: string;
}

/** A device with the given fake storages, as storages 1, 2, ... of its list. */
async function device(servers: FakeStorage[]): Promise<Device> {
  const local = await openFresh();
  const app = createStore(initialState('#/stock', { theme: 'system', units: 'metric' }));
  const storages: Storage[] = [];
  for (const [i] of servers.entries())
    storages.push(
      await addStorage(local, {
        label: `S${i + 1}`,
        type: 'webdav',
        baseUrl: `https://s${i + 1}.example`,
      }),
    );
  const adapter = (s: Storage) => servers[storages.findIndex((x) => x.id === s.id)]!.adapter();
  const scheduler = createScheduler({
    local: () => local,
    app,
    now: () => new Date().toISOString(),
    online: () => true,
    cipher: FAST_CIPHER,
    adapter,
  });
  return { local, app, scheduler, storages, place: (await local.placeSelection()).entry };
}
const deps = (d: Device, servers: FakeStorage[]) => ({
  local: d.local,
  scheduler: d.scheduler,
  cipher: FAST_CIPHER,
  adapter: (s: Storage) => servers[d.storages.findIndex((x) => x.id === s.id)]!.adapter(),
  changed: () => undefined,
});

async function shared(): Promise<{
  a: Device;
  server: FakeStorage;
  values: ReturnType<typeof shareValues>;
}> {
  const server = createFakeStorage();
  const a = await device([server]);
  await a.local.places.put({ id: a.place, name: 'Flat', updatedAt: '2026-11-18T09:00:00Z' });
  await a.local.stock.put({
    placeId: a.place,
    ingredientId: 'gin',
    updatedAt: '2026-11-18T09:01:00Z',
    present: true,
  });
  const binding = await bindPlace(a.local, {
    placeId: a.place,
    storageId: a.storages[0]!.id,
    folder: 'mixtura',
    passphrase: PASS,
  });
  expect((await a.scheduler.syncNow(a.place)).kind).toBe('ok');
  return { a, server, values: shareValues(a.storages[0]!, binding) };
}

test('the four values to share are the address, folder, place code and passphrase', async () => {
  const { a, values } = await shared();
  expect(values).toEqual({
    address: 'https://s1.example',
    folder: 'mixtura',
    placeCode: a.place,
    passphrase: PASS,
  });
});

test('a storage is refused while a place uses it, naming the places; otherwise removed', async () => {
  const { a } = await shared();
  const storage = a.storages[0]!;
  const bindings = await a.local.bindings.list();
  const places = await a.local.places.list();
  expect(placesUsing(storage.id, bindings, places)).toEqual(['Flat']);
  expect(await removeStorage(a.local, storage)).toEqual({ ok: false, places: ['Flat'] });
  expect(await a.local.storages.get(storage.id)).toBeDefined();
  await unbindPlace(a.local, a.place);
  expect(await removeStorage(a.local, storage)).toEqual({ ok: true });
  expect(await a.local.storages.get(storage.id)).toBeUndefined();
});

test('unbinding removes the binding, returns it for Undo and keeps data and file', async () => {
  const { a, server } = await shared();
  const old = await unbindPlace(a.local, a.place);
  expect(old?.unitId).toBe(a.place);
  expect(await a.local.bindings.get(['place', a.place])).toBeUndefined();
  expect(await a.local.stock.get([a.place, 'gin'])).toBeDefined();
  expect(server.files.size).toBe(1);
  expect(await unbindPlace(a.local, a.place)).toBeUndefined();
  await a.local.bindings.put(old!);
  expect(await a.local.bindings.get(['place', a.place])).toBeDefined();
});

test('joining brings the place with its name and stock, ticks it and binds it', async () => {
  const { a, server, values } = await shared();
  const b = await device([server]);
  const result = await joinPlace(deps(b, [server]), {
    storageId: b.storages[0]!.id,
    folder: values.folder,
    placeCode: values.placeCode,
    passphrase: values.passphrase,
  });
  expect(result).toEqual({ ok: true, created: true });
  expect((await b.local.places.get(a.place))?.name).toBe('Flat');
  expect(await b.local.stock.get([a.place, 'gin'])).toMatchObject({ present: true });
  expect((await b.local.placeSelection()).ticked).toContain(a.place);
  expect((await b.local.bindings.get(['place', a.place]))?.passphrase).toBe(PASS);
});

test('a typed passphrase is normalised like a generated one', async () => {
  const { a, server, values } = await shared();
  const b = await device([server]);
  const typed = ` ${values.passphrase.toLowerCase().replaceAll('-', ' - ').replaceAll(' ', '')} `;
  expect(
    await joinPlace(deps(b, [server]), {
      storageId: b.storages[0]!.id,
      folder: 'mixtura',
      placeCode: ` ${a.place} `,
      passphrase: typed,
    }),
  ).toMatchObject({ ok: true });
});

test('a wrong passphrase, a missing file or a bad code leaves nothing behind', async () => {
  const { a, server, values } = await shared();
  const b = await device([server]);
  const before = (await b.local.places.list()).length;
  const base = {
    storageId: b.storages[0]!.id,
    folder: values.folder,
    placeCode: values.placeCode,
    passphrase: values.passphrase,
  };
  const refused = async (patch: Partial<typeof base>) =>
    joinPlace(deps(b, [server]), { ...base, ...patch });
  expect(await refused({ passphrase: 'not the passphrase' })).toEqual({
    ok: false,
    problem: 'wrong-passphrase',
  });
  expect(await refused({ folder: 'elsewhere' })).toEqual({ ok: false, problem: 'missing-file' });
  expect(await refused({ placeCode: 'flat' })).toEqual({ ok: false, problem: 'invalid-code' });
  expect(await refused({ folder: '../x' })).toEqual({ ok: false, problem: 'invalid-folder' });
  expect(await refused({ passphrase: '  ' })).toEqual({ ok: false, problem: 'empty-passphrase' });
  expect(await refused({ storageId: 'u-00000000-0000-4000-8000-000000000000' })).toEqual({
    ok: false,
    problem: 'no-storage',
  });
  expect(await b.local.places.list()).toHaveLength(before);
  expect(await b.local.places.get(a.place)).toBeUndefined();
  expect(await b.local.bindings.list()).toHaveLength(0);
  expect(JOINED_PLACE_NAME).toBe('Joined place');
});

test('a join whose first cycle fails after the check takes back the place and the binding', async () => {
  const { a, server, values } = await shared();
  const b = await device([server]);
  let reads = 0;
  const flaky = {
    ...deps(b, [server]),
    scheduler: createScheduler({
      local: () => b.local,
      app: b.app,
      now: () => new Date().toISOString(),
      online: () => true,
      cipher: FAST_CIPHER,
      adapter: () => ({
        read: async () => ({ ok: false as const, failure: 'unreachable' as const }),
        write: async () => ({ ok: false as const, failure: 'unreachable' as const }),
      }),
    }),
    adapter: () => {
      const inner = server.adapter();
      return {
        read: async (p: string) =>
          reads++ === 0 ? inner.read(p) : { ok: false as const, failure: 'unreachable' as const },
        write: inner.write,
      };
    },
  };
  const result = await joinPlace(flaky, {
    storageId: b.storages[0]!.id,
    folder: values.folder,
    placeCode: values.placeCode,
    passphrase: values.passphrase,
  });
  expect(result).toEqual({ ok: false, problem: 'unreachable' });
  expect(await b.local.places.get(a.place)).toBeUndefined();
  expect(await b.local.bindings.list()).toHaveLength(0);
  expect((await b.local.placeSelection()).ticked).not.toContain(a.place);
});

test('joining a place the device has just binds it, without a second place', async () => {
  const { a, server, values } = await shared();
  const b = await device([server]);
  await b.local.places.put({ id: a.place, name: 'My copy', updatedAt: '2026-11-18T08:00:00Z' });
  const placesBefore = (await b.local.places.list()).length;
  const result = await joinPlace(deps(b, [server]), {
    storageId: b.storages[0]!.id,
    folder: values.folder,
    placeCode: values.placeCode,
    passphrase: values.passphrase,
  });
  expect(result).toEqual({ ok: true, created: false });
  expect(await b.local.places.list()).toHaveLength(placesBefore);
  expect((await b.local.bindings.get(['place', a.place]))?.storageId).toBe(b.storages[0]!.id);
});

test('moving puts the merge in the new place, marks the old file and re-points the binding', async () => {
  const one = createFakeStorage();
  const two = createFakeStorage();
  const a = await device([one, two]);
  await a.local.stock.put({
    placeId: a.place,
    ingredientId: 'gin',
    updatedAt: '2026-11-18T09:01:00Z',
    present: true,
  });
  await bindPlace(a.local, {
    placeId: a.place,
    storageId: a.storages[0]!.id,
    folder: 'mixtura',
    passphrase: PASS,
  });
  await a.scheduler.syncNow(a.place);
  const adapter = (s: Storage) => (s.id === a.storages[0]!.id ? one : two).adapter();
  const move = {
    local: a.local,
    app: a.app,
    cipher: FAST_CIPHER,
    now: () => '2026-11-18T10:00:00Z',
    adapter,
  };
  expect(
    await relocatePlace(move, {
      placeId: a.place,
      storageId: a.storages[0]!.id,
      folder: 'mixtura',
    }),
  ).toEqual({ ok: false, problem: 'same-place' });
  expect(
    await relocatePlace(move, { placeId: a.place, storageId: a.storages[1]!.id, folder: 'new' }),
  ).toEqual({ ok: true, marked: true });
  const binding = await a.local.bindings.get(['place', a.place]);
  expect(binding).toMatchObject({
    storageId: a.storages[1]!.id,
    folder: 'new',
    lastSyncAt: '2026-11-18T10:00:00Z',
  });
  expect(binding?.lastError).toBeUndefined();
  expect(two.files.has(`new/${a.place}.json`)).toBe(true);
  expect(one.files.get(`mixtura/${a.place}.json`)).toBeDefined();
  // Someone still on the old location now learns that the place moved.
  const other = await device([one]);
  await other.local.places.put({ id: a.place, name: 'Home', updatedAt: '2026-11-18T08:00:00Z' });
  await bindPlace(other.local, {
    placeId: a.place,
    storageId: other.storages[0]!.id,
    folder: 'mixtura',
    passphrase: PASS,
  });
  expect((await other.scheduler.syncNow(a.place)).kind).toBe('moved');
  expect((await other.local.bindings.get(['place', a.place]))?.lastError).toBe('moved');
});

test('the file of a place is <folder>/<place id>.json, Mixtura’s own', async () => {
  const id = 'u-3f2b8c1e-5d4a-4e6f-9a7b-1c2d3e4f5a6b';
  expect(filePath('household', id)).toBe(`household/${id}.json`);
  expect(pathOf({ folder: 'a/b', unitId: id })).toBe(`a/b/${id}.json`);
});

test('a binding that stored the old folder keeps syncing to mixtura/<id>.json', async () => {
  const { a, server } = await shared();
  expect(DEFAULT_FOLDER).toBe('household');
  expect((await a.local.bindings.get(['place', a.place]))?.folder).toBe(LEGACY_FOLDER);
  expect([...server.files.keys()]).toEqual([`mixtura/${a.place}.json`]);
  await a.local.stock.put({
    placeId: a.place,
    ingredientId: 'rum',
    updatedAt: '2026-11-18T09:05:00Z',
    present: true,
  });
  expect((await a.scheduler.syncNow(a.place)).kind).toBe('ok');
  expect([...server.files.keys()]).toEqual([`mixtura/${a.place}.json`]);
});

test('joining the default folder finds the file there, or once in the old folder', async () => {
  const { a, server, values } = await shared();
  const base = (b: Device) => ({
    storageId: b.storages[0]!.id,
    folder: DEFAULT_FOLDER,
    placeCode: values.placeCode,
    passphrase: values.passphrase,
  });
  // Only in the old folder: found there, bound with it.
  const b = await device([server]);
  const before = server.reads;
  expect(await joinPlace(deps(b, [server]), base(b))).toMatchObject({ ok: true });
  expect(server.reads - before).toBeGreaterThanOrEqual(2);
  expect((await b.local.bindings.get(['place', a.place]))?.folder).toBe(LEGACY_FOLDER);
  // In the default folder: no look at the old one.
  const body = server.body(`mixtura/${a.place}.json`)!;
  server.put(`${DEFAULT_FOLDER}/${a.place}.json`, body);
  server.files.delete(`mixtura/${a.place}.json`);
  const c = await device([server]);
  const reads = server.reads;
  expect(await joinPlace(deps(c, [server]), base(c))).toMatchObject({ ok: true });
  expect((await c.local.bindings.get(['place', a.place]))?.folder).toBe(DEFAULT_FOLDER);
  const first = server.reads - reads;
  // Missing in both: missing-file, nothing bound.
  server.files.delete(`${DEFAULT_FOLDER}/${a.place}.json`);
  const d = await device([server]);
  expect(await joinPlace(deps(d, [server]), base(d))).toEqual({
    ok: false,
    problem: 'missing-file',
  });
  expect(await d.local.bindings.get(['place', a.place])).toBeUndefined();
  expect(first).toBeGreaterThan(0);
});

test('only the default folder falls back; a typed folder or another failure does not', async () => {
  const { a, server, values } = await shared();
  const b = await device([server]);
  const base = {
    storageId: b.storages[0]!.id,
    folder: 'elsewhere',
    placeCode: values.placeCode,
    passphrase: values.passphrase,
  };
  let reads = server.reads;
  expect(await joinPlace(deps(b, [server]), base)).toEqual({ ok: false, problem: 'missing-file' });
  expect(server.reads - reads).toBe(1);
  // The default folder is empty but a wrong passphrase in the old one is never reached either:
  // a failure of the first probe ends the join without a second request.
  server.put(`${DEFAULT_FOLDER}/${a.place}.json`, 'not an encrypted file');
  reads = server.reads;
  const result = await joinPlace(deps(b, [server]), { ...base, folder: DEFAULT_FOLDER });
  expect(result.ok).toBe(false);
  expect(server.reads - reads).toBe(1);
  expect(await b.local.bindings.get(['place', a.place])).toBeUndefined();
});
