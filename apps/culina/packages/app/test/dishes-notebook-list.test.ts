// The Notebook's Dishes: the user's own dishes in one plain list with the name search, and no
// shipped dish (docs/decisions/sauces-are-parts.md; until 2026-11-23 the shipped dishes stood
// here too, as on Cook). Pure: no browser.
import { expect, test } from 'vitest';
import { dishRows } from '../src/dishes/list';
import type { DishRecord } from '../src/records';
import { notebookGroups } from '../src/shared/notebook-rows';

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
const rows = dishRows([own], labels);

test('holds the own dishes, each opening its own screen, with course and cuisine', () => {
  expect(rows.map((r) => [r.origin, r.name, r.href, r.meta])).toEqual([
    ['own', 'My soup', `#/dishes/${OWN_ID}`, 'course main · cuisine de'],
  ]);
});

test('there is only the notebook group, and the search reads the name', () => {
  expect(notebookGroups(rows, undefined, '')).toEqual({ own: [rows[0]] });
  expect(notebookGroups(rows, undefined, 'SOUP').own).toEqual([rows[0]]);
  expect(notebookGroups(rows, undefined, 'pan').own).toEqual([]);
});
