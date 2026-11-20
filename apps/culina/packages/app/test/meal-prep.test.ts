// Meal prep (docs/behaviour.md, "Keeps and the stock"): a component says how long it keeps per
// storage place, a stock item says where it lies, and the stock derives the use-by date from both.
// The store is the in-memory one of the other notebook tests, not a browser's.
import { beforeEach, expect, test } from 'vitest';
import {
  formFromRecord,
  formToRecord,
  newComponentForm,
  problemsOf,
  type ComponentForm,
  type KeepForm,
} from '../src/editor/component-form';
import { saveRecord, saveStockItem, startNotebook } from '../src/notebook';
import type { ComponentRecord, StockRecord } from '../src/records';
import { shelfLifeOf, stockLookup } from '../src/screens/stock/lookup';
import { applyForm, formOf } from '../src/stock/form';
import { stockRows } from '../src/stock/rows';
import { must } from './must';
import { freshFactory } from './store-helpers';

const NOW = '2026-11-20T08:00:00.000Z';
const ing = (id: string) => ({ kind: 'ingredient' as const, id });
const SAUCE: ComponentRecord = {
  id: 'u-sauce',
  name: 'Tomato sauce',
  lines: [{ ref: ing('tomato'), amount: { value: 800, unit: 'g' } }],
  keeps: [
    { storage: 'fridge', days: 3, source: 'user', note: 'airtight' },
    { storage: 'freezer', days: 90, source: 'user' },
  ],
  version: { family: 'u-sauce', date: '2026-11-20' },
};
const keep = (over: Partial<KeepForm>): KeepForm => ({
  storage: 'fridge',
  days: '3',
  note: '',
  source: 'user',
  ...over,
});
const withKeeps = (keeps: KeepForm[]): ComponentForm => ({
  ...newComponentForm('u-1'),
  name: 'Sauce',
  lines: [{ ref: ing('tomato'), amount: '800', unit: 'g' }],
  keeps,
});

beforeEach(async () => {
  await startNotebook({ indexedDB: freshFactory(), now: () => NOW });
});

test('the editor keeps how long a component keeps, with the source of each entry', () => {
  const built = formToRecord(formFromRecord(SAUCE), '2026-11-20');
  if (!built.ok) throw new Error(JSON.stringify(built.problems));
  expect(built.record.keeps).toEqual(SAUCE.keeps);
});

test('a component without such entries stores none, and an older draft still saves', () => {
  const built = formToRecord(withKeeps([]), '2026-11-20');
  expect(built.ok && 'keeps' in built.record).toBe(false);
  const { keeps: _keeps, ...older } = withKeeps([]);
  void _keeps;
  expect(problemsOf(older)).toEqual([]);
});

test('an entry is stored with whole days, its place and the note', () => {
  const built = formToRecord(
    withKeeps([
      keep({ days: ' 4 ', note: ' in portions ' }),
      keep({ storage: 'freezer', days: '60' }),
    ]),
    '2026-11-20',
  );
  if (!built.ok) throw new Error(JSON.stringify(built.problems));
  expect(built.record.keeps).toEqual([
    { storage: 'fridge', days: 4, source: 'user', note: 'in portions' },
    { storage: 'freezer', days: 60, source: 'user' },
  ]);
});

test('days that are no whole number, and a place given twice, are named at their row', () => {
  expect(problemsOf(withKeeps([keep({ days: '' })]))).toEqual([{ code: 'keep', index: 0 }]);
  expect(problemsOf(withKeeps([keep({ days: '2.5' })]))).toEqual([{ code: 'keep', index: 0 }]);
  expect(problemsOf(withKeeps([keep({ days: 'a week' })]))).toEqual([{ code: 'keep', index: 0 }]);
  expect(problemsOf(withKeeps([keep({}), keep({ days: '5' })]))).toEqual([
    { code: 'keep', index: 1 },
  ]);
  expect(problemsOf(withKeeps([keep({ days: '0' })]))).toEqual([]);
});

test('the stock form keeps where an item lies and clears it again', () => {
  const item: StockRecord = { id: 's', ref: { kind: 'component', id: 'u-sauce' } };
  const placed = applyForm(item, { ...formOf(item), storage: 'freezer' });
  if (!placed.ok) throw new Error('form');
  expect(placed.record).toEqual({ ...item, storage: 'freezer' });
  expect(formOf(placed.record).storage).toBe('freezer');
  const cleared = applyForm(placed.record, { ...formOf(placed.record), storage: '' });
  expect(cleared.ok && cleared.record).toEqual(item);
});

test('a made component in stock gets its use-by date from where it lies', async () => {
  expect((await saveRecord('components', SAUCE)).ok).toBe(true);
  expect(shelfLifeOf({ kind: 'component', id: 'u-sauce' })).toEqual([
    { storage: 'fridge', days: 3 },
    { storage: 'freezer', days: 90 },
  ]);
  const made: StockRecord = {
    id: 'u-batch',
    ref: { kind: 'component', id: 'u-sauce' },
    state: 'prepared',
    preparedOn: '2026-11-20',
  };
  expect((await saveStockItem(made)).ok).toBe(true);
  // Without a place two shelf lives apply, so no date is derived.
  const open = must(stockRows([made], '2026-11-22', stockLookup)[0]);
  expect([open.daysLeft, open.remaining]).toEqual([undefined, undefined]);
  // In the fridge it keeps 3 days from the 20th: one day left on the 22nd.
  const inFridge = must(stockRows([{ ...made, storage: 'fridge' }], '2026-11-22', stockLookup)[0]);
  expect(inFridge.daysLeft).toBe(1);
  expect(inFridge.remaining).toBeDefined();
  // In the freezer 90 days: until 2027-02-18, 88 days from the 22nd.
  const frozen = must(stockRows([{ ...made, storage: 'freezer' }], '2026-11-22', stockLookup)[0]);
  expect(frozen.daysLeft).toBe(88);
  // A component that says nothing about keeping gives no date.
  expect(shelfLifeOf({ kind: 'component', id: 'u-nothing' })).toEqual([]);
});
