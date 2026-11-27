// The one dish filter's "Favourites only" and Cook's order "Favourites first"
// (docs/behaviour.md#favourites): entries written by hand (src/browse/list-view.ts,
// src/browse/filter.ts) and the kept choices (src/browse/filter.ts, src/prefs.ts).
// Not proved here: the list in a browser (e2e/dish-favourite.mjs), the real content's rows.
import { describe, expect, test } from 'vitest';
import type { DishEntry } from '../src/browse/entry';
import { EMPTY_FILTER, isEmptyFilter, matchesFilter, parseDishFilter } from '../src/browse/filter';
import { activeChoices, dishListView } from '../src/browse/list-view';
import { parseCookList } from '../src/prefs';

const entry = (
  over: Partial<DishEntry> & Pick<DishEntry, 'origin' | 'id' | 'name'>,
): DishEntry => ({
  key: `${over.origin}:${over.id}`,
  href: over.origin === 'own' ? `#/dishes/${over.id}` : `#/classic/${over.id}`,
  characters: [],
  complete: true,
  ...over,
});

const STEW = entry({ origin: 'own', id: 'u-stew', name: 'Bean stew', favourite: true });
const TART = entry({ origin: 'own', id: 'u-tart', name: 'Leek tart' });
const CAKE = entry({ origin: 'own', id: 'u-cake', name: 'Apple cake' });
const RISOTTO = entry({ origin: 'shipped', id: 'risotto', name: 'Risotto', favourite: true });
const TACOS = entry({ origin: 'shipped', id: 'tacos', name: 'Tacos', favourite: true });
const ALL = [STEW, TART, CAKE, RISOTTO, TACOS];
const names = (view: ReturnType<typeof dishListView>): string[] =>
  view.rows.map((r) => r.entry.name);

describe('"Favourites only"', () => {
  test('keeps the favourites of both origins, frames included, and drops the rest', () => {
    const view = dishListView(ALL, { favouritesOnly: true }, '', 'en');
    expect(names(view)).toEqual(['Bean stew', 'Risotto', 'Tacos']);
    expect(view.narrowed).toBe(true);
  });

  test('control: with no choice every dish is there, and the choice is not empty', () => {
    expect(names(dishListView(ALL, EMPTY_FILTER, '', 'en'))).toHaveLength(5);
    expect(isEmptyFilter({ favouritesOnly: true })).toBe(false);
    expect(matchesFilter(TART, { favouritesOnly: true })).toBe(false);
    expect(matchesFilter(TART, EMPTY_FILTER)).toBe(true);
  });

  test('works with the other choices: "From: mine" and a search', () => {
    expect(names(dishListView(ALL, { favouritesOnly: true, origin: 'own' }, '', 'en'))).toEqual([
      'Bean stew',
    ]);
    expect(names(dishListView(ALL, { favouritesOnly: true }, 'ta', 'en'))).toEqual(['Tacos']);
  });

  test('with no favourite the list is empty and says it is narrowed', () => {
    const view = dishListView([TART, CAKE], { favouritesOnly: true }, '', 'en');
    expect(view.rows).toEqual([]);
    expect(view.narrowed).toBe(true);
  });

  test('is named in the summary of the folded filter, and is kept and read again', () => {
    expect(activeChoices({ favouritesOnly: true })).toEqual([{ kind: 'favouritesOnly' }]);
    expect(parseDishFilter(JSON.stringify({ favouritesOnly: true, course: 'main' }))).toEqual({
      course: 'main',
      favouritesOnly: true,
    });
    // Control: anything but `true` is no choice.
    expect(parseDishFilter('{"favouritesOnly":"yes"}')).toEqual({});
    expect(parseDishFilter('{"favouritesOnly":false}')).toEqual({});
  });
});

describe('the order "Favourites first"', () => {
  test('the favourites first, both groups by name, own and shipped mixed', () => {
    const view = dishListView(ALL, {}, '', 'en', { favouritesFirst: true });
    expect(names(view)).toEqual(['Bean stew', 'Risotto', 'Tacos', 'Apple cake', 'Leek tart']);
  });

  test('control: by name the marks change nothing in the order', () => {
    expect(names(dishListView(ALL, {}, '', 'en'))).toEqual([
      'Apple cake',
      'Bean stew',
      'Leek tart',
      'Risotto',
      'Tacos',
    ]);
  });

  test('with no favourite the order is the order by name', () => {
    expect(names(dishListView([TART, CAKE], {}, '', 'en', { favouritesFirst: true }))).toEqual([
      'Apple cake',
      'Leek tart',
    ]);
  });

  test('the filter still only drops rows', () => {
    const view = dishListView(ALL, { origin: 'shipped' }, '', 'en', { favouritesFirst: true });
    expect(names(view)).toEqual(['Risotto', 'Tacos']);
  });

  test('a row says it is a favourite; a dish that is not says nothing', () => {
    const view = dishListView(ALL, {}, '', 'en');
    const meta = new Map(view.rows.map((r) => [r.entry.name, r.meta.favourite]));
    expect(meta.get('Bean stew')).toBe(true);
    expect(meta.get('Tacos')).toBe(true);
    expect(meta.get('Leek tart')).toBeUndefined();
  });

  test('the kept order "favourites" is read again; an unknown one is by name', () => {
    expect(parseCookList('{"have":false,"order":"favourites"}').order).toBe('favourites');
    expect(parseCookList('{"have":true,"order":"loved"}')).toEqual({ have: true, order: 'name' });
  });
});
