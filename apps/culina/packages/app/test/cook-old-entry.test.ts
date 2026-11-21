// An older version kept a country and "without meat and fish" for the classics in `culina.cook`.
// They are ignored: reading the finder's choices and the dish filter writes nothing and carries
// nothing over, so an old choice cannot narrow a list behind the user's back; the next write of
// the finder's choices drops them. On an in-memory store, not a browser (e2e/cook.mjs opens Cook
// and Use up first with such an entry).
import { expect, test } from 'vitest';
import { DISH_FILTER_KEY, readDishFilter } from '../src/browse/filter';
import { COOK_KEY, readCookFilters, writeCookFilters } from '../src/prefs';
import type { KeyValueStore } from '../src/prefs';

const OLD = JSON.stringify({ role: 'main', lacking: 2, country: 'it', meatFree: true });

const recording = () => {
  const data = new Map<string, string>([[COOK_KEY, OLD]]);
  const writes: string[] = [];
  const store: KeyValueStore = {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      writes.push(k);
      data.set(k, v);
    },
  };
  return { data, writes, store };
};

test('an old entry with country and meat changes neither culina.dishes nor anything else', () => {
  const { data, writes, store } = recording();
  expect(readCookFilters(store)).toEqual({ role: 'main', lacking: 2 });
  expect(readDishFilter(store)).toEqual({});
  expect(writes).toEqual([]);
  expect(data.has(DISH_FILTER_KEY)).toBe(false);
  expect(data.get(COOK_KEY)).toBe(OLD);
});

test('the old fields fall away the next time the finder writes its choices', () => {
  const { data, store } = recording();
  writeCookFilters(store, readCookFilters(store));
  expect(JSON.parse(data.get(COOK_KEY) ?? '')).toEqual({ role: 'main', lacking: 2 });
});

test('an unreadable old entry, or a store that throws, gives the defaults', () => {
  const garbage: KeyValueStore = { getItem: () => '{"lacking":', setItem: () => undefined };
  expect(readCookFilters(garbage)).toEqual({ lacking: 1 });
  const broken: KeyValueStore = {
    getItem: () => {
      throw new Error('denied');
    },
    setItem: () => {
      throw new Error('denied');
    },
  };
  expect(readCookFilters(broken)).toEqual({ lacking: 1 });
  expect(readDishFilter(broken)).toEqual({});
});
