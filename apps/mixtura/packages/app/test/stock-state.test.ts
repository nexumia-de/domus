import { expect, test } from 'vitest';
import { initialState } from '../src/app-state';
import { type AppData } from '../src/data';
import { COMMON_STOCK } from '../src/screens/stock/common';
import { createStore } from '../src/state';
import { changeStock, stockState, stockWrites, withPresent } from '../src/stock/state';
import { type LocalStore, type StockFields } from '../src/store';
import { seedModel } from './browse-fixture';
import { openFresh } from './helpers';

function recordsOf(ctx: Parameters<typeof stockState>[0]): ReadonlyMap<string, StockFields> {
  const s = stockState(ctx);
  if (s.kind !== 'ready') throw new Error('stock not loaded');
  return s.records;
}

async function context(local: LocalStore) {
  const store = createStore({
    ...initialState('#/stock', { theme: 'system', units: 'metric' }),
    seed: { kind: 'ready' as const },
    storage: { kind: 'ready' as const },
  });
  const data = { local: () => local } as unknown as AppData;
  const ctx = {
    get state() {
      return store.get();
    },
    store,
    data,
  };
  stockState(ctx); // starts the read
  await new Promise((r) => setTimeout(r, 20));
  return ctx;
}

const AT = '2026-11-18T09:00:00Z';
/** The stored record of an ingredient in the entry place, as the repository holds it. */
const stored = async (local: LocalStore, id: string) =>
  local.stock.get([(await local.placeSelection()).entry, id]);

test('a change shows at once, is stored behind it, and Undo restores the old record', async () => {
  const local = await openFresh();
  const ctx = { ...(await context(local)), now: () => AT };
  const state = () => ({ records: recordsOf(ctx) });
  const entry = (await local.placeSelection()).entry;
  const before = ctx.store.get().stockRev;
  const undo = changeStock(ctx, [{ id: 'gin', next: withPresent(state().records, 'gin', true) }]);
  expect(state().records.get('gin')).toMatchObject({ present: true });
  expect(ctx.store.get().stockRev).toBeGreaterThan(before);
  await stockWrites();
  expect(await stored(local, 'gin')).toEqual({
    placeId: entry,
    ingredientId: 'gin',
    updatedAt: AT,
    present: true,
  });
  changeStock(ctx, undo);
  await stockWrites();
  // A removal is kept as a tombstone, so a merge can tell it from "never entered".
  expect(await stored(local, 'gin')).toEqual({
    placeId: entry,
    ingredientId: 'gin',
    updatedAt: AT,
    deleted: true,
  });
  expect(state().records.has('gin')).toBe(false);
});

test('toggling off writes present false and keeps the other fields of the record', async () => {
  const local = await openFresh();
  const entry = (await local.placeSelection()).entry;
  await local.stock.put({
    placeId: entry,
    ingredientId: 'rum',
    updatedAt: '2026-11-01T00:00:00Z',
    present: true,
    note: 'back bar',
  });
  const ctx = { ...(await context(local)), now: () => AT };
  const records = recordsOf(ctx);
  changeStock(ctx, [{ id: 'rum', next: withPresent(records, 'rum', false) }]);
  await stockWrites();
  expect(await stored(local, 'rum')).toEqual({
    placeId: entry,
    ingredientId: 'rum',
    updatedAt: AT,
    present: false,
    note: 'back bar',
  });
});

test('Undo of a removal brings the record back, newer than the tombstone', async () => {
  const local = await openFresh();
  const entry = (await local.placeSelection()).entry;
  await local.stock.put({
    placeId: entry,
    ingredientId: 'rum',
    updatedAt: '2026-11-01T00:00:00Z',
    present: true,
    openedOn: '2026-10-01',
  });
  let clock = '2026-11-18T09:00:00Z';
  const ctx = { ...(await context(local)), now: () => clock };
  const undo = changeStock(ctx, [{ id: 'rum', next: null }]);
  expect(recordsOf(ctx).has('rum')).toBe(false);
  clock = '2026-11-18T09:00:05Z';
  changeStock(ctx, undo);
  await stockWrites();
  expect(recordsOf(ctx).get('rum')).toMatchObject({ present: true, openedOn: '2026-10-01' });
  expect(await stored(local, 'rum')).toMatchObject({
    updatedAt: '2026-11-18T09:00:05Z',
    present: true,
    openedOn: '2026-10-01',
  });
});

test('marked stock is part of the export and survives an import', async () => {
  const local = await openFresh();
  const ctx = await context(local);
  const records = recordsOf(ctx);
  changeStock(ctx, [
    { id: 'gin', next: withPresent(records, 'gin', true) },
    { id: 'lime-juice', next: withPresent(records, 'lime-juice', true) },
  ]);
  await stockWrites();
  const file = await local.exchange.exportData({ exportedAt: '2026-11-17T09:00:00Z' });
  expect(file.stock.map((s) => s.ingredientId)).toEqual(['gin', 'lime-juice']);
  const other = await openFresh();
  await other.exchange.importData(file, 'replace');
  expect((await other.stock.list()).map((s) => s.ingredientId).sort()).toEqual([
    'gin',
    'lime-juice',
  ]);
});

test('the most used ingredients named for the empty screen exist in the seed', () => {
  const model = seedModel();
  for (const id of COMMON_STOCK) expect(model.tree.byId.has(id), id).toBe(true);
});
