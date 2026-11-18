/* eslint-disable @typescript-eslint/no-non-null-assertion -- fixtures are known */
// Batches of prepared ingredients (#101): the dates on the stock record, where
// each stands with today passed in, and the list of those near their date.
import { ROOT_TEMPLATES } from '@mixtura/engine';
import { describe, expect, test } from 'vitest';
import { buildModel } from '../src/screens/browse/model';
import type { Ingredient, SpecData, Template } from '../src/screens/browse/types';
import {
  addBatch,
  batchDates,
  batchesOf,
  madeBatch,
  nearDate,
  removeBatch,
  usedUpNewest,
  withBatchDates,
} from '../src/stock/batches';
import type { StockRecords } from '../src/stock/state';
import type { StockFields } from '../src/store';
import { fixtureIngredients } from './browse-fixture';
import { statusText } from '../src/screens/stock/batch-text';

const recipe = (id: string, ingredientId: string): SpecData => ({
  id,
  lineageId: id,
  version: 1,
  name: `${id} recipe`,
  status: 'draft',
  lines: [{ ingredientId, amount: 100, unit: 'ml' }],
});
const prepared = (id: string, extra: Partial<Ingredient>): Ingredient => ({
  id,
  name: `${id} prepared`,
  level: 'product',
  parentId: 'syrups',
  prepared: { specId: `u-${id}`, yield: { amount: 100, unit: 'ml' } },
  ...extra,
});
const built = buildModel({
  ingredients: [
    ...fixtureIngredients,
    prepared('mine', { shelfLifeDays: 14 }),
    prepared('short', { shelfLifeDays: 3 }),
    prepared('none', {}),
  ],
  templates: (ROOT_TEMPLATES as Template[]).map((value) => ({ value, origin: 'seed' as const })),
  specs: [recipe('u-mine', 'simple'), recipe('u-short', 'simple'), recipe('u-none', 'simple')].map(
    (value) => ({ value, origin: 'user' as const }),
  ),
  vocabulary: { methods: [], glasses: [] },
  seedVersion: 'test',
});
if (!built.ok) throw new Error(built.reason);
const { tree, preparedSpecs } = built.model;

const stock = (
  id: string,
  openedOn?: string,
  moreBatches?: string[],
  present = true,
): StockFields => ({
  ingredientId: id,
  present,
  ...(openedOn && { openedOn }),
  ...(moreBatches && { moreBatches }),
});

describe('the dates on the record', () => {
  test('newest first, each once, and none while not at hand', () => {
    expect(
      batchDates(stock('mine', '2026-11-10', ['2026-11-01', '2026-11-10', '2026-11-05'])),
    ).toEqual(['2026-11-10', '2026-11-05', '2026-11-01']);
    expect(batchDates(stock('mine', '2026-11-10', undefined, false))).toEqual([]);
    expect(batchDates(stock('mine'))).toEqual([]);
    expect(batchDates(undefined)).toEqual([]);
  });

  test('a record from before batches reads as one batch', () => {
    expect(batchDates(stock('mine', '2026-11-10'))).toEqual(['2026-11-10']);
  });

  test('adding keeps the newest in openedOn and the others in moreBatches', () => {
    const one = addBatch(stock('mine', '2026-11-10'), '2026-11-15');
    expect(one).toEqual(stock('mine', '2026-11-15', ['2026-11-10']));
    const older = addBatch(one, '2026-11-01');
    expect(older).toEqual(stock('mine', '2026-11-15', ['2026-11-10', '2026-11-01']));
  });

  test('adding to a record that was not at hand starts again, and keeps its note', () => {
    const out = { ...stock('mine', '2026-10-01', ['2026-09-01'], false), note: 'for the bar' };
    expect(addBatch(out, '2026-11-17')).toEqual({
      ingredientId: 'mine',
      present: true,
      openedOn: '2026-11-17',
      note: 'for the bar',
    });
  });

  test('removing promotes the next newest, and the last one leaves it not at hand', () => {
    const two = stock('mine', '2026-11-15', ['2026-11-10']);
    expect(removeBatch(two, '2026-11-15')).toEqual(stock('mine', '2026-11-10'));
    expect(removeBatch(two, '2026-11-10')).toEqual(stock('mine', '2026-11-15'));
    expect(removeBatch(stock('mine', '2026-11-10'), '2026-11-10')).toEqual(
      stock('mine', undefined, undefined, false),
    );
  });

  test('withBatchDates drops the old fields and a repeated date', () => {
    expect(
      withBatchDates(stock('mine', '2026-11-01', ['2026-10-01']), ['2026-11-02', '2026-11-02']),
    ).toEqual(stock('mine', '2026-11-02'));
  });
});

describe('where each batch stands', () => {
  const at = (today: string, record: StockFields = stock('mine', '2026-11-01', ['2026-11-10'])) =>
    batchesOf(tree, preparedSpecs, 'mine', record, today);

  test('each batch has its own date, use-by and state, with today passed in', () => {
    const [a, b] = at('2026-11-14')!;
    expect(a).toMatchObject({
      madeOn: '2026-11-10',
      useBy: '2026-11-24',
      status: 'fresh',
      daysLeft: 10,
    });
    expect(b).toMatchObject({
      madeOn: '2026-11-01',
      useBy: '2026-11-15',
      status: 'use-soon',
      daysLeft: 1,
    });
    expect(at('2026-11-16')[1]).toMatchObject({ status: 'past', daysLeft: -1 });
    expect(statusText(at('2026-11-16')[1]!)).toContain('Past the date you set by 1 day');
  });

  test('without a shelf life the state is unknown, a date that is not real is invalid', () => {
    expect(
      batchesOf(tree, preparedSpecs, 'none', stock('none', '2026-11-01'), '2026-11-17')[0],
    ).toMatchObject({
      status: 'unknown',
    });
    expect(
      batchesOf(tree, preparedSpecs, 'mine', stock('mine', '2026-02-31'), '2026-11-17')[0]?.status,
    ).toBe('invalid');
  });
});

describe('batches near their date', () => {
  const records: StockRecords = new Map([
    ['mine', stock('mine', '2026-11-10', ['2026-11-01'])],
    ['short', stock('short', '2026-11-13')],
    ['none', stock('none', '2026-10-01')],
    ['simple', stock('simple', '2026-01-01')],
  ]);

  test('only prepared ingredients with a shelf life, use soon or past, the most urgent first', () => {
    const list = nearDate(tree, preparedSpecs, records, '2026-11-15');
    expect(list.map((e) => e.id)).toEqual(['mine', 'short']);
    expect(list[0]).toMatchObject({ total: 2 });
    expect(list[0]!.batches.map((b) => [b.madeOn, b.status])).toEqual([['2026-11-01', 'use-soon']]);
    expect(list[1]!.batches[0]).toMatchObject({ status: 'use-soon', daysLeft: 1 });
  });

  test('nothing when all are fresh, out, or have no date', () => {
    expect(nearDate(tree, preparedSpecs, records, '2026-11-11')).toEqual([]);
    const out: StockRecords = new Map([['short', stock('short', '2026-11-01', undefined, false)]]);
    expect(nearDate(tree, preparedSpecs, out, '2026-11-30')).toEqual([]);
  });

  test('the date moves the list: the same records on another day', () => {
    expect(nearDate(tree, preparedSpecs, records, '2026-11-13').map((e) => e.id)).toEqual(['mine']);
    expect(nearDate(tree, preparedSpecs, records, '2026-11-18')[0]!.batches[0]).toMatchObject({
      status: 'past',
    });
  });
});

describe('the spec screen: I made this and Used up', () => {
  test('I made this adds a batch, keeps the previous one, and says no to a day already there', () => {
    const first = madeBatch(undefined, 'mine', '2026-11-10')!;
    expect(first).toEqual(stock('mine', '2026-11-10'));
    const second = madeBatch(first, 'mine', '2026-11-15')!;
    expect(second).toEqual(stock('mine', '2026-11-15', ['2026-11-10']));
    expect(madeBatch(second, 'mine', '2026-11-10')).toBeNull();
  });

  test('Used up uses up the newest and the next one is shown; the last leaves nothing behind', () => {
    const two = stock('mine', '2026-11-15', ['2026-11-10']);
    const one = usedUpNewest(two, 'mine');
    expect(one).toEqual(stock('mine', '2026-11-10'));
    expect(usedUpNewest(one, 'mine')).toEqual(stock('mine', undefined, undefined, false));
    expect(usedUpNewest(undefined, 'mine')).toEqual(stock('mine', undefined, undefined, false));
  });

  test('no stale date comes back after the last batch was used up', () => {
    const out = usedUpNewest(stock('mine', '2026-11-15', ['2026-11-10']), 'mine');
    const none = usedUpNewest(out, 'mine');
    expect(madeBatch(none, 'mine', '2026-11-20')).toEqual(stock('mine', '2026-11-20'));
  });

  test('a note and the best-before date stay through every transition', () => {
    const rec = {
      ...stock('mine', '2026-11-15', ['2026-11-10']),
      note: 'n',
      bestBefore: '2026-12-01',
    };
    expect(usedUpNewest(rec, 'mine')).toMatchObject({ note: 'n', bestBefore: '2026-12-01' });
    expect(madeBatch(rec, 'mine', '2026-11-20')).toMatchObject({
      note: 'n',
      bestBefore: '2026-12-01',
    });
  });
});
