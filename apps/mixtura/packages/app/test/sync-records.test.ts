import { expect, test } from 'vitest';
import type { Ingredient } from '../src/store';
import {
  entitiesToIngredients,
  entityRecords,
  recordsToRows,
  rowsToRecords,
} from '../src/sync/records';
import { user } from './helpers';
import { gone, instant, live, PLACE_ID } from './helpers/sync-client';

const custom = user.ingredients[0] as Ingredient;

test('rows and records round trip, tombstones and optional fields included', () => {
  const rows = [
    {
      ...live('lime-juice', 3),
      openedOn: '2026-11-01',
      moreBatches: ['2026-10-20'],
      bestBefore: '2026-12-01',
      note: 'half',
    },
    gone('mint', 4),
    live('gin', 5, false),
  ];
  const records = rowsToRecords(rows);
  expect(records[1]).toEqual({ key: 'mint', updatedAt: instant(4), deleted: true });
  expect(records[0]).toMatchObject({ key: 'lime-juice', updatedAt: instant(3) });
  expect(records[0]?.value).not.toHaveProperty('placeId');
  expect(recordsToRows(PLACE_ID, records)).toEqual(rows);
});

test('records of another place take the id of this place; a record without value is dropped', () => {
  const rows = recordsToRows(PLACE_ID, [
    { key: 'gin', updatedAt: instant(1), value: { present: true } },
    { key: 'broken', updatedAt: instant(1) },
  ]);
  expect(rows).toEqual([
    { present: true, placeId: PLACE_ID, ingredientId: 'gin', updatedAt: instant(1) },
  ]);
});

test('entities: only custom ingredients of live rows, stamped with the newest row', () => {
  const rows = [live(custom.id, 2), live('gin', 9)];
  const entities = entityRecords(rows, [custom, { id: 'gin', name: 'Gin' } as Ingredient]);
  expect(entities).toEqual([{ key: custom.id, updatedAt: instant(2), value: custom }]);
  expect(entityRecords([gone(custom.id, 5)], [custom])).toEqual([]);
  expect(entityRecords([live(custom.id, 2), live(custom.id, 7)], [custom])[0]?.updatedAt).toBe(
    instant(7),
  );
  expect(entitiesToIngredients(entities)).toEqual([custom]);
});
