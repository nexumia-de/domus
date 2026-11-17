import { expect, test } from 'vitest';
import { initialState } from '../src/app-state';
import { type AppData } from '../src/data';
import { COMMON_STOCK } from '../src/screens/stock/common';
import { createStore } from '../src/state';
import { changeStock, stockState, stockWrites, withPresent } from '../src/stock/state';
import { type LocalStore, type Stock } from '../src/store';
import { seedModel } from './browse-fixture';
import { openFresh } from './helpers';

function recordsOf(ctx: Parameters<typeof stockState>[0]): ReadonlyMap<string, Stock> {
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

test('a change shows at once, is stored behind it, and Undo restores the old record', async () => {
  const local = await openFresh();
  const ctx = await context(local);
  const state = () => ({ records: recordsOf(ctx) });
  const before = ctx.store.get().stockRev;
  const undo = changeStock(ctx, [{ id: 'gin', next: withPresent(state().records, 'gin', true) }]);
  expect(state().records.get('gin')).toMatchObject({ present: true });
  expect(ctx.store.get().stockRev).toBeGreaterThan(before);
  await stockWrites();
  expect(await local.stock.get('gin')).toMatchObject({ present: true });
  changeStock(ctx, undo);
  await stockWrites();
  expect(await local.stock.get('gin')).toBeUndefined();
  expect(state().records.has('gin')).toBe(false);
});

test('toggling off writes present false and keeps the other fields of the record', async () => {
  const local = await openFresh();
  await local.stock.put({ ingredientId: 'rum', present: true, note: 'back bar' });
  const ctx = await context(local);
  const records = recordsOf(ctx);
  changeStock(ctx, [{ id: 'rum', next: withPresent(records, 'rum', false) }]);
  await stockWrites();
  expect(await local.stock.get('rum')).toEqual({
    ingredientId: 'rum',
    present: false,
    note: 'back bar',
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
