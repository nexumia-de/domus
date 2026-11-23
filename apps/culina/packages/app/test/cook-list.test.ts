// Cook's one list (docs/decisions/cook-screen.md): the old addresses and where they lead, the two
// kept choices ("Only with what I have", the order), "Only with what I have" as the finder's keys
// narrowing the list, and "Use up first" as the engine's ranking of the dishes that use a dated
// item, the rest by name. On a memory store, invented entries and candidates (only the fields the
// list reads), and the fixture notebook with the fictional example classics at the end. Not proved
// here: the screen in a browser (e2e/cook.mjs, e2e/navigation.mjs), a real device's storage.
import type { ClassicCandidate, MakeableCandidate } from '@culina/engine';
import { describe, expect, test, vi } from 'vitest';
import type { DishEntry } from '../src/browse/entry';
import { dishListView } from '../src/browse/list-view';
import { find } from '../src/cook/finder';
import { useUpMarks } from '../src/cook/one-list';
import { useUpWords } from '../src/cook/rows';
import { readyKeysOf } from '../src/dishes/ready-now';
import { useUpNote, useUpOf } from '../src/dishes/use-up-order';
import { stringsDe, stringsEn } from '../src/strings';
import {
  COOK_LIST_KEY,
  DEFAULT_COOK_LIST,
  parseCookList,
  readCookList,
  writeCookList,
  type KeyValueStore,
} from '../src/prefs';
import { startRouter, type RouterHost } from '../src/router';
import { cookRedirectWith } from '../src/screens/cook/redirect';
import { EXAMPLE_CLASSICS } from './classics-fixture';
import { source, TODAY } from './cook-model.helpers';

const memory = (): KeyValueStore & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  };
};

const fakeHost = (hash: string) => {
  let listener = (): void => undefined;
  const host: RouterHost = {
    location: { hash },
    history: {
      replaceState: vi.fn((_data: null, _unused: string, url: string) => {
        host.location.hash = url;
      }),
    },
    addEventListener: (_type, fn) => {
      listener = fn;
    },
  };
  return { host, fire: () => listener() };
};

describe('the old addresses', () => {
  test('#/cook/use-up keeps the order "Use up first" and is replaced by #/cook, no new entry', () => {
    const store = memory();
    writeCookList(store, { have: true, order: 'name' });
    const { host } = fakeHost('#/cook/use-up');
    const seen: string[] = [];
    startRouter(
      host,
      ({ route, param, action }) => seen.push(`${route}:${param}:${action}`),
      cookRedirectWith(() => store),
    );
    expect(seen).toEqual(['cook:undefined:undefined']);
    expect(host.history.replaceState).toHaveBeenCalledTimes(1);
    expect(host.location.hash).toBe('#/cook');
    // The order is set; "Only with what I have" is left as it was.
    expect(readCookList(store)).toEqual({ have: true, order: 'use-up' });
  });

  test('#/start and #/cook lead to Cook and change no choice', () => {
    for (const hash of ['#/start', '#/cook']) {
      const store = memory();
      const { host } = fakeHost(hash);
      const seen: string[] = [];
      startRouter(
        host,
        ({ route }) => seen.push(route),
        cookRedirectWith(() => store),
      );
      expect(seen).toEqual(['cook']);
      expect(host.location.hash).toBe('#/cook');
      expect(store.data.size).toBe(0);
    }
  });

  test('start from one ingredient, the stock and its actions are kept as they are', () => {
    const redirect = cookRedirectWith(() => memory());
    for (const hash of ['#/cook/leek/with', '#/stock', '#/stock/add', '#/stock/i-1/edit']) {
      const { host } = fakeHost(hash);
      const seen: string[] = [];
      startRouter(
        host,
        ({ route, param, action }) => seen.push(`${route}:${param}:${action}`),
        redirect,
      );
      expect(host.history.replaceState).not.toHaveBeenCalled();
      expect(seen).toHaveLength(1);
    }
    expect(redirect('cook', 'leek')).toBeUndefined();
    expect(redirect('stock', undefined)).toBeUndefined();
  });

  test('without storage the redirect still leads to Cook', () => {
    expect(cookRedirectWith(() => null)('cook', 'use-up')).toBe('#/cook');
  });
});

describe('the two kept choices', () => {
  test('the default is every dish, by name; a written choice is read back under one key', () => {
    expect(readCookList(memory())).toEqual(DEFAULT_COOK_LIST);
    expect(DEFAULT_COOK_LIST).toEqual({ have: false, order: 'name' });
    const store = memory();
    expect(writeCookList(store, { have: true, order: 'use-up' })).toBe(true);
    expect([...store.data.keys()]).toEqual([COOK_LIST_KEY]);
    expect(readCookList(store)).toEqual({ have: true, order: 'use-up' });
  });

  test('anything unreadable falls back field by field', () => {
    expect(parseCookList('{"have":')).toEqual(DEFAULT_COOK_LIST);
    expect(parseCookList({ have: 'yes', order: 'random' })).toEqual(DEFAULT_COOK_LIST);
    expect(parseCookList({ have: true, order: 'random' })).toEqual({ have: true, order: 'name' });
    expect(parseCookList(JSON.stringify({ order: 'use-up' }))).toEqual({
      have: false,
      order: 'use-up',
    });
    expect(writeCookList(null, DEFAULT_COOK_LIST)).toBe(false);
  });
});

const entry = (origin: 'own' | 'shipped', id: string, name: string): DishEntry => ({
  key: `${origin}:${id}`,
  origin,
  id,
  name,
  href: origin === 'own' ? `#/dishes/${id}` : `#/classic/${id}`,
  characters: [],
  complete: true,
});

const ENTRIES = [
  entry('own', 'a', 'Apple salad'),
  entry('shipped', 'b', 'Bean stew'),
  entry('own', 'c', 'Cabbage rolls'),
  entry('shipped', 'd', 'Dumplings'),
];
const names = (view: ReturnType<typeof dishListView>): string[] =>
  view.rows.map((r) => r.entry.name);

describe('"Only with what I have"', () => {
  test('keeps only the dishes the finder says the stock covers, under the same filter', () => {
    const ready = new Set(['own:c', 'shipped:b']);
    expect(names(dishListView(ENTRIES, {}, '', 'en', { ready }))).toEqual([
      'Bean stew',
      'Cabbage rolls',
    ]);
    expect(names(dishListView(ENTRIES, { origin: 'own' }, '', 'en', { ready }))).toEqual([
      'Cabbage rolls',
    ]);
    expect(dishListView(ENTRIES, {}, '', 'en', { ready }).narrowed).toBe(true);
    // Off, every dish is there.
    expect(names(dishListView(ENTRIES, {}, '', 'en'))).toHaveLength(4);
    expect(dishListView(ENTRIES, {}, '', 'en', { ready: new Set() }).rows).toEqual([]);
  });
});

const cand = (
  kind: 'dish' | 'classic' | 'component',
  id: string,
  name: string,
  urgency?: { daysLeft: number; itemId: string },
  lacking = 0,
): MakeableCandidate | ClassicCandidate =>
  ({
    kind,
    id,
    name,
    roles: [],
    usedItems: urgency === undefined ? [] : [urgency.itemId],
    lacking,
    complete: lacking === 0,
    lines: [],
    substitutions: [],
    ...(urgency === undefined ? {} : { urgency: { ...urgency, useBy: '2026-11-20' } }),
  }) as unknown as MakeableCandidate | ClassicCandidate;

describe('"Use up first"', () => {
  const candidates = [
    cand('dish', 'a', 'Apple salad'),
    cand('classic', 'b', 'Bean stew', { daysLeft: 3, itemId: 'beans' }),
    cand('dish', 'c', 'Cabbage rolls', { daysLeft: 1, itemId: 'cabbage' }),
    cand('component', 'x', 'Stock', { daysLeft: 0, itemId: 'bones' }),
  ];

  test('marks the dishes that use a dated item in the engine ranking; components never', () => {
    const marks = useUpMarks(candidates);
    expect([...marks.entries()]).toEqual([
      ['own:c', { rank: 0, itemId: 'cabbage', daysLeft: 1, lacking: 0 }],
      ['shipped:b', { rank: 1, itemId: 'beans', daysLeft: 3, lacking: 0 }],
    ]);
  });

  test('puts the marked dishes first, the rest by name, and says the item on the row', () => {
    const useUp = useUpMarks(candidates);
    const view = dishListView(ENTRIES, {}, '', 'en', { useUp });
    expect(names(view)).toEqual(['Cabbage rolls', 'Bean stew', 'Apple salad', 'Dumplings']);
    expect(view.rows[0]?.meta.useUp).toEqual({ itemId: 'cabbage', daysLeft: 1, lacking: 0 });
    expect(view.rows[2]?.meta.useUp).toBeUndefined();
    // With "Only with what I have" both narrow: the order stays the engine's.
    const both = dishListView(ENTRIES, {}, '', 'en', {
      useUp,
      ready: new Set(['shipped:b', 'own:a']),
    });
    expect(names(both)).toEqual(['Bean stew', 'Apple salad']);
  });

  test('on the fixture notebook, the marks follow the urgency of the finder', () => {
    const src = source;
    const found = find(
      src,
      TODAY,
      { lacking: 1000 },
      { shipped: { classics: EXAMPLE_CLASSICS, catalogue: new Map(), lang: 'en' } },
    );
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    const marks = useUpMarks(found.dishes);
    const urgent = found.dishes.filter((c) => c.urgency !== undefined);
    expect(urgent.length).toBeGreaterThan(0);
    expect(marks.size).toBe(urgent.length);
    const days = [...marks.values()].map((m) => m.daysLeft);
    expect(days).toEqual([...days].sort((a, b) => a - b));
  });
});

describe('a dish that lacks lines in "Use up first"', () => {
  // Asked at the finder's wide threshold, a dish that lacks lines can stand above a complete one.
  const candidates = [
    cand('dish', 'a', 'Apple salad', { daysLeft: 4, itemId: 'apples' }),
    cand('classic', 'b', 'Bean stew', { daysLeft: 1, itemId: 'beans' }, 2),
  ];
  const itemName = (id: string): string => (id === 'beans' ? 'Beans' : 'Apples');

  test('stands where its use-by puts it, and its row says what it lacks, in both languages', () => {
    const useUp = useUpMarks(candidates);
    const view = dishListView(ENTRIES, {}, '', 'en', { useUp });
    expect(names(view).slice(0, 2)).toEqual(['Bean stew', 'Apple salad']);
    const stew = view.rows[0]?.meta.useUp;
    expect(stew).toEqual({ itemId: 'beans', daysLeft: 1, lacking: 2 });
    if (stew === undefined) return;
    expect(useUpWords(stew, itemName, stringsEn.cook)).toEqual([
      'uses the Beans with 1 day left',
      'lacks 2',
    ]);
    expect(useUpWords(stew, itemName, stringsDe.cook)).toEqual([
      stringsDe.cook.reasonUses('Beans', 1),
      'noch 2 nötig',
    ]);
  });

  test('control: a complete dish says only the item', () => {
    const apple = useUpMarks(candidates).get('own:a');
    expect(apple?.lacking).toBe(0);
    if (apple === undefined) return;
    expect(useUpWords(apple, itemName, stringsEn.cook)).toEqual([
      'uses the Apples with 4 days left',
    ]);
  });
});

describe('the note of "Use up first"', () => {
  test('a finder that cannot read the notebook gives no marks and no "no dates" note', () => {
    const failed = useUpOf({ ok: false });
    expect(failed.ok).toBe(false);
    expect(failed.marks.size).toBe(0);
    expect(useUpNote(failed)).toBeUndefined();
  });

  test('control: a stock read without a dated item says so; with one, nothing', () => {
    const shipped = { classics: EXAMPLE_CLASSICS, catalogue: new Map(), lang: 'en' as const };
    const undated = source.stock.map((s) => {
      const copy = { ...s } as Record<string, unknown>;
      delete copy['useBy'];
      return copy;
    });
    const none = useUpOf(
      find(
        { ...source, stock: undated as unknown as typeof source.stock },
        TODAY,
        { lacking: 1000 },
        { shipped },
      ),
    );
    expect(none.ok).toBe(true);
    expect(useUpNote(none)).toBe('no-dates');
    const some = useUpOf(find(source, TODAY, { lacking: 1000 }, { shipped }));
    expect(useUpNote(some)).toBeUndefined();
    // Not asked (order by name): no note.
    expect(useUpNote(undefined)).toBeUndefined();
  });
});

describe('"Only with what I have" keys (readyKeysOf)', () => {
  const noShipped = { classics: [], catalogue: new Map(), lang: 'en' as const };

  test('an own dish whose every line is there is ready; one that lacks a line is not', () => {
    expect(readyKeysOf(source, TODAY, noShipped)).toEqual(new Set(['own:cook-soup-plate']));
    const noPotato = { ...source, stock: source.stock.filter((s) => s.ref.id !== 'cook-potato') };
    // Control: the finder still lists the soup plate when lines may lack.
    const near = find(noPotato, TODAY, { lacking: 1000 });
    expect(near.ok && near.within.some((c) => c.id === 'cook-soup-plate' && !c.complete)).toBe(
      true,
    );
    expect(readyKeysOf(noPotato, TODAY, noShipped).has('own:cook-soup-plate')).toBe(false);
  });

  test('a shipped dish is ready only when complete', () => {
    const BUTTER = 'fdc-173410';
    const ids = [BUTTER];
    const butterOnly = {
      ingredients: ids.map((id) => ({ id, name: id })),
      components: [],
      dishes: [],
      stock: ids.map((id) => ({ id, ref: { kind: 'ingredient', id } })),
    } as unknown as typeof source;
    const shipped = { classics: EXAMPLE_CLASSICS, catalogue: new Map(), lang: 'en' as const };
    const keys = readyKeysOf(butterOnly, TODAY, shipped);
    // The pan dish needs butter, oil and salt: on butter alone it lacks two lines.
    expect(keys.has('shipped:example-pan-dish')).toBe(false);
    expect(keys.has('shipped:example-second-dish')).toBe(true);
  });
});

describe('the origin word', () => {
  test('is said while the rows shown hold both origins, not when one is left', () => {
    const both = dishListView(ENTRIES, {}, '', 'en');
    expect(both.rows.every((r) => r.meta.origin !== undefined)).toBe(true);
    // A search (or a character) that leaves only shipped dishes: no row repeats "Shipped".
    const one = dishListView(ENTRIES, {}, 'stew', 'en');
    expect(names(one)).toEqual(['Bean stew']);
    expect(one.rows[0]?.meta.origin).toBeUndefined();
  });
});
