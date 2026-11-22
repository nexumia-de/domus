// The boundary between Culina's stock items and the records of the shared collection `stock`
// (src/shared-stock/value.ts), both ways, and the pure decisions of src/shared-stock/edits.ts.
// Pure functions on plain values: what this does not prove is anything about a store or a cycle.
import { describe, expect, test } from 'vitest';
import {
  addEdit,
  removeEdit,
  restoreEdit,
  saveEdit,
  tickEdit,
  untickEdit,
  type SyncRecord,
} from '../src/shared-stock/edits';
import {
  detailsOf,
  isStockValue,
  itemId,
  itemsOf,
  placeOf,
  valueWith,
} from '../src/shared-stock/value';

const CARROT = { kind: 'ingredient', id: 'carrot' } as const;
const rec = (key: string, value: unknown): SyncRecord => ({
  key,
  updatedAt: '2026-11-18T08:00:00.000Z',
  value,
});
const putOf = (decision: { edit: { put?: { key: string; value: unknown }[] } }) =>
  decision.edit.put?.[0]?.value;

describe('reading a record', () => {
  test('the shared names become the item fields: openedOn is preparedOn, bestBefore is useBy', () => {
    const value = {
      present: true,
      openedOn: '2026-11-16',
      bestBefore: '2026-11-20',
      note: 'jar',
      amount: { value: 400, unit: 'g' },
      state: 'prepared',
      storage: 'fridge',
      always: true,
    };
    expect(itemsOf('carrot', CARROT, value)).toEqual([
      {
        id: 'carrot',
        ref: CARROT,
        preparedOn: '2026-11-16',
        useBy: '2026-11-20',
        note: 'jar',
        amount: { value: 400, unit: 'g' },
        state: 'prepared',
        storage: 'fridge',
        always: true,
      },
    ]);
  });

  test('present false, no present, and a value that is no object show nothing', () => {
    expect(itemsOf('carrot', CARROT, { present: false, note: 'x' })).toEqual([]);
    expect(itemsOf('carrot', CARROT, { note: 'x' })).toEqual([]);
    expect(itemsOf('carrot', CARROT, 'present')).toEqual([]);
    expect(isStockValue({ present: 'yes' })).toBe(false);
  });

  test('batches are further items with ids key~n; a field that does not fit is not shown', () => {
    const value = {
      present: true,
      openedOn: '2026-11-16',
      batches: [{ openedOn: '2026-11-18', storage: 'freezer' }, 'junk', { bestBefore: '17.11.' }],
      moreBatches: ['2026-11-10'],
    };
    expect(
      itemsOf('u-broth', { kind: 'component', id: 'u-broth' }, value).map((i) => i.id),
    ).toEqual(['u-broth', 'u-broth~1', 'u-broth~2']);
    expect(detailsOf(value)).toEqual([
      { preparedOn: '2026-11-16' },
      { preparedOn: '2026-11-18', storage: 'freezer' },
      {},
    ]);
    expect(placeOf(itemId('u-broth', 2))).toEqual({ key: 'u-broth', index: 2 });
    expect(placeOf('fdc-123')).toEqual({ key: 'fdc-123', index: 0 });
  });
});

describe('writing a record', () => {
  test('the item fields become the shared names, and fields of other apps stay', () => {
    const stored = { present: false, moreBatches: ['2026-11-01'], 'x-emptio': { shop: 'Market' } };
    expect(
      valueWith(stored, [
        {
          detail: {
            preparedOn: '2026-11-16',
            useBy: '2026-11-20',
            amount: { value: 2, unit: 'kg' },
          },
        },
        { detail: { state: 'cooked' } },
      ]),
    ).toEqual({
      present: true,
      moreBatches: ['2026-11-01'],
      'x-emptio': { shop: 'Market' },
      openedOn: '2026-11-16',
      bestBefore: '2026-11-20',
      amount: { value: 2, unit: 'kg' },
      batches: [{ state: 'cooked' }],
    });
  });

  test('no items: present false, Culina detail and batches gone, other fields kept', () => {
    const stored = {
      present: true,
      always: true,
      note: 'n',
      openedOn: '2026-11-16',
      batches: [{ state: 'raw' }],
      moreBatches: ['2026-11-01'],
    };
    expect(valueWith(stored, [])).toEqual({ present: false, moreBatches: ['2026-11-01'] });
  });

  test('read then write gives the same value (the round trip of a full record)', () => {
    const value = {
      present: true,
      amount: { value: 1, unit: 'l' },
      openedOn: '2026-11-10',
      bestBefore: '2026-11-12',
      batches: [{ openedOn: '2026-11-11', 'x-tag': 1 }],
      'x-other': true,
    };
    const items = detailsOf(value).map((detail, from) => ({ detail, from }));
    expect(valueWith(value, items)).toEqual(value);
  });
});

describe('the decisions', () => {
  test('tick writes present with nothing else; on a present record it changes nothing', () => {
    expect(putOf(tickEdit([], 'carrot', false))).toEqual({ present: true });
    expect(putOf(tickEdit([], 'carrot', true))).toEqual({ present: true, always: true });
    expect(tickEdit([rec('carrot', { present: true })], 'carrot', false).edit).toEqual({});
    // An earlier "not there" of another app keeps that app's fields.
    expect(putOf(tickEdit([rec('carrot', { present: false, 'x-a': 1 })], 'carrot', false))).toEqual(
      { present: true, 'x-a': 1 },
    );
  });

  test('untick of something not there is missing; Undo restores Culina fields over current others', () => {
    expect(untickEdit([], 'carrot')).toMatchObject({ missing: true });
    const before = { present: true, note: 'jar', 'x-a': 1 };
    const unticked = untickEdit([rec('carrot', before)], 'carrot');
    if ('missing' in unticked) throw new Error('missing');
    expect(putOf(unticked)).toEqual({ present: false, 'x-a': 1 });
    // Meanwhile another app changed its field: Undo keeps that change.
    const now = [rec('carrot', { present: false, 'x-a': 2 })];
    expect(putOf(restoreEdit(now, unticked.outcome))).toEqual({
      present: true,
      note: 'jar',
      'x-a': 2,
    });
    // Undo of something that had no record leaves it "not there", not removed.
    expect(
      putOf(restoreEdit([rec('carrot', { present: true })], { key: 'carrot', before: undefined })),
    ).toEqual({ present: false });
  });

  test('add, save and remove of batches keep the other batches and their foreign fields', () => {
    const value = {
      present: true,
      openedOn: '2026-11-10',
      batches: [{ openedOn: '2026-11-12', 'x-b': 1 }],
    };
    const added = addEdit([rec('u-s', value)], 'u-s', { preparedOn: '2026-11-14' });
    expect('missing' in added ? undefined : added.outcome).toBe('u-s~2');
    expect(putOf(added)).toMatchObject({
      batches: [{ openedOn: '2026-11-12', 'x-b': 1 }, { openedOn: '2026-11-14' }],
    });
    expect(putOf(saveEdit([rec('u-s', value)], 'u-s~1', { preparedOn: '2026-11-13' }))).toEqual({
      present: true,
      openedOn: '2026-11-10',
      batches: [{ openedOn: '2026-11-13', 'x-b': 1 }],
    });
    expect(saveEdit([rec('u-s', value)], 'u-s~5', {})).toMatchObject({ missing: true });
    // Removing the first item moves the batch up, with its own foreign field.
    expect(putOf(removeEdit([rec('u-s', value)], 'u-s'))).toEqual({
      present: true,
      openedOn: '2026-11-12',
      'x-b': 1,
    });
  });

  test('a change is worked out from the records given, not from an earlier read', () => {
    // The screen read one carrot item. Since then another device added a batch and another app a
    // field. Saving the first item keeps both; Culina's fields of that item are the form's.
    const now = [
      rec('carrot', { present: true, note: 'old', batches: [{ note: 'second' }], 'x-c': 3 }),
    ];
    expect(putOf(saveEdit(now, 'carrot', { amount: { value: 3, unit: 'count' } }))).toEqual({
      present: true,
      amount: { value: 3, unit: 'count' },
      batches: [{ note: 'second' }],
      'x-c': 3,
    });
  });
});
