// The country and meat choice an older version kept in `culina.cook` are carried into the one
// dish filter once, a choice the dish filter has wins, and an old or broken entry never stops the
// finder. On an in-memory store; a real browser's localStorage is not used here.
import { expect, test } from 'vitest';
import { DISH_FILTER_KEY, readDishFilter } from '../src/browse/filter';
import { carried, carryOldCookChoices, hasOldChoices } from '../src/cook/carry';
import { COOK_KEY, oldCookChoices, readCookFilters } from '../src/prefs';
import type { KeyValueStore } from '../src/prefs';

const memory = (init: Record<string, string> = {}) => {
  const data = new Map(Object.entries(init));
  const store: KeyValueStore & { data: Map<string, string> } = {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
  };
  return store;
};

test('the old choices: a known country and true, nothing else', () => {
  expect(oldCookChoices('{"lacking":2,"country":"it","meatFree":true}')).toEqual({
    country: 'it',
    meatFree: true,
  });
  expect(oldCookChoices({ country: 'xx', meatFree: 'yes' })).toEqual({});
  expect(oldCookChoices('not json')).toEqual({});
  expect(oldCookChoices(null)).toEqual({});
  expect(hasOldChoices({})).toBe(false);
  expect(hasOldChoices({ meatFree: true })).toBe(true);
});

test('the country becomes the cuisine, unless the dish filter has one; the meat choice is kept', () => {
  expect(carried({ country: 'fr', meatFree: true }, {})).toEqual({ cuisine: 'fr', meatFree: true });
  expect(carried({ country: 'fr' }, { cuisine: 'de', course: 'soup' })).toEqual({
    cuisine: 'de',
    course: 'soup',
  });
});

test('carried once: the dish filter gets them, the old entry keeps only role and threshold', () => {
  const store = memory({
    [COOK_KEY]: JSON.stringify({ role: 'main', lacking: 2, country: 'es', meatFree: true }),
    [DISH_FILTER_KEY]: JSON.stringify({ character: 'creamy' }),
  });
  carryOldCookChoices(store);
  expect(readDishFilter(store)).toEqual({ character: 'creamy', cuisine: 'es', meatFree: true });
  expect(JSON.parse(store.data.get(COOK_KEY) ?? '')).toEqual({ role: 'main', lacking: 2 });
  expect(readCookFilters(store)).toEqual({ role: 'main', lacking: 2 });
  // A later change of the dish filter is not overwritten by a second run.
  store.setItem(DISH_FILTER_KEY, JSON.stringify({}));
  carryOldCookChoices(store);
  expect(readDishFilter(store)).toEqual({});
});

test('nothing to carry, no storage or a storage that throws: nothing happens, nothing throws', () => {
  const plain = memory({ [COOK_KEY]: '{"lacking":0}' });
  carryOldCookChoices(plain);
  expect([...plain.data.keys()]).toEqual([COOK_KEY]);
  const garbage = memory({ [COOK_KEY]: '[1,2' });
  carryOldCookChoices(garbage);
  expect(readCookFilters(garbage)).toEqual({ lacking: 1 });
  expect(() => carryOldCookChoices(null)).not.toThrow();
  const broken: KeyValueStore = {
    getItem: () => {
      throw new Error('denied');
    },
    setItem: () => {
      throw new Error('denied');
    },
  };
  expect(() => carryOldCookChoices(broken)).not.toThrow();
  // Reading works but writing does not: the old entry stays as it was.
  const readOnly = memory({ [COOK_KEY]: '{"lacking":1,"country":"de"}' });
  readOnly.setItem = () => {
    throw new Error('quota');
  };
  carryOldCookChoices(readOnly);
  expect(readOnly.data.get(COOK_KEY)).toBe('{"lacking":1,"country":"de"}');
});
