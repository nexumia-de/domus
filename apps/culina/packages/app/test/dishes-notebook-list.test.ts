// The Notebook's Dishes (issue 44 point 3, as the owner wrote it: "Notebook = own and shipped
// components and dishes, for editing and building on. Its Dishes part is no second browse list."):
// own and shipped dishes in one plain list, a shipped row marked and opening the shipped dish's
// screen, the origin choice and the name search. Pure: the fictional example dishes, no browser.
import { expect, test } from 'vitest';
import { dishRows } from '../src/dishes/list';
import type { DishRecord } from '../src/records';
import { notebookGroups } from '../src/shared/notebook-rows';
import { EXAMPLE_CLASSICS } from './classics-fixture';

const OWN_ID = 'u-0b0e7c1a-5d6e-4f70-8a9b-0c1d2e3f4a5b';
const own = {
  id: OWN_ID,
  name: 'My soup',
  course: 'main',
  cuisine: 'de',
  slots: [],
  version: { family: OWN_ID, date: '2026-11-22' },
} as unknown as DishRecord;
const labels = { course: (c: string) => `course ${c}`, cuisine: (c: string) => `cuisine ${c}` };
const rows = dishRows([own], EXAMPLE_CLASSICS, 'en', labels);

test('holds own and shipped dishes, own first, a shipped one marked and opening its own screen', () => {
  expect(rows.map((r) => [r.origin, r.name, r.href])).toEqual([
    ['own', 'My soup', `#/dishes/${OWN_ID}`],
    ['shipped', 'Example pan dish (fictional)', '#/classic/example-pan-dish'],
    ['shipped', 'Example second dish (fictional)', '#/classic/example-second-dish'],
  ]);
  expect(rows[0]?.meta).toBe('course main · cuisine de');
  expect(rows.slice(1).every((r) => r.meta.endsWith(' · Shipped'))).toBe(true);
});

test('the origin choice leaves a group out and the search reads the name', () => {
  expect(notebookGroups(rows, 'own', '')).toEqual({ own: [rows[0]] });
  expect(notebookGroups(rows, 'shipped', '').own).toBeUndefined();
  expect(notebookGroups(rows, undefined, 'SECOND').shipped?.map((r) => r.name)).toEqual([
    'Example second dish (fictional)',
  ]);
  expect(notebookGroups(rows, undefined, 'SECOND').own).toEqual([]);
});

test('with no shipped dish there is only the notebook group', () => {
  expect(notebookGroups(dishRows([own], [], 'en', labels), undefined, '')).toEqual({
    own: [expect.objectContaining({ id: OWN_ID })],
  });
});
