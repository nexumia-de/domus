import { expect, test } from 'vitest';
import {
  COOK_KEY,
  DEFAULT_COOK_FILTERS,
  parseCookFilters,
  readCookFilters,
  writeCookFilters,
  type KeyValueStore,
} from '../src/prefs';

const memory = (): KeyValueStore & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  };
};

const broken: KeyValueStore = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('quota');
  },
};

test('the default is "lacking at most 1" and any role', () => {
  expect(readCookFilters(memory())).toEqual({ lacking: 1 });
  expect(readCookFilters(null)).toEqual(DEFAULT_COOK_FILTERS);
});

test('written filters are read back under one key', () => {
  const store = memory();
  expect(writeCookFilters(store, { role: 'sauce', lacking: 0 })).toBe(true);
  expect([...store.data.keys()]).toEqual([COOK_KEY]);
  expect(readCookFilters(store)).toEqual({ role: 'sauce', lacking: 0 });
  writeCookFilters(store, { lacking: 3 });
  expect(readCookFilters(store)).toEqual({ lacking: 3 });
});

test('anything unreadable or out of range falls back field by field', () => {
  expect(parseCookFilters('not json')).toEqual({ lacking: 1 });
  expect(parseCookFilters('[1]')).toEqual({ lacking: 1 });
  expect(parseCookFilters(null)).toEqual({ lacking: 1 });
  expect(parseCookFilters({ lacking: 9, role: 'acid' })).toEqual({ role: 'acid', lacking: 1 });
  expect(parseCookFilters({ lacking: 1.5, role: '' })).toEqual({ lacking: 1 });
  expect(parseCookFilters({ lacking: 2, role: 7 })).toEqual({ lacking: 2 });
});

test('a store that throws or is missing does not break reading or writing', () => {
  expect(readCookFilters(broken)).toEqual({ lacking: 1 });
  expect(writeCookFilters(broken, { lacking: 2 })).toBe(false);
  expect(writeCookFilters(null, { lacking: 2 })).toBe(false);
});
