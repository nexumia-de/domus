// The one list of dishes as Dishes and Start show it (src/browse/list-view.ts): which entries pass,
// their order, the line under a name, and the filter an old address of the classics stands for. The
// entries are written here as plain objects; not proved here: the list in a browser
// (e2e/dish-browse.mjs) and the entries built from the real notebook and classics
// (test/browse.test.ts).
import { describe, expect, test } from 'vitest';
import type { DishEntry } from '../src/browse/entry';
import { bothOrigins, classicsFilter, dishListView } from '../src/browse/list-view';

const entry = (
  over: Partial<DishEntry> & Pick<DishEntry, 'origin' | 'id' | 'name'>,
): DishEntry => ({
  key: `${over.origin}:${over.id}`,
  href: over.origin === 'own' ? `#/dishes/${over.id}` : `#/classic/${over.id}`,
  characters: [],
  complete: true,
  ...over,
});

const OWN_STEW = entry({ origin: 'own', id: 's', name: 'stew of mine', characters: ['braised'] });
const OWN_SALAD = entry({ origin: 'own', id: 'a', name: 'Apple salad', meatFree: true });
const SPAETZLE = entry({
  origin: 'shipped',
  id: 'kaesespaetzle',
  name: 'Käsespätzle',
  course: 'main',
  cuisine: 'de',
  meatFree: true,
  characters: ['cheesy', 'baked'],
});
const RISOTTO = entry({
  origin: 'shipped',
  id: 'risotto',
  name: 'Risotto',
  course: 'main',
  cuisine: 'it',
  meatFree: true,
  characters: ['creamy'],
});
const GOULASH = entry({
  origin: 'shipped',
  id: 'goulash',
  name: 'Goulash',
  course: 'main',
  cuisine: 'de',
  meatFree: false,
  characters: ['braised', 'with-meat'],
  complete: false,
});
const ALL = [OWN_STEW, OWN_SALAD, SPAETZLE, RISOTTO, GOULASH];
const names = (view: ReturnType<typeof dishListView>): string[] =>
  view.rows.map((r) => r.entry.name);

describe('the one list', () => {
  test('both origins in one list, sorted by name whatever the origin and the case', () => {
    const view = dishListView(ALL, {}, '', 'en');
    expect(names(view)).toEqual([
      'Apple salad',
      'Goulash',
      'Käsespätzle',
      'Risotto',
      'stew of mine',
    ]);
    expect(view.total).toBe(5);
    expect(view.narrowed).toBe(false);
  });

  test('each choice narrows, and choices combine with each other and with the search', () => {
    expect(names(dishListView(ALL, { origin: 'own' }, '', 'en'))).toEqual([
      'Apple salad',
      'stew of mine',
    ]);
    expect(names(dishListView(ALL, { cuisine: 'de' }, '', 'en'))).toEqual([
      'Goulash',
      'Käsespätzle',
    ]);
    expect(names(dishListView(ALL, { character: 'braised' }, '', 'en'))).toEqual([
      'Goulash',
      'stew of mine',
    ]);
    expect(names(dishListView(ALL, { cuisine: 'de', meatFree: true }, '', 'en'))).toEqual([
      'Käsespätzle',
    ]);
    expect(names(dishListView(ALL, { course: 'main', completeOnly: true }, '', 'en'))).toEqual([
      'Käsespätzle',
      'Risotto',
    ]);
    const searched = dishListView(ALL, { origin: 'shipped' }, ' RIS ', 'en');
    expect(names(searched)).toEqual(['Risotto']);
    expect(searched.narrowed).toBe(true);
    const none = dishListView(ALL, { origin: 'own', cuisine: 'it' }, '', 'en');
    expect(none.rows).toEqual([]);
    expect(none.narrowed).toBe(true);
  });

  test('a choice that keeps every dish still counts as narrowing (so "Show all" can undo it)', () => {
    expect(dishListView([RISOTTO], { cuisine: 'it' }, '', 'en').narrowed).toBe(true);
  });

  test('the line under a name: course and cuisine where known, the origin only while both are listed', () => {
    const view = dishListView(ALL, {}, '', 'en');
    const meta = (id: string) => view.rows.find((r) => r.entry.id === id)?.meta;
    expect(meta('risotto')).toEqual({ course: 'main', cuisine: 'it', origin: 'shipped' });
    expect(meta('a')).toEqual({ origin: 'own' });
    expect(dishListView(ALL, { origin: 'shipped' }, '', 'en').rows[0]?.meta).toEqual({
      course: 'main',
      cuisine: 'de',
    });
    expect(dishListView([SPAETZLE, RISOTTO], {}, '', 'en').rows[0]?.meta.origin).toBeUndefined();
    expect(bothOrigins(ALL)).toBe(true);
    expect(bothOrigins([OWN_STEW])).toBe(false);
  });

  test('a tie of names keeps a stable order by key', () => {
    const twin = entry({ origin: 'own', id: 'r', name: 'Risotto' });
    expect(dishListView([RISOTTO, twin], {}, '', 'de').rows.map((r) => r.entry.key)).toEqual([
      'own:r',
      'shipped:risotto',
    ]);
  });

  test('no entries: an empty list that is not narrowed', () => {
    expect(dishListView([], {}, '', 'en')).toEqual({ rows: [], total: 0, narrowed: false });
  });
});

describe('the old addresses of the classics', () => {
  test('#/classics is the shipped dishes, #/classics/<country> those of one country', () => {
    expect(classicsFilter(undefined)).toEqual({ origin: 'shipped' });
    expect(classicsFilter('it')).toEqual({ origin: 'shipped', cuisine: 'it' });
    expect(classicsFilter('xx')).toEqual({ origin: 'shipped' });
  });
});
