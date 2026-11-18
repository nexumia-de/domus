// Stock in the notebook: ticking writes presence only, the store keeps materia's sync rows, fields of
// another app survive an edit, unticking is undone, presence-only items export and read back.
import {
  buildExport,
  parseExport,
  serializeExport,
  stockExpiry,
  validateModel,
} from '@culina/engine';
import type { RecordSets } from '@culina/engine';
import { beforeEach, expect, test } from 'vitest';
import { recordValidators } from '../src/exchange/validators';
import {
  addExamples,
  allVersions,
  getStockItem,
  listComponents,
  listIngredients,
  listStock,
  removeStockItem,
  restoreStock,
  saveStockItem,
  startNotebook,
  stockName,
  stockOf,
  tick,
  untick,
} from '../src/notebook';
import { state } from '../src/notebook/state';
import type { StockRecord } from '../src/records';
import { applyForm, formOf } from '../src/stock/form';
import { candidates } from '../src/stock/candidates';
import { remainingText, stockRows } from '../src/stock/rows';
import { freshFactory } from './store-helpers';
import { must } from './must';

const NOW = '2026-11-18T08:00:00.000Z';
const CARROT = { kind: 'ingredient', id: 'carrot' } as const;

beforeEach(async () => {
  await startNotebook({ indexedDB: freshFactory(), now: () => NOW });
  await addExamples();
});

const lookup = {
  name: (ref: { kind: string; id: string }) => stockName({ ref: ref as never }),
  shelfLife: () => [],
};

test('ticking stores an item with nothing but id and ref, as a sync row', async () => {
  const done = await tick(CARROT);
  expect(done.ok).toBe(true);
  expect(listStock()).toHaveLength(1);
  const item = must(listStock()[0]);
  expect(Object.keys(item).sort()).toEqual(['id', 'ref']);
  const rows = must(await must(state.store).listRows('stock'));
  expect(rows.ok && rows.rows[0]?.key).toBe(item.id);
  expect(rows.ok && rows.rows[0]?.value).toEqual(item);
  expect(rows.ok && rows.rows[0]?.updatedAt).toMatch(/Z$/);
});

test('ticking what is already there changes nothing', async () => {
  await tick(CARROT);
  await tick(CARROT);
  expect(listStock()).toHaveLength(1);
});

test('a prepared component can be stock, and its name is the head of its family', async () => {
  const component = must(listComponents()[0]);
  await tick({ kind: 'component', id: component.id });
  expect(stockName(must(listStock()[0]))).toBe(component.name);
  expect(stockOf({ kind: 'component', id: component.id })).toHaveLength(1);
});

test('unticking removes the item and Undo puts the same record back', async () => {
  await tick(CARROT, true);
  const before = [...listStock()];
  const done = await untick(CARROT);
  expect(done.ok && done.removed).toEqual(before);
  expect(listStock()).toEqual([]);
  expect(await restoreStock(before)).toEqual({ ok: true });
  expect(listStock()).toEqual(before);
});

test('removing an item that is not there is quiet', async () => {
  const done = await removeStockItem('u-none');
  expect(done.ok && done.removed).toEqual([]);
});

test('a field of another app survives an edit in Culina', async () => {
  const foreign: StockRecord = {
    id: 'u-foreign',
    ref: CARROT,
    'x-emptio': { boughtOn: '2026-11-10', shop: 'Market' },
  };
  expect((await saveStockItem(foreign)).ok).toBe(true);
  const stored = must(getStockItem('u-foreign'));
  const form = { ...formOf(stored), amount: '400', unit: 'g' as const, always: true, note: 'jar' };
  const applied = applyForm(stored, form);
  if (!applied.ok) throw new Error('form');
  expect((await saveStockItem(applied.record)).ok).toBe(true);
  const fresh = must(await must(state.store).get('stock', 'u-foreign'));
  expect(fresh.ok && fresh.record).toEqual({
    ...foreign,
    amount: { value: 400, unit: 'g' },
    always: true,
    note: 'jar',
  });
  // Clearing the detail again leaves the other app's field alone.
  const cleared = applyForm(applied.record, { ...form, amount: '', always: false, note: '' });
  if (!cleared.ok) throw new Error('form');
  expect(cleared.record).toEqual(foreign);
});

test('the form refuses an amount that is not a number and clears one that is empty', () => {
  const item: StockRecord = { id: 's', ref: CARROT, amount: { value: 3, unit: 'count' } };
  expect(applyForm(item, { ...formOf(item), amount: 'lots' })).toEqual({
    ok: false,
    field: 'amount',
  });
  const cleared = applyForm(item, { ...formOf(item), amount: '' });
  expect(cleared.ok && cleared.record).toEqual({ id: 's', ref: CARROT });
});

test('the rows: the nearest use-by first, then the ones without a date by name, remaining in words', () => {
  const items: StockRecord[] = [
    { id: 'a', ref: CARROT },
    { id: 'b', ref: { kind: 'ingredient', id: 'onion' }, useBy: '2026-11-20' },
    { id: 'c', ref: { kind: 'ingredient', id: 'flour' }, useBy: '2026-11-17' },
    { id: 'd', ref: { kind: 'ingredient', id: 'salt' }, useBy: '2026-11-18', always: true },
    {
      id: 'e',
      ref: { kind: 'ingredient', id: 'butter' },
      amount: { value: 250, unit: 'g' },
    },
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
  expect(must(rows.find((r) => r.id === 'a')).detail).toEqual([]);
  expect(remainingText({ status: 'fresh', daysLeft: 1 })).toBe('1 day left');
  const e = stockExpiry({ useBy: '2026-11-18' }, '2026-11-18');
  expect(e.ok && e.daysLeft).toBe(0);
});

test('an item whose ingredient is no longer in the notebook is still listed', () => {
  const rows = stockRows(
    [{ id: 'x', ref: { kind: 'ingredient', id: 'gone' } }],
    '2026-11-18',
    lookup,
  );
  expect(must(rows[0]).known).toBe(false);
});

test('the quick entry offers the notebook first, sorted by name, filtered by the search', () => {
  const all = candidates(listIngredients(), listComponents(), '');
  expect(all.length).toBe(listIngredients().length + listComponents().length);
  expect(all.map((c) => c.name)).toEqual(
    [...all.map((c) => c.name)].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })),
  );
  expect(
    candidates(listIngredients(), listComponents(), 'carr').every((c) => /carr/i.test(c.name)),
  ).toBe(true);
});

test('presence-only, always-there and detailed items round-trip through export and read', async () => {
  await tick(CARROT);
  await tick({ kind: 'ingredient', id: 'salt' }, true);
  await saveStockItem({
    id: 'u-full',
    ref: { kind: 'ingredient', id: 'butter' },
    amount: { value: 250, unit: 'g' },
    state: 'raw',
    preparedOn: '2026-11-16',
    useBy: '2026-11-25',
    'x-emptio': { shop: 'Market' },
  });
  const listed = must(await must(state.store).list('stock'));
  if (!listed.ok) throw new Error('list');
  const records: RecordSets = { stock: listed.records };
  const text = serializeExport(buildExport(records, NOW));
  const read = parseExport(text, recordValidators);
  if (!read.ok) throw new Error(read.error.code);
  expect(read.content.records.stock).toEqual(
    [...listed.records].sort((a, b) => (a.id < b.id ? -1 : 1)),
  );
});

test('stock with presence only has no finding from the cross-record validation', () => {
  const model = {
    ingredients: listIngredients(),
    components: allVersions('components'),
    stock: [{ id: 's', ref: CARROT }],
  } as never;
  expect(validateModel(model)).toEqual({ ok: true, findings: [] });
});
