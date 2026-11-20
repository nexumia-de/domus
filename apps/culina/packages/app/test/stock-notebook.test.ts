// Stock in the notebook, written into the shared collection `stock` of a space: ticking writes
// presence only, unticking writes `present: false` and is undone, batches, fields of another app,
// records Culina does not know, which space is used, and the rows and form of the screens.
// What this does not prove: the shared database is the host's memory store (not IndexedDB), the
// clock is injected, and no cycle against a storage runs here (stock-sync.test.ts does that).
import { stockExpiry, validateModel } from '@culina/engine';
import { createMemoryStore, ensureSpace, localChange } from '@nexumia-de/hospes';
import { describe, expect, test } from 'vitest';
import {
  addStockItem,
  allVersions,
  chooseStockSpace,
  getStockItem,
  listComponents,
  listIngredients,
  listStock,
  removeStockItem,
  restoreStock,
  saveStockItem,
  stockName,
  stockOf,
  stockSpaces,
  tick,
  untick,
} from '../src/notebook';
import { state } from '../src/notebook/state';
import { SPACE_KEY } from '../src/prefs';
import type { StockRecord } from '../src/records';
import { applyForm, formOf } from '../src/stock/form';
import { candidates } from '../src/stock/candidates';
import { remainingText, stockRows } from '../src/stock/rows';
import { must } from './must';
import { liveStock, memoryPrefs, startWithStock } from './stock-helpers';

const CARROT = { kind: 'ingredient', id: 'carrot' } as const;
const usedId = (): string => must(stockSpaces().used).id;

const lookup = {
  name: (ref: { kind: string; id: string }) => stockName({ ref: ref as never }),
  shelfLife: () => [],
};

describe('ticking and unticking', () => {
  test('a device without a space gets one on this device only, and a tick writes presence only', async () => {
    const { shared } = await startWithStock();
    const spaces = await shared.listSpaces();
    expect(spaces.map((s) => [s.name, s.storage.type])).toEqual([['Home', 'device']]);
    expect((await tick(CARROT)).ok).toBe(true);
    expect(listStock()).toEqual([{ id: 'carrot', ref: CARROT }]);
    expect(await liveStock(shared, usedId())).toEqual({ carrot: { present: true } });
    // Culina's own database keeps no stock.
    const own = must(await must(state.store).listRows('stock'));
    expect(own.ok && own.rows).toEqual([]);
  });

  test('ticking what is already there changes nothing; always there is a field', async () => {
    const { shared } = await startWithStock();
    await tick(CARROT, true);
    await tick(CARROT);
    expect(listStock()).toHaveLength(1);
    expect(await liveStock(shared, usedId())).toEqual({ carrot: { present: true, always: true } });
  });

  test('a component is kept under its family id, whichever version was ticked', async () => {
    const { shared } = await startWithStock();
    const second = must(allVersions('components').find((c) => c.id === 'example-herb-oil-2'));
    await tick({ kind: 'component', id: second.id });
    expect(Object.keys(await liveStock(shared, usedId()))).toEqual([second.version.family]);
    expect(stockOf({ kind: 'component', id: second.id })).toHaveLength(1);
    expect(stockName(must(listStock()[0]))).toBe(second.name);
  });

  test('unticking writes present false and keeps the record; Undo puts the former value back', async () => {
    const { shared } = await startWithStock();
    await tick(CARROT, true);
    const done = await untick(CARROT);
    if (!done.ok) throw new Error('untick');
    expect(listStock()).toEqual([]);
    expect(await liveStock(shared, usedId())).toEqual({ carrot: { present: false } });
    expect(await restoreStock(done.removed)).toEqual({ ok: true });
    expect(await liveStock(shared, usedId())).toEqual({ carrot: { present: true, always: true } });
    expect(listStock()).toEqual([{ id: 'carrot', ref: CARROT, always: true }]);
  });

  test('removing an item that is not there says not-found', async () => {
    await startWithStock();
    expect(await removeStockItem('nothing')).toMatchObject({
      ok: false,
      error: { code: 'not-found' },
    });
  });
});

describe('batches and detail', () => {
  test('a made component adds a batch each time; each item is saved and removed on its own', async () => {
    const { shared } = await startWithStock();
    const ref = { kind: 'component', id: 'example-vegetable-stock' } as const;
    const first = await addStockItem(ref, { state: 'prepared', preparedOn: '2026-11-16' });
    const second = await addStockItem(ref, { state: 'prepared', preparedOn: '2026-11-18' });
    expect([first.ok && first.id, second.ok && second.id]).toEqual([
      'example-vegetable-stock',
      'example-vegetable-stock~1',
    ]);
    const item = must(getStockItem('example-vegetable-stock~1'));
    expect((await saveStockItem({ ...item, storage: 'freezer' })).ok).toBe(true);
    expect(await liveStock(shared, usedId())).toEqual({
      'example-vegetable-stock': {
        present: true,
        state: 'prepared',
        openedOn: '2026-11-16',
        batches: [{ state: 'prepared', openedOn: '2026-11-18', storage: 'freezer' }],
      },
    });
    const removed = await removeStockItem('example-vegetable-stock');
    expect(removed.ok).toBe(true);
    expect(listStock().map((i) => [i.id, i.preparedOn])).toEqual([
      ['example-vegetable-stock', '2026-11-18'],
    ]);
    if (removed.ok) await restoreStock(removed.removed);
    expect(listStock()).toHaveLength(2);
  });

  test('a field of another app survives a tick, an edit and an untick in Culina', async () => {
    const { shared } = await startWithStock();
    await localChange(
      shared,
      usedId(),
      'stock',
      () => '2026-11-18T07:00:00.000Z',
      () => ({
        put: [
          {
            key: 'carrot',
            value: { present: true, moreBatches: ['2026-11-01'], 'x-emptio': { shop: 'Market' } },
          },
        ],
      }),
    );
    await state.stockSpace?.load();
    const stored = must(getStockItem('carrot'));
    const form = {
      ...formOf(stored),
      amount: '400',
      unit: 'g' as const,
      always: true,
      note: 'jar',
    };
    const applied = applyForm(stored, form);
    if (!applied.ok) throw new Error('form');
    expect((await saveStockItem(applied.record)).ok).toBe(true);
    expect((await liveStock(shared, usedId())).carrot).toEqual({
      present: true,
      moreBatches: ['2026-11-01'],
      'x-emptio': { shop: 'Market' },
      amount: { value: 400, unit: 'g' },
      always: true,
      note: 'jar',
    });
    await untick(CARROT);
    expect((await liveStock(shared, usedId())).carrot).toEqual({
      present: false,
      moreBatches: ['2026-11-01'],
      'x-emptio': { shop: 'Market' },
    });
  });

  test('an edit is worked out from what is stored now: a batch written since the read survives', async () => {
    const { shared } = await startWithStock();
    await tick(CARROT);
    const shown = must(getStockItem('carrot'));
    // Another tab adds a batch after this screen read the item.
    await localChange(
      shared,
      usedId(),
      'stock',
      () => '2026-11-18T09:00:00.000Z',
      (records) => ({
        put: [
          {
            key: 'carrot',
            value: { ...(must(records[0]).value as object), batches: [{ note: 'tab' }] },
          },
        ],
      }),
    );
    expect((await saveStockItem({ ...shown, note: 'here' })).ok).toBe(true);
    expect((await liveStock(shared, usedId())).carrot).toEqual({
      present: true,
      note: 'here',
      batches: [{ note: 'tab' }],
    });
  });

  test('records Culina does not know, and values that are no stock values, are not shown and left untouched', async () => {
    const { shared } = await startWithStock();
    const others = {
      'mixtura-gin': { present: true, openedOn: '2026-11-01' },
      lemon: { amount: 3 },
    };
    await localChange(
      shared,
      usedId(),
      'stock',
      () => '2026-11-18T07:00:00.000Z',
      () => ({
        put: Object.entries(others).map(([key, value]) => ({ key, value })),
      }),
    );
    await state.stockSpace?.load();
    await tick(CARROT);
    await untick(CARROT);
    expect(listStock()).toEqual([]);
    const after = await liveStock(shared, usedId());
    expect(after['mixtura-gin']).toEqual(others['mixtura-gin']);
    expect(after.lemon).toEqual(others.lemon);
    const raw = await shared.readCollection(usedId(), 'stock');
    expect(raw.records.find((r) => r.key === 'lemon')?.updatedAt).toBe('2026-11-18T07:00:00.000Z');
  });
});

describe('which space is used', () => {
  test('the chosen space while it is there; otherwise the first shared one; the choice is kept', async () => {
    const shared = createMemoryStore();
    const [home] = await ensureSpace(shared, 'Home');
    const household = {
      id: 'h'.repeat(32),
      secret: 's',
      name: 'Flat',
      storage: { type: 'github', address: 'o/r' },
    };
    await shared.putSpace(household);
    const prefs = memoryPrefs();
    await startWithStock({ shared, prefs, examples: false });
    expect(stockSpaces().used?.name).toBe('Flat');
    await tick(CARROT);
    expect(Object.keys(await liveStock(shared, household.id))).toEqual(['carrot']);
    await chooseStockSpace(must(home).id);
    expect(prefs.getItem(SPACE_KEY)).toBe(must(home).id);
    expect(listStock()).toEqual([]);
    state.stockSpace?.stop();
  });

  test('a device-only space with stock is not hidden behind an empty shared one', async () => {
    // The notebook (with the carrot) is in Culina's own database before the stock is read.
    const { factory } = await startWithStock();
    const shared = createMemoryStore();
    const [home] = await ensureSpace(shared, 'Home');
    await localChange(
      shared,
      must(home).id,
      'stock',
      () => '2026-11-18T07:00:00.000Z',
      () => ({
        put: [{ key: 'carrot', value: { present: true } }],
      }),
    );
    await shared.putSpace({
      id: 'h'.repeat(32),
      secret: 's',
      storage: { type: 'github', address: 'o/r' },
    });
    await startWithStock({ shared, factory, examples: false });
    expect(stockSpaces().used?.name).toBe('Home');
    expect(listStock()).toEqual([{ id: 'carrot', ref: CARROT }]);
    state.stockSpace?.stop();
  });
});

describe('the screens read the items', () => {
  test('the form refuses an amount that is not a number and clears one that is empty', () => {
    const item: StockRecord = { id: 's', ref: CARROT, amount: { value: 3, unit: 'count' } };
    expect(applyForm(item, { ...formOf(item), amount: 'lots' })).toEqual({
      ok: false,
      field: 'amount',
    });
    const cleared = applyForm(item, { ...formOf(item), amount: '' });
    expect(cleared.ok && cleared.record).toEqual({ id: 's', ref: CARROT });
  });

  test('the rows: the nearest use-by first, then the ones without a date by name, remaining in words', async () => {
    await startWithStock();
    const items: StockRecord[] = [
      { id: 'a', ref: CARROT },
      { id: 'b', ref: { kind: 'ingredient', id: 'onion' }, useBy: '2026-11-20' },
      { id: 'c', ref: { kind: 'ingredient', id: 'flour' }, useBy: '2026-11-17' },
      { id: 'd', ref: { kind: 'ingredient', id: 'salt' }, useBy: '2026-11-18', always: true },
      { id: 'e', ref: { kind: 'ingredient', id: 'butter' }, amount: { value: 250, unit: 'g' } },
    ];
    const rows = stockRows(items, '2026-11-18', lookup);
    expect(rows.map((r) => r.id)).toEqual(['c', 'd', 'b', 'e', 'a']);
    expect(rows.map((r) => r.remaining)).toEqual([
      'past use by',
      'use by today',
      '2 days left',
      undefined,
      undefined,
    ]);
    expect(must(rows.find((r) => r.id === 'e')).detail).toEqual(['250 g']);
    expect(remainingText({ status: 'fresh', daysLeft: 1 })).toBe('1 day left');
    const e = stockExpiry({ useBy: '2026-11-18' }, '2026-11-18');
    expect(e.ok && e.daysLeft).toBe(0);
  });

  test('the quick entry offers the notebook first, sorted by name, filtered by the search', async () => {
    await startWithStock();
    const all = candidates(listIngredients(), listComponents(), '');
    expect(all.length).toBe(listIngredients().length + listComponents().length);
    expect(all.map((c) => c.name)).toEqual(
      [...all.map((c) => c.name)].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })),
    );
  });

  test('stock with presence only has no finding from the cross-record validation', async () => {
    await startWithStock();
    const model = {
      ingredients: listIngredients(),
      components: allVersions('components'),
      stock: [{ id: 'carrot', ref: CARROT }],
    } as never;
    expect(validateModel(model)).toEqual({ ok: true, findings: [] });
  });
});
