// Cook's order "Not cooked for long" (docs/behaviour.md#the-date-a-dish-was-cooked) and the day on
// a row: entries written by hand (src/browse/list-view.ts), the keys of the kept days built from
// dish heads (src/dishes/cooked-days.ts), the Notebook's rows (src/dishes/list.ts) and the kept
// choice (src/prefs.ts). The days are given, not read from a clock; nothing here needs today.
// Not proved here: the list in a browser (e2e/dish-cooked.mjs), the real content's 121 rows.
import { describe, expect, test } from 'vitest';
import type { DishEntry } from '../src/browse/entry';
import { dishListView } from '../src/browse/list-view';
import { cookedDaysByKey } from '../src/dishes/cooked-days';
import { dishRows } from '../src/dishes/list';
import { parseCookList } from '../src/prefs';
import type { DishRecord } from '../src/records';

const entry = (
  over: Partial<DishEntry> & Pick<DishEntry, 'origin' | 'id' | 'name'>,
): DishEntry => ({
  key: `${over.origin}:${over.id}`,
  href: over.origin === 'own' ? `#/dishes/${over.id}` : `#/classic/${over.id}`,
  characters: [],
  complete: true,
  ...over,
});

const STEW = entry({ origin: 'own', id: 'u-stew', name: 'Bean stew', course: 'main' });
const TART = entry({ origin: 'own', id: 'u-tart', name: 'Leek tart', course: 'main' });
const CAKE = entry({ origin: 'own', id: 'u-cake', name: 'Apple cake', course: 'dessert' });
const DAL = entry({ origin: 'own', id: 'u-dal', name: 'Dal', course: 'main' });
const RISOTTO = entry({ origin: 'shipped', id: 'risotto', name: 'Risotto', course: 'main' });
const ALL = [STEW, TART, CAKE, DAL, RISOTTO];
const COOKED = new Map([
  ['own:u-tart', '2026-11-20'],
  ['own:u-cake', '2026-10-01'],
  ['own:u-stew', '2026-11-20'],
]);
const names = (view: ReturnType<typeof dishListView>): string[] =>
  view.rows.map((r) => r.entry.name);

describe('the order "Not cooked for long"', () => {
  test('the dishes with a kept day first, the earliest first, the same day by name; the rest by name', () => {
    const view = dishListView(ALL, {}, '', 'en', { cooked: COOKED, notCookedFirst: true });
    expect(names(view)).toEqual(['Apple cake', 'Bean stew', 'Leek tart', 'Dal', 'Risotto']);
  });

  test('control: by name the days change nothing in the order', () => {
    const view = dishListView(ALL, {}, '', 'en', { cooked: COOKED });
    expect(names(view)).toEqual(['Apple cake', 'Bean stew', 'Dal', 'Leek tart', 'Risotto']);
  });

  test('the filter still only drops rows: "From: mine" leaves the own dishes in the same order', () => {
    const view = dishListView(ALL, { origin: 'own' }, '', 'en', {
      cooked: COOKED,
      notCookedFirst: true,
    });
    expect(names(view)).toEqual(['Apple cake', 'Bean stew', 'Leek tart', 'Dal']);
  });

  test('with no day kept at all the order is the order by name', () => {
    const view = dishListView(ALL, {}, '', 'en', { cooked: new Map(), notCookedFirst: true });
    expect(names(view)).toEqual(['Apple cake', 'Bean stew', 'Dal', 'Leek tart', 'Risotto']);
  });

  test('a row says its day in every order; a dish without one says nothing about it', () => {
    const view = dishListView(ALL, {}, '', 'en', { cooked: COOKED });
    const meta = new Map(view.rows.map((r) => [r.entry.name, r.meta.cooked]));
    expect(meta.get('Apple cake')).toBe('2026-10-01');
    expect(meta.get('Dal')).toBeUndefined();
    expect(meta.get('Risotto')).toBeUndefined();
  });
});

const dish = (id: string, family: string, name: string): DishRecord => ({
  id,
  name,
  slots: [],
  version: { family, date: '2026-11-01' },
});

describe('the days by the key of a list entry', () => {
  test('the head of a family carries the day kept for its family', () => {
    const heads = [dish('u-v2', 'u-v1', 'Stew'), dish('u-other', 'u-other', 'Tart')];
    const byFamily = new Map([
      ['u-v1', '2026-11-03'],
      ['u-gone', '2026-11-04'],
    ]);
    expect([...cookedDaysByKey(heads, byFamily)]).toEqual([['own:u-v2', '2026-11-03']]);
  });

  test("the Notebook's Dishes say the day in the muted line, after course and cuisine", () => {
    const rows = dishRows(
      [{ ...dish('u-v2', 'u-v1', 'Stew'), course: 'main' }, dish('u-t', 'u-t', 'Tart')],
      { course: (c) => c, cuisine: (c) => c, cooked: (d) => `cooked ${d}` },
      new Map([['u-v1', '2026-11-03']]),
    );
    expect(rows.map((r) => r.meta)).toEqual(['main · cooked 2026-11-03', '']);
  });
});

describe('the kept order', () => {
  test('"not-cooked" is kept; anything else unknown is by name', () => {
    expect(parseCookList('{"have":false,"order":"not-cooked"}').order).toBe('not-cooked');
    expect(parseCookList('{"have":true,"order":"by-date"}')).toEqual({ have: true, order: 'name' });
  });
});
