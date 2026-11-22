// The running app without a screen: the first start, the shown space, a write
// that fails, and two devices that share a list through a storage in memory.
// A space connected to KitchenOwl, through a fake server.
// Not proven here: IndexedDB, a real storage, a real KitchenOwl, a real clock, two real devices.
import { expect, test } from 'vitest';
import { createMemoryStore, type Store, type StoredSpace } from '@nexumia-de/hospes';
import { CHANGE_DELAY_MS, createApp, type App, type AppOptions } from '../src/app';
import { addCategory, addToList, clearBought, editEntry, setBought } from '../src/list/actions';
import { KEYS } from '../src/prefs';
import { connectKitchenowl } from '../src/kitchenowl/config';
import { fakeFetch, fakeKitchenowl } from './kitchenowl-fake';
import {
  fakeStorage,
  memoryPrefs,
  noTimers,
  now,
  putSpace,
  settle,
  sharedSpace,
  type Adapter,
} from './helpers';

const names = { home: 'Home', unnamed: 'Unnamed' };

function appOn(
  store: Store,
  adapter?: Adapter,
  prefs = memoryPrefs(),
  prefix = 'e',
  extra: Partial<AppOptions> = {},
): App {
  let n = 0;
  return createApp({
    store,
    now,
    newId: () => `${prefix}${++n}`,
    prefs,
    names,
    adapter: () => {
      if (!adapter) throw new Error('no storage in this test');
      return adapter;
    },
    ...noTimers,
    ...extra,
  });
}

test('the first start makes a space on this device only, and nothing is sent', async () => {
  const store = createMemoryStore();
  const storage = fakeStorage();
  const app = appOn(store, storage.adapter);
  expect(app.state().phase).toBe('loading');
  await app.load();
  const state = app.state();
  expect(state.phase).toBe('ready');
  expect(state.spaces).toMatchObject([{ name: 'Home', deviceOnly: true }]);
  expect(state.space).toBe(state.spaces[0]);
  await app.act((deps, spaceId) => addToList(deps, spaceId, { name: 'Milk' }));
  await settle();
  expect(app.state().entries).toMatchObject([{ name: 'Milk' }]);
  expect(app.status(state.space?.id ?? '')).toEqual({ kind: 'device-only' });
  expect(storage.state.reads + storage.state.writes).toBe(0);
  app.stop();
});

test('listeners are told of a change, and no longer after they left', async () => {
  const app = appOn(createMemoryStore());
  let told = 0;
  const leave = app.subscribe(() => (told += 1));
  await app.load();
  expect(told).toBeGreaterThan(0);
  leave();
  const before = told;
  await app.act((deps, spaceId) => addToList(deps, spaceId, { name: 'Milk' }));
  expect(told).toBe(before);
  app.stop();
});

test('choosing a space shows its list and its categories and is remembered', async () => {
  const store = createMemoryStore();
  await putSpace(store, 'a', 'Home');
  await putSpace(store, 'b', 'Parents');
  const prefs = memoryPrefs();
  const app = appOn(store, undefined, prefs);
  await app.load();
  expect(app.state().space?.id).toBe('a');
  await app.act((deps, spaceId) => addToList(deps, spaceId, { name: 'Milk' }));
  await app.choose('b');
  expect(app.state().space?.id).toBe('b');
  expect(app.state().entries).toEqual([]);
  await app.act((deps, spaceId) => addCategory(deps, spaceId, 'Garden'));
  expect(app.state().changes).toMatchObject([{ name: 'Garden' }]);
  expect(prefs.get(KEYS.space)).toBe('b');
  await app.choose('a');
  expect(app.state().entries).toMatchObject([{ name: 'Milk' }]);
  expect(app.state().changes).toEqual([]);
  app.stop();
});

test('a shared database that cannot be opened is said, and a later try can succeed', async () => {
  const store = createMemoryStore();
  let broken = true;
  const flaky: Store = {
    ...store,
    listSpaces: () => (broken ? Promise.reject(new Error('no IndexedDB')) : store.listSpaces()),
  };
  const app = appOn(flaky);
  await app.load();
  expect(app.state().phase).toBe('failed');
  expect(await app.act(() => Promise.resolve('never runs'))).toBeUndefined();
  broken = false;
  await app.load();
  expect(app.state().phase).toBe('ready');
  app.stop();
});

test('a write that fails gives undefined and leaves the list as it was', async () => {
  const store = createMemoryStore();
  const failing: Store = {
    ...store,
    changeRecords: () => Promise.reject(new Error('quota')),
  };
  const app = appOn(failing);
  await app.load();
  expect(
    await app.act((deps, spaceId) => addToList(deps, spaceId, { name: 'Milk' })),
  ).toBeUndefined();
  expect(app.state().phase).toBe('ready');
  expect(app.state().entries).toEqual([]);
  app.stop();
});

async function twoDevices(): Promise<{
  space: StoredSpace;
  storage: ReturnType<typeof fakeStorage>;
  a: App;
  b: App;
}> {
  const space = await sharedSpace();
  const storage = fakeStorage();
  const storeA = createMemoryStore();
  const storeB = createMemoryStore();
  await storeA.putSpace(space);
  await storeB.putSpace(space);
  const a = appOn(storeA, storage.adapter, memoryPrefs(), 'a');
  const b = appOn(storeB, storage.adapter, memoryPrefs(), 'b');
  await a.load();
  await b.load();
  await settle();
  return { space, storage, a, b };
}

test('two devices share a list: an entry, a tick, a clearing and a category travel', async () => {
  const { space, storage, a, b } = await twoDevices();
  await a.act((deps, id) => addToList(deps, id, { name: 'Milk', priority: 'now' }));
  await a.act((deps, id) => addCategory(deps, id, 'Garden'));
  a.wake();
  await settle();
  // Three sealed files (the KitchenOwl one empty), and the storage sees neither a name nor a
  // category.
  expect([...storage.files.keys()].sort()).toEqual([
    `${space.id}/kitchenowl.json`,
    `${space.id}/list-categories.json`,
    `${space.id}/list.json`,
  ]);
  for (const file of storage.files.values()) {
    expect(file.body).not.toContain('Milk');
    expect(file.body).not.toContain('Garden');
  }
  b.wake();
  await settle();
  expect(b.state().entries).toMatchObject([{ id: 'a1', name: 'Milk', priority: 'now' }]);
  expect(b.state().changes).toMatchObject([{ name: 'Garden' }]);
  expect(b.status(space.id)).toMatchObject({ kind: 'in-step' });

  // B buys it in the shop; A sees the tick.
  await b.act((deps, id) => setBought(deps, id, 'a1', true));
  b.wake();
  await settle();
  a.wake();
  await settle();
  expect(a.state().entries[0]?.bought).toBeDefined();

  // A clears; the entry is gone on B too.
  await a.act((deps, id) => clearBought(deps, id));
  a.wake();
  await settle();
  b.wake();
  await settle();
  expect(b.state().entries).toEqual([]);
  a.stop();
  b.stop();
});

test('two people adding offline both keep their entries; the same thing stands twice', async () => {
  const { storage, a, b } = await twoDevices();
  storage.state.down = true;
  await a.act((deps, id) => addToList(deps, id, { name: 'Butter' }));
  await b.act((deps, id) => addToList(deps, id, { name: 'butter' }));
  await b.act((deps, id) => addToList(deps, id, { name: 'Tea' }));
  a.wake();
  b.wake();
  await settle();
  expect(a.status(a.state().space?.id ?? '')).toMatchObject({ kind: 'failed' });
  expect(a.state().entries.map((e) => e.name)).toEqual(['Butter']);
  storage.state.down = false;
  a.wake();
  await settle();
  b.wake();
  await settle();
  a.wake();
  await settle();
  const namesOf = (app: App): string[] =>
    app
      .state()
      .entries.map((e) => e.name)
      .sort();
  // Merging is per record: nothing joins "Butter" and "butter" (docs/data-model.md).
  expect(namesOf(a)).toEqual(['Butter', 'Tea', 'butter']);
  expect(namesOf(b)).toEqual(namesOf(a));
  a.stop();
  b.stop();
});

test('one ticks while the other edits the same entry offline: the later write wins whole', async () => {
  const { storage, a, b } = await twoDevices();
  await a.act((deps, id) => addToList(deps, id, { name: 'Bread' }));
  a.wake();
  await settle();
  b.wake();
  await settle();
  storage.state.down = true;
  await a.act((deps, id) => setBought(deps, id, 'a1', true));
  // B writes later (the injected clock only moves forward).
  await b.act((deps, id) => addToList(deps, id, { name: 'bread', amount: '2' }));
  storage.state.down = false;
  a.wake();
  await settle();
  b.wake();
  await settle();
  a.wake();
  await settle();
  for (const app of [a, b]) {
    expect(app.state().entries).toHaveLength(1);
    expect(app.state().entries[0]).toMatchObject({ id: 'a1', amount: '2' });
    // The tick of A is lost: accepted, an entry is small and short-lived.
    expect(app.state().entries[0]?.bought).toBeUndefined();
  }
  a.stop();
  b.stop();
});

test('the app syncs at the start and soon after a change, never on an interval', async () => {
  const space = await sharedSpace();
  const store = createMemoryStore();
  await store.putSpace(space);
  const storage = fakeStorage();
  const timers: { fn: () => void; ms: number }[] = [];
  const app = appOn(store, storage.adapter, memoryPrefs(), 'e', {
    setTimer: (fn, ms) => timers.push({ fn, ms }),
    clearTimer: () => undefined,
  });
  await app.load();
  await settle();
  expect(storage.state.reads).toBeGreaterThan(0);
  // No timer waits for an interval: only what a change asks for.
  expect(timers).toEqual([]);
  const reads = storage.state.reads;
  await app.act((deps, id) => addToList(deps, id, { name: 'Milk' }));
  expect(timers.map((t) => t.ms)).toEqual([CHANGE_DELAY_MS]);
  expect(storage.state.reads).toBe(reads);
  timers[0]?.fn();
  await settle();
  expect(storage.state.writes).toBeGreaterThan(0);
  expect(app.status(space.id)).toMatchObject({ kind: 'in-step' });
  app.stop();
});

test('with syncing by itself off, nothing is sent until the person asks', async () => {
  const space = await sharedSpace();
  const store = createMemoryStore();
  await store.putSpace(space);
  const storage = fakeStorage();
  const prefs = memoryPrefs({ [KEYS.autoSync]: 'off' });
  const timers: number[] = [];
  const app = appOn(store, storage.adapter, prefs, 'e', {
    setTimer: (_fn, ms) => timers.push(ms),
    clearTimer: () => undefined,
  });
  expect(app.autoSync()).toBe(false);
  await app.load();
  await app.act((deps, id) => addToList(deps, id, { name: 'Milk' }));
  app.wake();
  await settle();
  expect(storage.state.reads + storage.state.writes).toBe(0);
  expect(timers).toEqual([]);
  await app.syncNow();
  expect(storage.state.writes).toBeGreaterThan(0);
  // Turning it on syncs at once and is kept.
  const writes = storage.state.writes;
  await app.act((deps, id) => addToList(deps, id, { name: 'Tea' }));
  expect(app.setAutoSync(true)).toBe(true);
  await settle();
  expect(prefs.get(KEYS.autoSync)).toBe('on');
  expect(storage.state.writes).toBeGreaterThan(writes);
  app.stop();
});

/** Two devices of one shared space, both connected to one KitchenOwl list. */
async function twoDevicesWithKitchenowl() {
  const space = await sharedSpace();
  const storage = fakeStorage();
  const ko = fakeKitchenowl();
  const fetch = fakeFetch(ko.client);
  const storeA = createMemoryStore();
  const storeB = createMemoryStore();
  await storeA.putSpace(space);
  await storeB.putSpace(space);
  const a = appOn(storeA, storage.adapter, memoryPrefs(), 'a', { fetch });
  const b = appOn(storeB, storage.adapter, memoryPrefs(), 'b', { fetch });
  await a.load();
  await b.load();
  await a.act((deps, id) =>
    connectKitchenowl(deps, id, {
      url: 'https://ko.example',
      token: 'llt',
      householdId: 1,
      listId: 7,
    }),
  );
  await a.syncNow();
  await b.syncNow();
  return { space, storage, ko, a, b };
}

test('a rename on one device is not undone by the KitchenOwl cycle of another', async () => {
  const { ko, a, b } = await twoDevicesWithKitchenowl();
  await a.act((deps, id) => addToList(deps, id, { name: 'Milk', priority: 'now' }));
  await a.syncNow();
  await b.syncNow();
  expect(b.state().entries).toMatchObject([{ id: 'a1', name: 'Milk' }]);

  await a.act((deps, id) =>
    editEntry(deps, id, 'a1', {
      name: 'Oat milk',
      amount: '',
      note: '',
      priority: 'now',
      categoryId: a.state().entries[0]?.categoryId ?? '',
    }),
  );
  // A takes "Milk" off KitchenOwl and puts "Oat milk" on; B has not seen the rename yet.
  await a.syncNow();
  expect(ko.person.list().map((i) => i.name)).toEqual(['Oat milk']);
  await b.syncNow();
  await a.syncNow();
  for (const app of [a, b]) {
    expect(app.state().entries).toHaveLength(1);
    expect(app.state().entries[0]).toMatchObject({ id: 'a1', name: 'Oat milk', priority: 'now' });
    expect(app.state().entries[0]?.bought).toBeUndefined();
  }
  expect(ko.person.list().map((i) => i.name)).toEqual(['Oat milk']);
  a.stop();
  b.stop();
});

test('when the storage cannot be reached, the KitchenOwl cycle waits instead of using an old list', async () => {
  const { space, storage, ko, a } = await twoDevicesWithKitchenowl();
  ko.person.add('Bread');
  storage.state.down = true;
  const requests = ko.state.requests;
  await a.syncNow();
  expect(ko.state.requests).toBe(requests);
  expect(a.state().entries).toEqual([]);
  expect(a.kitchenowl(space.id)).toMatchObject({
    last: { state: 'failed', failure: 'household' },
  });
  storage.state.down = false;
  await a.syncNow();
  expect(a.state().entries.map((e) => e.name)).toEqual(['Bread']);
  expect(a.kitchenowl(space.id)).toMatchObject({ last: { state: 'synced' } });
  a.stop();
});

test('a space connected to KitchenOwl is kept in step by the app, and says how', async () => {
  const store = createMemoryStore();
  const ko = fakeKitchenowl();
  ko.person.add('Bread');
  let n = 0;
  const app = createApp({
    store,
    now,
    newId: () => `k${++n}`,
    prefs: memoryPrefs(),
    names,
    adapter: () => {
      throw new Error('no storage in this test');
    },
    fetch: fakeFetch(ko.client),
    ...noTimers,
  });
  await app.load();
  const space = app.state().space?.id ?? '';
  // Not connected: nothing is asked.
  await app.syncNow();
  expect(ko.state.requests).toBe(0);
  expect(app.kitchenowl(space)).toBeUndefined();

  await app.act((deps, id) =>
    connectKitchenowl(deps, id, {
      url: 'https://ko.example',
      token: 'llt',
      householdId: 1,
      listId: 7,
    }),
  );
  await app.act((deps, id) => addToList(deps, id, { name: 'Milk' }));
  await app.syncNow();
  expect(
    app
      .state()
      .entries.map((e) => e.name)
      .sort(),
  ).toEqual(['Bread', 'Milk']);
  expect(ko.person.list().map((i) => i.name)).toEqual(['Bread', 'Milk']);
  expect(app.kitchenowl(space)).toMatchObject({
    last: { state: 'synced' },
    syncedAt: expect.any(String),
  });

  ko.state.down = true;
  await app.syncNow();
  expect(app.kitchenowl(space)).toMatchObject({
    last: { state: 'failed', failure: 'unreachable' },
    syncedAt: expect.any(String),
  });
  app.stop();
});
