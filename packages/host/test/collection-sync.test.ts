// The loops of an app: one per shared space on the cycle, none for a space on
// this device only, two devices converging through one storage, several
// collections in one run, and what a screen is told.
import { expect, test } from 'vitest';
import { createCollectionSync, type CollectionSyncOptions } from '../src/collection-sync';
import { localChange } from '../src/cycle';
import { createMemoryStore } from '../src/memory-store';
import { deriveSpace, newSecret } from '../src/space';
import type { Store as SharedStore, StoredSpace } from '../src/store';

type Adapter = ReturnType<CollectionSyncOptions['adapter']>;

const sharedStore = (): SharedStore => createMemoryStore();

/** The record of a key in a collection of a space, as stored. */
async function stored(shared: SharedStore, spaceId: string, key: string, collection = 'stock') {
  const { records } = await shared.readCollection(spaceId, collection);
  return records.find((r) => r.key === key);
}

/** A storage in memory with versions, as the adapters give them; `down` makes it unreachable. */
function fakeStorage() {
  const files = new Map<string, { body: string; etag: string }>();
  const state = { down: false, reads: 0, writes: 0 };
  let version = 0;
  const adapter: Adapter = {
    read: (path) => {
      state.reads += 1;
      if (state.down) return Promise.resolve({ ok: false, failure: 'unreachable' });
      const file = files.get(path);
      return Promise.resolve(
        file ? { ok: true, missing: false, ...file } : { ok: true, missing: true },
      );
    },
    write: (path, body, ifMatch) => {
      state.writes += 1;
      if (state.down) return Promise.resolve({ ok: false, failure: 'unreachable' });
      const file = files.get(path);
      if ((file?.etag ?? null) !== ifMatch)
        return Promise.resolve({ ok: false, failure: 'conflict' });
      const etag = `v${++version}`;
      files.set(path, { body, etag });
      return Promise.resolve({ ok: true, etag });
    },
  };
  return { adapter, state, files };
}

let tick = 0;
const now = (): string => new Date(Date.UTC(2026, 10, 20, 9, 0, 0, tick++)).toISOString();

/** Timers that never fire by themselves: a test runs cycles with `syncNow`. */
const noTimers = { setTimer: () => 0, clearTimer: () => undefined };
const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 30));

async function device(
  space: StoredSpace,
  adapter: Adapter,
  collections: readonly string[] = ['stock'],
) {
  const shared: SharedStore = sharedStore();
  await shared.putSpace(space);
  const seen: string[] = [];
  const sync = createCollectionSync({
    store: shared,
    collections,
    adapter: () => adapter,
    now,
    onChange: (what) => seen.push(what),
    ...noTimers,
  });
  return { shared, sync, seen };
}

async function sharedSpace(): Promise<StoredSpace> {
  const secret = newSecret();
  const { id } = await deriveSpace(secret);
  return { id, secret, name: 'Household', storage: { type: 'github', address: 'me/store' } };
}

test('two devices converge on the stock of a shared space', async () => {
  const space = await sharedSpace();
  const storage = fakeStorage();
  const a = await device(space, storage.adapter);
  const b = await device(space, storage.adapter);
  await localChange(a.shared, space.id, 'stock', now, () => ({
    put: [{ key: 'gin', value: { present: true } }],
  }));
  await a.sync.refresh();
  await settle();
  expect(a.sync.status(space.id)).toMatchObject({ kind: 'in-step' });
  expect([...storage.files.keys()]).toEqual([`${space.id}/stock.json`]);
  // The file is sealed: the storage sees no ingredient.
  expect([...storage.files.values()][0]?.body).not.toContain('gin');

  await b.sync.refresh();
  await settle();
  expect(await stored(b.shared, space.id, 'gin')).toMatchObject({ value: { present: true } });
  // The screens are told that records changed, so they read them again.
  expect(b.seen).toContain('records');

  // B says it is gone; A learns it at its next cycle.
  await localChange(b.shared, space.id, 'stock', now, () => ({
    put: [{ key: 'gin', value: { present: false } }],
  }));
  b.sync.syncNow();
  await settle();
  a.sync.syncNow();
  await settle();
  expect(await stored(a.shared, space.id, 'gin')).toMatchObject({ value: { present: false } });
  a.sync.stop();
  b.sync.stop();
});

test('a space on this device only causes no request', async () => {
  const storage = fakeStorage();
  const space: StoredSpace = {
    id: 'local',
    secret: 'x',
    name: 'Home',
    storage: { type: 'device', address: '' },
  };
  const { sync } = await device(space, storage.adapter);
  await sync.refresh();
  sync.syncNow();
  sync.changed(space.id);
  await settle();
  expect(storage.state.reads + storage.state.writes).toBe(0);
  expect(sync.status(space.id)).toEqual({ kind: 'device-only' });
  sync.stop();
});

test('a failed cycle is told, keeps the local stock and is forgotten after a good one', async () => {
  const space = await sharedSpace();
  const storage = fakeStorage();
  const { shared, sync } = await device(space, storage.adapter);
  await localChange(shared, space.id, 'stock', now, () => ({
    put: [{ key: 'rum', value: { present: true } }],
  }));
  storage.state.down = true;
  await sync.refresh();
  await settle();
  expect(sync.status(space.id)).toEqual({ kind: 'failed', failure: 'unreachable' });
  expect(await stored(shared, space.id, 'rum')).toMatchObject({ value: { present: true } });
  storage.state.down = false;
  sync.syncNow();
  await settle();
  expect(sync.status(space.id)).toMatchObject({ kind: 'in-step' });
  sync.stop();
});

test('a storage this build does not know is told as such and no loop runs', async () => {
  const space = { ...(await sharedSpace()), storage: { type: 'carrier-pigeon', address: 'x' } };
  const shared = sharedStore();
  await shared.putSpace(space);
  const sync = createCollectionSync({
    store: shared,
    collections: ['stock'],
    adapter: () => {
      throw new Error('unknown');
    },
    now,
    onChange: () => undefined,
    ...noTimers,
  });
  await sync.refresh();
  expect(sync.status(space.id)).toEqual({ kind: 'failed', failure: 'storage' });
  sync.stop();
});

test('a space that got a storage, or left the device, is picked up by the next refresh', async () => {
  const storage = fakeStorage();
  const shared = sharedStore();
  const secret = newSecret();
  const { id } = await deriveSpace(secret);
  await shared.putSpace({ id, secret, name: 'Home', storage: { type: 'device', address: '' } });
  const sync = createCollectionSync({
    store: shared,
    collections: ['stock'],
    adapter: () => storage.adapter,
    now,
    onChange: () => undefined,
    ...noTimers,
  });
  await sync.refresh();
  expect(sync.status(id)).toEqual({ kind: 'device-only' });
  // Connected in the Household app: same id and secret, now with a storage.
  await shared.putSpace({ id, secret, name: 'Home', storage: { type: 'github', address: 'a/b' } });
  await sync.refresh();
  await settle();
  expect(sync.status(id)).toMatchObject({ kind: 'in-step' });
  await shared.removeSpace(id);
  await sync.refresh();
  expect(sync.status(id)).toBeUndefined();
  sync.stop();
});

test('a shared database that cannot be opened is no error: nothing runs', async () => {
  const broken = {
    ...sharedStore(),
    listSpaces: () => Promise.reject(new Error('The local database could not be opened')),
  };
  const sync = createCollectionSync({
    store: broken,
    collections: ['stock'],
    adapter: () => fakeStorage().adapter,
    now,
    onChange: () => undefined,
    ...noTimers,
  });
  await expect(sync.refresh()).resolves.toBeUndefined();
  expect(sync.status('any')).toBeUndefined();
  sync.stop();
});

test('two refreshes at once start one loop for a space', async () => {
  const space = await sharedSpace();
  const storage = fakeStorage();
  const { sync } = await device(space, storage.adapter);
  // At the start the stock read and the page coming to the front both ask.
  await Promise.all([sync.refresh(), sync.refresh()]);
  await settle();
  expect(storage.state.reads).toBe(1);
  sync.stop();
  sync.syncNow();
  await settle();
  expect(storage.state.reads).toBe(1);
});

test('a stop while the spaces are being read leaves no loop behind', async () => {
  const space = await sharedSpace();
  const storage = fakeStorage();
  const shared = sharedStore();
  await shared.putSpace(space);
  const slow = {
    ...shared,
    readCollection: async (id: string, name: string) => {
      await settle();
      return shared.readCollection(id, name);
    },
  };
  const sync = createCollectionSync({
    store: slow,
    collections: ['stock'],
    adapter: () => storage.adapter,
    now,
    onChange: () => undefined,
    ...noTimers,
  });
  const reading = sync.refresh();
  // The spaces are listed; the stop comes while the first collection is read.
  await new Promise((r) => setTimeout(r, 5));
  sync.stop();
  await reading;
  await settle();
  expect(storage.state.reads).toBe(0);
  expect(sync.status(space.id)).toBeUndefined();
});

test('a space that came or went since the last look tells the screens to read again', async () => {
  const storage = fakeStorage();
  const shared = sharedStore();
  const seen: string[] = [];
  const sync = createCollectionSync({
    store: shared,
    collections: ['stock'],
    adapter: () => storage.adapter,
    now,
    onChange: (what) => seen.push(what),
    ...noTimers,
  });
  await shared.putSpace({ id: 'a', secret: 'x', storage: { type: 'device', address: '' } });
  await sync.refresh();
  // The first look is the screens' own read: nothing to read again.
  expect(seen).not.toContain('records');
  await sync.refresh();
  expect(seen).not.toContain('records');
  // Joined in the Household app in another tab.
  await shared.putSpace({ id: 'b', secret: 'y', storage: { type: 'device', address: '' } });
  await sync.refresh();
  expect(seen.filter((w) => w === 'records')).toHaveLength(1);
  await shared.removeSpace('a');
  await sync.refresh();
  expect(seen.filter((w) => w === 'records')).toHaveLength(2);
  sync.stop();
});

test('every collection of an app gets its own file in one run', async () => {
  const space = await sharedSpace();
  const storage = fakeStorage();
  const a = await device(space, storage.adapter, ['entries', 'categories']);
  const b = await device(space, storage.adapter, ['entries', 'categories']);
  await localChange(a.shared, space.id, 'entries', now, () => ({
    put: [{ key: 'e1', value: { name: 'Milk' } }],
  }));
  await localChange(a.shared, space.id, 'categories', now, () => ({
    put: [{ key: 'c1', value: { name: 'Garden' } }],
  }));
  await a.sync.refresh();
  await settle();
  expect([...storage.files.keys()].sort()).toEqual([
    `${space.id}/categories.json`,
    `${space.id}/entries.json`,
  ]);
  await b.sync.refresh();
  await settle();
  expect(await stored(b.shared, space.id, 'e1', 'entries')).toMatchObject({
    value: { name: 'Milk' },
  });
  expect(await stored(b.shared, space.id, 'c1', 'categories')).toMatchObject({
    value: { name: 'Garden' },
  });
  // A collection of another app in the same space is not touched.
  expect([...storage.files.keys()]).not.toContain(`${space.id}/stock.json`);
  a.sync.stop();
  b.sync.stop();
});

test('a collection whose file cannot be read does not hold back the others', async () => {
  const space = await sharedSpace();
  const storage = fakeStorage();
  const a = await device(space, storage.adapter, ['entries', 'categories']);
  await localChange(a.shared, space.id, 'categories', now, () => ({
    put: [{ key: 'c1', value: { name: 'Garden' } }],
  }));
  // Something that is no sealed file lies where the first collection belongs.
  storage.files.set(`${space.id}/entries.json`, { body: 'not a sealed file', etag: 'x' });
  await a.sync.refresh();
  await settle();
  expect(a.sync.status(space.id)).toEqual({ kind: 'failed', failure: 'not-sealed' });
  // The file that cannot be read is left as it is; the second collection was still written.
  expect(storage.files.get(`${space.id}/entries.json`)?.body).toBe('not a sealed file');
  expect(storage.files.has(`${space.id}/categories.json`)).toBe(true);
  a.sync.stop();
});

test("the interval of the loop is the app's to choose", async () => {
  const space = await sharedSpace();
  const storage = fakeStorage();
  const shared = sharedStore();
  await shared.putSpace(space);
  const waits: number[] = [];
  const sync = createCollectionSync({
    store: shared,
    collections: ['entries'],
    adapter: () => storage.adapter,
    now,
    onChange: () => undefined,
    intervalMs: 5000,
    setTimer: (_fn, ms) => waits.push(ms),
    clearTimer: () => undefined,
  });
  await sync.refresh();
  await settle();
  expect(waits).toContain(5000);
  sync.stop();
});
