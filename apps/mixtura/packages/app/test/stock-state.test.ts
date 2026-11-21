import { expect, test } from 'vitest';
import { initialState } from '../src/app-state';
import { COMMON_STOCK } from '../src/screens/stock/common';
import { createStore } from '../src/state';
import {
  changeStock,
  invalidateStock,
  stockState,
  stockWrites,
  withPresent,
} from '../src/stock/state';
import { type LocalStore, type StockFields } from '../src/store';
import type { Store as SharedStore } from '@nexumia-de/hospes';
import { seedModel } from './browse-fixture';
import { openFresh, seedStock, sharedStore, stockData, storedStock } from './helpers';

function ready(ctx: Parameters<typeof stockState>[0]) {
  const s = stockState(ctx);
  if (s.kind !== 'ready') throw new Error('stock not loaded');
  return s;
}
const recordsOf = (ctx: Parameters<typeof stockState>[0]): ReadonlyMap<string, StockFields> =>
  ready(ctx).records;

async function context(local: LocalStore, shared: SharedStore) {
  const store = createStore({
    ...initialState('#/stock', { theme: 'system', units: 'metric' }),
    seed: { kind: 'ready' as const },
    storage: { kind: 'ready' as const },
  });
  const ctx = {
    get state() {
      return store.get();
    },
    store,
    data: stockData(local, shared),
  };
  stockState(ctx); // starts the read
  await new Promise((r) => setTimeout(r, 20));
  return ctx;
}

const AT = '2026-11-18T09:00:00.000Z';

test('a device without a space gets one on this device only, named Home, and it takes the stock', async () => {
  const shared = sharedStore();
  const ctx = await context(await openFresh(), shared);
  const { selection, writable } = ready(ctx);
  expect(writable).toBe(true);
  expect(selection.spaces).toMatchObject([{ name: 'Home', deviceOnly: true }]);
  expect(selection.entry).toBe(selection.spaces[0]?.id);
  expect((await shared.listSpaces())[0]?.storage).toEqual({ type: 'device', address: '' });
});

test('a change shows at once, is stored in the space behind it, and Undo leaves a removal marker', async () => {
  const shared = sharedStore();
  const ctx = { ...(await context(await openFresh(), shared)), now: () => AT };
  const entry = ready(ctx).selection.entry;
  const before = ctx.store.get().stockRev;
  const undo = changeStock(ctx, [{ id: 'gin', next: withPresent(recordsOf(ctx), 'gin', true) }]);
  expect(recordsOf(ctx).get('gin')).toMatchObject({ present: true });
  expect(ctx.store.get().stockRev).toBeGreaterThan(before);
  await stockWrites();
  // The collection keeps the ingredient as the key and only what is known of it as the value.
  expect(await storedStock(shared, entry, 'gin')).toEqual({
    key: 'gin',
    updatedAt: AT,
    value: { present: true },
  });
  changeStock(ctx, undo);
  await stockWrites();
  // A removal is kept as a marker, so a merge can tell it from "never entered".
  expect(await storedStock(shared, entry, 'gin')).toMatchObject({ key: 'gin', deleted: true });
  expect(recordsOf(ctx).has('gin')).toBe(false);
});

test('toggling off writes present false and keeps the other fields, also those of another app', async () => {
  const shared = sharedStore();
  const local = await openFresh();
  const first = await context(local, shared);
  const entry = ready(first).selection.entry;
  await seedStock(shared, entry, [
    { key: 'rum', value: { present: true, note: 'back bar', 'x-culina-amount': { value: 1 } } },
  ]);
  const ctx = { ...(await context(await openFresh(), shared)), now: () => AT };
  changeStock(ctx, [{ id: 'rum', next: withPresent(recordsOf(ctx), 'rum', false) }]);
  await stockWrites();
  expect(await storedStock(shared, entry, 'rum')).toEqual({
    key: 'rum',
    updatedAt: AT,
    value: { present: false, note: 'back bar', 'x-culina-amount': { value: 1 } },
  });
});

test('a record that is no stock value is not shown and stays in the collection', async () => {
  const shared = sharedStore();
  const first = await context(await openFresh(), shared);
  const entry = ready(first).selection.entry;
  await seedStock(shared, entry, [
    { key: 'gin', value: { present: 'yes' } },
    { key: 'rum', value: { present: true, bestBefore: 'soon' } },
    { key: 'lime-juice', value: { present: true } },
  ]);
  const ctx = await context(await openFresh(), shared);
  expect([...recordsOf(ctx).keys()]).toEqual(['lime-juice']);
  expect(await storedStock(shared, entry, 'gin')).toMatchObject({ value: { present: 'yes' } });
});

test('Undo of a removal brings the record back, newer than the marker', async () => {
  const shared = sharedStore();
  const first = await context(await openFresh(), shared);
  const entry = ready(first).selection.entry;
  await seedStock(shared, entry, [
    { key: 'rum', value: { present: true, openedOn: '2026-10-01' } },
  ]);
  let clock = AT;
  const ctx = { ...(await context(await openFresh(), shared)), now: () => clock };
  const undo = changeStock(ctx, [{ id: 'rum', next: null }]);
  expect(recordsOf(ctx).has('rum')).toBe(false);
  clock = '2026-11-18T09:00:05.000Z';
  changeStock(ctx, undo);
  await stockWrites();
  expect(recordsOf(ctx).get('rum')).toMatchObject({ present: true, openedOn: '2026-10-01' });
  const back = await storedStock(shared, entry, 'rum');
  expect(back?.value).toEqual({ present: true, openedOn: '2026-10-01' });
  // Both writes ran after the clock moved; the record follows the marker by the collection's stamp.
  expect((back?.updatedAt ?? '') >= '2026-11-18T09:00:05.000Z').toBe(true);
});

test('a mark is stamped after everything in the collection, even with a clock that is behind', async () => {
  const shared = sharedStore();
  const first = await context(await openFresh(), shared);
  const entry = ready(first).selection.entry;
  await seedStock(shared, entry, [
    { key: 'rum', updatedAt: '2027-01-01T00:00:00.000Z', value: { present: true } },
  ]);
  const ctx = { ...(await context(await openFresh(), shared)), now: () => AT };
  changeStock(ctx, [{ id: 'gin', next: withPresent(recordsOf(ctx), 'gin', true) }]);
  await stockWrites();
  const stamp = (await storedStock(shared, entry, 'gin'))?.updatedAt ?? '';
  expect(stamp > '2027-01-01T00:00:00.000Z').toBe(true);
});

test('a mark keeps a field another app wrote after the stock was read', async () => {
  const shared = sharedStore();
  const first = await context(await openFresh(), shared);
  const entry = ready(first).selection.entry;
  await seedStock(shared, entry, [{ key: 'rum', value: { present: true, note: 'back bar' } }]);
  const ctx = { ...(await context(await openFresh(), shared)), now: () => AT };
  // Another app adds its field and changes the note; this app has the older record in memory.
  await shared.changeRecords(entry, 'stock', (current) => ({
    ...current,
    records: current.records.map((r) => ({
      ...r,
      value: { present: true, note: 'cellar', 'x-culina-amount': { value: 2 } },
    })),
  }));
  changeStock(ctx, [{ id: 'rum', next: withPresent(recordsOf(ctx), 'rum', false) }]);
  await stockWrites();
  // What this app knows is what it showed; what it does not know stays as stored.
  expect((await storedStock(shared, entry, 'rum'))?.value).toEqual({
    present: false,
    note: 'back bar',
    'x-culina-amount': { value: 2 },
  });
});

test('a read asked for while a mark is being written shows the mark', async () => {
  const memory = sharedStore();
  // A database that takes its time to write, as a phone's does.
  const shared = {
    ...memory,
    changeRecords: async (...args: Parameters<typeof memory.changeRecords>) => {
      await new Promise((r) => setTimeout(r, 15));
      return memory.changeRecords(...args);
    },
  };
  const ctx = { ...(await context(await openFresh(), shared)), now: () => AT };
  changeStock(ctx, [{ id: 'gin', next: withPresent(recordsOf(ctx), 'gin', true) }]);
  // Records arrived by sync before the write of the mark reached the database.
  invalidateStock(ctx.store);
  stockState(ctx);
  await stockWrites();
  await new Promise((r) => setTimeout(r, 40));
  expect(recordsOf(ctx).get('gin')).toMatchObject({ present: true });
});

test('stock is not part of the export: it belongs to the space', async () => {
  const shared = sharedStore();
  const local = await openFresh();
  const ctx = await context(local, shared);
  changeStock(ctx, [{ id: 'gin', next: withPresent(recordsOf(ctx), 'gin', true) }]);
  await stockWrites();
  const file = await local.exchange.exportData({ exportedAt: '2026-11-17T09:00:00Z' });
  expect('stock' in file).toBe(false);
  // A replace import leaves the stock of the space alone.
  await local.exchange.importData(file, 'replace');
  expect(await storedStock(shared, ready(ctx).selection.entry, 'gin')).toMatchObject({
    value: { present: true },
  });
});

test('without a usable local store the stock is empty and cannot be changed', () => {
  const store = createStore({
    ...initialState('#/stock', { theme: 'system', units: 'metric' }),
    seed: { kind: 'ready' as const },
    storage: { kind: 'error' as const, error: 'unavailable' as const, reason: 'x' },
  });
  const ctx = { state: store.get(), store, data: stockData(null, sharedStore()) };
  expect(ready(ctx)).toMatchObject({ writable: false });
  expect(changeStock(ctx, [{ id: 'gin', next: { ingredientId: 'gin', present: true } }])).toEqual(
    [],
  );
});

test('the most used ingredients named for the empty screen exist in the seed', () => {
  const model = seedModel();
  for (const id of COMMON_STOCK) expect(model.tree.byId.has(id), id).toBe(true);
});

/**
 * A store whose writes take their time to finish, like IndexedDB on a slow disk. A write is durable
 * from the moment its transaction is created: a page that unloads then cannot take it back, but a
 * write that has not been started yet is lost. `release()` lets the held writes finish.
 */
function slowCommit(inner: SharedStore) {
  let gate: Promise<void> = Promise.resolve();
  let open = (): void => undefined;
  let started = 0;
  const store: SharedStore = {
    ...inner,
    changeRecords: (space, name, fn) => {
      started += 1;
      const done = inner.changeRecords(space, name, fn);
      return gate.then(() => done);
    },
  };
  return {
    store,
    hold() {
      gate = new Promise<void>((resolve) => (open = resolve));
    },
    release: () => open(),
    started: () => started,
  };
}

test('a mark, its Undo and a new mark are all in the store at once, so a reload right after keeps the mark', async () => {
  const slow = slowCommit(sharedStore());
  const ctx = { ...(await context(await openFresh(), slow.store)), now: () => AT };
  const entry = ready(ctx).selection.entry;
  const mark = () =>
    changeStock(ctx, [{ id: 'gin', next: withPresent(ready(ctx).entryRecords, 'gin', true) }]);
  const undo = mark();
  await stockWrites();
  slow.hold();
  changeStock(ctx, undo);
  mark();
  // The page reloads a moment later: what the store has been asked to do by then is what survives.
  await new Promise((r) => setTimeout(r, 0));
  expect(slow.started()).toBe(3);
  expect(await storedStock(slow.store, entry, 'gin')).toMatchObject({
    key: 'gin',
    value: { present: true },
  });
  slow.release();
  await stockWrites();
  expect(await storedStock(slow.store, entry, 'gin')).toMatchObject({ value: { present: true } });
});

test('control: a mark and its Undo, still held, end as a removal in the order they were made', async () => {
  const slow = slowCommit(sharedStore());
  const ctx = { ...(await context(await openFresh(), slow.store)), now: () => AT };
  const entry = ready(ctx).selection.entry;
  slow.hold();
  const undo = changeStock(ctx, [
    { id: 'gin', next: withPresent(ready(ctx).entryRecords, 'gin', true) },
  ]);
  changeStock(ctx, undo);
  slow.release();
  await stockWrites();
  expect(await storedStock(slow.store, entry, 'gin')).toMatchObject({ key: 'gin', deleted: true });
});
