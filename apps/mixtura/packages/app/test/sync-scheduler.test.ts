/* eslint-disable @typescript-eslint/no-non-null-assertion -- fixtures are indexed at known positions */
// When sync runs: the scheduler's triggers, the one-cycle-per-place rule and
// the offline rule, against an in-memory storage and a real local store.
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { initialState } from '../src/app-state';
import { createStore } from '../src/state';
import { newUserId, type LocalStore, type StockRecord } from '../src/store';
import { createScheduler, DEBOUNCE_MS, STALE_MS, type Scheduler } from '../src/sync/scheduler';
import { createFakeStorage, type FakeStorage } from './helpers/fake-adapter';
import { FAST_CIPHER, PASS } from './helpers/sync-client';
import { openFresh } from './helpers';

const START = Date.parse('2026-11-18T09:00:00Z');

interface Rig {
  local: LocalStore;
  app: ReturnType<typeof createStore<ReturnType<typeof initialState>>>;
  storage: FakeStorage;
  scheduler: Scheduler;
  placeId: string;
  online: { value: boolean };
  row: (ingredientId: string, at: string, present?: boolean) => StockRecord;
  bind: (placeId?: string) => Promise<void>;
}

async function rig(shared?: FakeStorage): Promise<Rig> {
  const local = await openFresh();
  const placeId = (await local.placeSelection()).entry;
  const app = createStore(initialState('#/stock', { theme: 'system', units: 'metric' }));
  const storage = shared ?? createFakeStorage();
  const online = { value: true };
  const scheduler = createScheduler({
    local: () => local,
    app,
    now: () => new Date(Date.now()).toISOString(),
    online: () => online.value,
    cipher: FAST_CIPHER,
    adapter: () => storage.adapter(),
  });
  await local.storages.put({
    id: 'u-aaaaaaaa-0000-4000-8000-000000000001',
    label: 'Test',
    type: 'webdav',
    baseUrl: 'https://dav.example',
  });
  const bind = async (id: string = placeId): Promise<void> => {
    await local.bindings.put({
      unitKind: 'place',
      unitId: id,
      storageId: 'u-aaaaaaaa-0000-4000-8000-000000000001',
      folder: 'mixtura',
      passphrase: PASS,
    });
  };
  const row = (ingredientId: string, at: string, present = true): StockRecord => ({
    placeId,
    ingredientId,
    updatedAt: at,
    present,
  });
  return { local, app, storage, scheduler, placeId, online, row, bind };
}

/** Lets the store answer: its requests finish on the real event loop, not on the fake timers. */
const settle = async (): Promise<void> => {
  for (let i = 0; i < 3; i++) await new Promise((done) => setImmediate(done));
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'], now: START });
});
afterEach(() => {
  vi.useRealTimers();
});

const time = (ms: number): string => new Date(START + ms).toISOString();

test('an unbound place never causes a request', async () => {
  const r = await rig();
  expect(await r.scheduler.syncNow(r.placeId)).toEqual({ kind: 'skipped', why: 'unbound' });
  r.scheduler.stockChanged(r.placeId);
  await settle();
  await vi.advanceTimersByTimeAsync(DEBOUNCE_MS * 2);
  await r.scheduler.start();
  await r.scheduler.cameOnline();
  await r.scheduler.becameVisible();
  await r.scheduler.syncAll();
  expect(r.storage.reads + r.storage.writes).toBe(0);
});

test('Sync Now runs a cycle, stores the binding state and writes the file', async () => {
  const r = await rig();
  await r.local.stock.put(r.row('gin', time(1000)));
  await r.bind();
  const result = await r.scheduler.syncNow(r.placeId);
  expect(result.kind).toBe('ok');
  expect(r.storage.files.size).toBe(1);
  const binding = await r.local.bindings.get(['place', r.placeId]);
  expect(binding?.lastSyncAt).toBe(time(0));
  expect(binding?.lastError).toBeUndefined();
  expect(binding?.etag).toBeTypeOf('string');
});

test('a failure is kept in the binding and a later success clears it', async () => {
  const r = await rig();
  await r.bind();
  r.storage.failNext('read', 1, 'unauthorised');
  await r.scheduler.syncNow(r.placeId);
  expect((await r.local.bindings.get(['place', r.placeId]))?.lastError).toBe('unauthorised');
  await r.scheduler.syncNow(r.placeId);
  expect((await r.local.bindings.get(['place', r.placeId]))?.lastError).toBeUndefined();
});

test('offline nothing is tried; the place waits and comes back online', async () => {
  const r = await rig();
  await r.bind();
  r.online.value = false;
  expect(await r.scheduler.syncNow(r.placeId)).toEqual({ kind: 'skipped', why: 'offline' });
  expect(r.storage.reads).toBe(0);
  expect(r.scheduler.activity(r.placeId).pending).toBe(true);
  r.online.value = true;
  await r.scheduler.cameOnline();
  expect(r.storage.reads).toBeGreaterThan(0);
  expect(r.scheduler.activity(r.placeId).pending).toBe(false);
});

test('a second request during a cycle is queued once, not dropped and not doubled', async () => {
  const r = await rig();
  await r.bind();
  let release: () => void = () => undefined;
  const gate = new Promise<void>((done) => (release = done));
  const adapter = r.storage.adapter();
  let reads = 0;
  const slow = createScheduler({
    local: () => r.local,
    app: r.app,
    now: () => new Date(Date.now()).toISOString(),
    online: () => true,
    cipher: FAST_CIPHER,
    adapter: () => ({
      read: async (path) => {
        reads += 1;
        if (reads === 1) await gate;
        return adapter.read(path);
      },
      write: (path, body, ifMatch) => adapter.write(path, body, ifMatch),
    }),
  });
  const first = slow.syncNow(r.placeId);
  await vi.advanceTimersByTimeAsync(0);
  expect(slow.activity(r.placeId).running).toBe(true);
  const second = slow.syncNow(r.placeId);
  const third = slow.syncNow(r.placeId);
  expect(third).toBe(second);
  release();
  await Promise.all([first, second, third]);
  // The first cycle reads twice (it wrote), the queued one once more: three reads in all, no more.
  const afterThree = reads;
  await vi.advanceTimersByTimeAsync(10_000);
  expect(reads).toBe(afterThree);
  expect(slow.activity(r.placeId).running).toBe(false);
});

test('a stock change in a bound place syncs after the debounce, once for a burst', async () => {
  const r = await rig();
  await r.bind();
  await r.scheduler.syncNow(r.placeId);
  const before = r.storage.writes;
  await r.local.stock.put(r.row('gin', time(5000)));
  r.scheduler.stockChanged(r.placeId);
  await settle();
  await vi.advanceTimersByTimeAsync(DEBOUNCE_MS - 500);
  r.scheduler.stockChanged(r.placeId);
  await settle();
  await vi.advanceTimersByTimeAsync(DEBOUNCE_MS - 500);
  expect(r.storage.writes).toBe(before);
  expect(r.scheduler.activity(r.placeId).pending).toBe(true);
  await vi.advanceTimersByTimeAsync(1000);
  for (let i = 0; i < 50 && r.storage.writes === before; i++) await settle();
  expect(r.storage.writes).toBe(before + 1);
  expect(r.scheduler.activity(r.placeId).pending).toBe(false);
});

test('at start every bound place syncs; a moved place does not', async () => {
  const r = await rig();
  const other = newUserId();
  await r.local.places.put({ id: other, name: 'Cellar', updatedAt: time(0) });
  await r.bind();
  await r.bind(other);
  await r.local.bindings.put({
    ...(await r.local.bindings.get(['place', other]))!,
    lastError: 'moved',
  });
  await r.scheduler.start();
  expect([...r.storage.files.keys()]).toEqual([`mixtura/${r.placeId}.json`]);
});

test('becoming visible syncs only places whose last sync is older than five minutes', async () => {
  const r = await rig();
  await r.bind();
  await r.scheduler.syncNow(r.placeId);
  const reads = r.storage.reads;
  await vi.advanceTimersByTimeAsync(STALE_MS - 1000);
  await r.scheduler.becameVisible();
  expect(r.storage.reads).toBe(reads);
  await vi.advanceTimersByTimeAsync(2000);
  await r.scheduler.becameVisible();
  expect(r.storage.reads).toBeGreaterThan(reads);
});

test('a change made during a cycle survives the merge and is sent by the next one', async () => {
  const r = await rig();
  await r.bind();
  await r.local.stock.put(r.row('gin', time(1000)));
  const adapter = r.storage.adapter();
  const racing = createScheduler({
    local: () => r.local,
    app: r.app,
    now: () => new Date(Date.now()).toISOString(),
    online: () => true,
    cipher: FAST_CIPHER,
    adapter: () => ({
      read: async (path) => {
        const answer = await adapter.read(path);
        // The user toggles gin and adds lime while the cycle is in flight.
        await r.local.stock.put(r.row('gin', time(9000), false));
        await r.local.stock.put(r.row('lime', time(9500)));
        return answer;
      },
      write: (path, body, ifMatch) => adapter.write(path, body, ifMatch),
    }),
  });
  await racing.syncNow(r.placeId);
  expect(await r.local.stock.get([r.placeId, 'gin'])).toMatchObject({ present: false });
  expect(await r.local.stock.get([r.placeId, 'lime'])).toBeDefined();
  // The next cycle, with no interference, carries both to the file.
  const writes = r.storage.writes;
  await r.scheduler.syncNow(r.placeId);
  expect(r.storage.writes).toBeGreaterThan(writes);
});

test('records that arrive by sync do not count for the backup reminder', async () => {
  const a = await rig();
  const b = await rig(a.storage);
  // Device B has the same place and writes its stock to the shared file.
  await b.local.places.put({ id: a.placeId, name: 'Home', updatedAt: time(0) });
  await b.local.stock.put({ ...b.row('gin', time(2000)), placeId: a.placeId });
  await b.bind(a.placeId);
  expect((await b.scheduler.syncNow(a.placeId)).kind).toBe('ok');
  await a.bind();
  const counted = (await a.local.backup.load()).changesSinceExport;
  expect((await a.scheduler.syncNow(a.placeId)).kind).toBe('ok');
  expect(await a.local.stock.get([a.placeId, 'gin'])).toBeDefined();
  expect((await a.local.backup.load()).changesSinceExport).toBe(counted);
});
