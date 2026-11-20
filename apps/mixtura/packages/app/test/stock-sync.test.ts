// The stock sync: one loop per shared space on the host package's cycle, none
// for a space on this device only, two devices converging through one storage,
// and what the Spaces sheet is told.
import { expect, test } from 'vitest';
import {
  deriveSpace,
  localChange,
  newSecret,
  type Store as SharedStore,
  type StoredSpace,
} from '@nexumia-de/hospes';
import { syncText } from '../src/screens/stock/sync-text';
import { createStockSync, type StockSyncOptions } from '../src/stock/sync';
import { sharedStore, storedStock } from './helpers';

type Adapter = ReturnType<StockSyncOptions['adapter']>;

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

async function device(space: StoredSpace, adapter: Adapter) {
  const shared: SharedStore = sharedStore();
  await shared.putSpace(space);
  const seen: string[] = [];
  const sync = createStockSync({
    shared,
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
  expect(await storedStock(b.shared, space.id, 'gin')).toMatchObject({ value: { present: true } });
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
  expect(await storedStock(a.shared, space.id, 'gin')).toMatchObject({ value: { present: false } });
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
  expect(await storedStock(shared, space.id, 'rum')).toMatchObject({ value: { present: true } });
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
  const sync = createStockSync({
    shared,
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
  const sync = createStockSync({
    shared,
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
  const sync = createStockSync({
    shared: broken,
    adapter: () => fakeStorage().adapter,
    now,
    onChange: () => undefined,
    ...noTimers,
  });
  await expect(sync.refresh()).resolves.toBeUndefined();
  expect(sync.status('any')).toBeUndefined();
  sync.stop();
});

test('the status in words', () => {
  const at = '2026-11-20T09:00:00.000Z';
  const later = '2026-11-20T09:05:10.000Z';
  expect(syncText({ kind: 'device-only' }, later, true)).toBe('On this device only');
  expect(syncText({ kind: 'in-step', at }, later, true)).toBe('In step · 5 min ago');
  expect(syncText({ kind: 'in-step', at }, at, true)).toBe('In step · just now');
  expect(syncText({ kind: 'never' }, later, true)).toBe('Not synced yet');
  expect(syncText({ kind: 'never' }, later, false)).toBe('Offline');
  expect(syncText({ kind: 'failed', failure: 'unauthorised' }, later, true)).toBe(
    'Last sync failed: the storage refused the access',
  );
  expect(syncText({ kind: 'failed', failure: 'bad-document' }, later, true)).toBe(
    'Last sync failed: the file in the storage could not be read',
  );
  expect(syncText(undefined, later, true)).toBe('');
});
