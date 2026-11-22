// The one list of "What can I cook": own dishes and classics merged by the engine's ranking, the
// dish filter read on each dish's entry, components and ratio cards as a second group that a dish
// filter hides, the nearest under the same choices, and "use up first" within them. On invented
// candidates (only the fields the merge reads) and, at the end, on the fixture notebook with the
// fictional example classics. What this does not prove: the screen draws these lists (e2e/cook.mjs
// and e2e/classics-finder.mjs do, in a browser).
import { classicsMakeable, rankCandidates } from '@culina/engine';
import type { ClassicCandidate, MakeableCandidate, MakeableUseUp } from '@culina/engine';
import { describe, expect, test } from 'vitest';
import type { DishEntry, Origin } from '../src/browse/entry';
import { find } from '../src/cook/finder';
import type { CookSource } from '../src/cook/input';
import {
  entryKeyOf,
  isNarrowed,
  nearestOf,
  oneList,
  partsInView,
  rolesOf,
  useUpWithin,
} from '../src/cook/one-list';
import type { AnyCandidate } from '../src/cook/one-list';
import type { IngredientRecord } from '../src/records';
import { EXAMPLE_CLASSICS, PAN_DISH, SECOND_DISH } from './classics-fixture';
import { source, TODAY } from './cook-model.helpers';

const cand = (
  kind: string,
  id: string,
  name: string,
  daysLeft?: number,
  roles: string[] = [],
  lacking = 0,
  usedItems: string[] = [],
): AnyCandidate =>
  ({
    kind,
    id,
    name,
    roles,
    lacking,
    complete: lacking === 0,
    usedItems,
    lines: [],
    substitutions: [],
    ...(daysLeft === undefined ? {} : { urgency: { itemId: 'i', useBy: 'x', daysLeft } }),
  }) as unknown as AnyCandidate;

const entry = (origin: Origin, id: string, more: Partial<DishEntry> = {}): DishEntry => ({
  key: `${origin}:${id}`,
  origin,
  id,
  name: id,
  href: `#/${id}`,
  characters: [],
  complete: true,
  ...more,
});

const own = [
  cand('dish', 'soup', 'Leek soup', 3, ['main'], 0, ['leek']),
  cand('component', 'stock', 'Brown stock', undefined, [], 1),
  cand('template', 'roux', 'Roux', undefined, ['sauce']),
  cand('dish', 'salad', 'Bean salad', undefined, ['main', 'acid', 'crunch'], 1),
] as MakeableCandidate[];
const shipped = [
  cand('classic', 'risotto', 'Risotto', 1, ['main'], 0, ['leek']),
  cand('classic', 'omelette', 'Omelette', undefined, ['main'], 2),
] as ClassicCandidate[];
const entries = new Map(
  [
    entry('own', 'soup', { characters: ['creamy'], course: 'soup', meatFree: true }),
    entry('own', 'salad', { characters: ['fresh'], complete: false }),
    entry('shipped', 'risotto', { characters: ['creamy'], course: 'main', cuisine: 'it' }),
    entry('shipped', 'omelette', { course: 'main', cuisine: 'fr', meatFree: true }),
  ].map((e) => [e.key, e]),
);
const keys = (list: readonly AnyCandidate[]): string[] => list.map((c) => `${c.kind}:${c.id}`);

describe('the merge', () => {
  test('dishes of both origins in the engine ranking, components and ratios apart', () => {
    const list = oneList(own, shipped, entries, { filter: {} });
    expect(keys(list.dishes)).toEqual([
      'classic:risotto',
      'dish:soup',
      'dish:salad',
      'classic:omelette',
    ]);
    expect(keys(list.parts)).toEqual(['template:roux', 'component:stock']);
    // The same as one ranking of everything, split: the order is a rule, not the input's.
    const all = keys(rankCandidates<AnyCandidate>([...own, ...shipped]));
    expect(keys(list.dishes)).toEqual(all.filter((k) => /^(dish|classic):/.test(k)));
    expect(
      keys(oneList([...own].reverse(), [...shipped].reverse(), entries, { filter: {} }).dishes),
    ).toEqual(keys(list.dishes));
  });

  test('the entry key of a candidate names its origin', () => {
    expect(entryKeyOf(must(own[0]))).toBe('own:soup');
    expect(entryKeyOf(must(shipped[0]))).toBe('shipped:risotto');
  });
});

describe('the dish filter on the finder', () => {
  const dishes = (filter: Parameters<typeof oneList>[3]['filter']) =>
    keys(oneList(own, shipped, entries, { filter }).dishes);
  const parts = (filter: Parameters<typeof oneList>[3]['filter']) =>
    keys(oneList(own, shipped, entries, { filter }).parts);

  test('origin, character, course, cuisine, meat and every amount only drop entries', () => {
    expect(dishes({ origin: 'shipped' })).toEqual(['classic:risotto', 'classic:omelette']);
    expect(dishes({ origin: 'own' })).toEqual(['dish:soup', 'dish:salad']);
    expect(dishes({ character: 'creamy' })).toEqual(['classic:risotto', 'dish:soup']);
    expect(dishes({ course: 'main' })).toEqual(['classic:risotto', 'classic:omelette']);
    expect(dishes({ cuisine: 'fr' })).toEqual(['classic:omelette']);
    expect(dishes({ meatFree: true })).toEqual(['dish:soup', 'classic:omelette']);
    expect(dishes({ completeOnly: true })).toEqual([
      'classic:risotto',
      'dish:soup',
      'classic:omelette',
    ]);
    expect(dishes({ character: 'creamy', course: 'soup' })).toEqual(['dish:soup']);
  });

  test('components and ratios stay only while the filter chooses nothing but "mine"', () => {
    expect(parts({})).toHaveLength(2);
    expect(parts({ origin: 'own' })).toHaveLength(2);
    expect(parts({ origin: 'shipped' })).toEqual([]);
    expect(parts({ character: 'creamy' })).toEqual([]);
    expect(parts({ completeOnly: true })).toEqual([]);
    expect(partsInView({})).toBe(true);
    expect(partsInView({ origin: 'own' })).toBe(true);
    expect(partsInView({ course: 'soup' })).toBe(false);
  });

  test('a dish without an entry is kept only while nothing is chosen', () => {
    const stray = [cand('dish', 'stray', 'Stray')] as MakeableCandidate[];
    expect(keys(oneList(stray, [], entries, { filter: {} }).dishes)).toEqual(['dish:stray']);
    expect(keys(oneList(stray, [], entries, { filter: { origin: 'own' } }).dishes)).toEqual([]);
  });

  test('the role and the "uses" view narrow both groups; the "uses" view has no classics', () => {
    const main = oneList(own, shipped, entries, { filter: {}, role: 'main' });
    expect(keys(main.dishes)).toEqual([
      'classic:risotto',
      'dish:soup',
      'dish:salad',
      'classic:omelette',
    ]);
    expect(main.parts).toEqual([]);
    const uses = oneList(own, shipped, entries, {
      filter: {},
      uses: new Set(['dish:soup', 'component:stock']),
    });
    expect(keys(uses.dishes)).toEqual(['dish:soup']);
    expect(keys(uses.parts)).toEqual(['component:stock']);
    expect(isNarrowed({ filter: {} })).toBe(false);
    expect(isNarrowed({ filter: { cuisine: 'it' } })).toBe(true);
    expect(isNarrowed({ filter: {}, role: 'main' })).toBe(true);
  });
});

test('the nearest: under the same choices, fewest lacking first, then the ranking', () => {
  expect(keys(nearestOf(own, shipped, entries, { filter: {} }))).toEqual([
    'classic:risotto',
    'dish:soup',
    'template:roux',
  ]);
  expect(keys(nearestOf(own, shipped, entries, { filter: { origin: 'shipped' } }))).toEqual([
    'classic:risotto',
    'classic:omelette',
  ]);
  expect(keys(nearestOf(own, shipped, entries, { filter: { course: 'soup' } }, 1))).toEqual([
    'dish:soup',
  ]);
});

test('use up first counts what is in view, in the ranking, and keeps every dated item', () => {
  const useUp: MakeableUseUp[] = [
    { itemId: 'leek', useBy: '2026-11-19', daysLeft: 1, candidates: [] },
    { itemId: 'cream', useBy: '2026-11-20', daysLeft: 2, candidates: [] },
  ];
  const all = oneList(own, shipped, entries, { filter: {} });
  const within = useUpWithin(useUp, [...all.dishes, ...all.parts]);
  expect(within.map((u) => u.itemId)).toEqual(['leek', 'cream']);
  expect(keys(must(within[0]).candidates)).toEqual(['classic:risotto', 'dish:soup']);
  expect(must(within[1]).candidates).toEqual([]);
  const mine = oneList(own, shipped, entries, { filter: { origin: 'own' } });
  expect(keys(must(useUpWithin(useUp, mine.dishes)[0]).candidates)).toEqual(['dish:soup']);
  expect(rolesOf([...own, ...shipped])).toEqual(['acid', 'crunch', 'main', 'sauce']);
});

describe('on the fixture notebook with the example classics', () => {
  const record = (id: string, name: string): IngredientRecord => ({ id, name }) as IngredientRecord;
  const catalogue = new Map(
    [
      record('fdc-173410', 'Butter, salted'),
      record('fdc-171413', 'Oil, olive'),
      record('fdc-173468', 'Salt, table'),
    ].map((r) => [r.id, r]),
  );
  const withClassicStock: CookSource = {
    ...source,
    stock: [
      ...source.stock,
      ...['fdc-173410', 'fdc-171413', 'fdc-173468'].map((id) => ({
        id: `s-${id}`,
        ref: { kind: 'ingredient', id },
      })),
    ] as CookSource['stock'],
  };
  const fixtureEntries = new Map<string, DishEntry>([
    ...source.dishes.map((d) => [`own:${d.id}`, entry('own', d.id, { course: 'main' })] as const),
    [`shipped:${PAN_DISH.id}`, entry('shipped', PAN_DISH.id, { course: 'main', cuisine: 'de' })],
    [
      `shipped:${SECOND_DISH.id}`,
      entry('shipped', SECOND_DISH.id, { course: 'soup', cuisine: 'it' }),
    ],
  ]);
  const ask = (filter = {}) => {
    const found = find(
      withClassicStock,
      TODAY,
      { lacking: 1 },
      {
        filter,
        entries: fixtureEntries,
        shipped: { classics: EXAMPLE_CLASSICS, catalogue, lang: 'en' },
      },
    );
    if (!found.ok) throw new Error('not ok');
    return found;
  };

  test('the dish group is the engine ranking of own dishes and classics together', () => {
    const found = ask();
    const direct = classicsMakeable({
      ingredients: [
        ...withClassicStock.ingredients.map((i) => ({
          id: i.id,
          ...(i.parentId === undefined ? {} : { parentId: i.parentId }),
          ...(i.roles === undefined ? {} : { roles: i.roles }),
        })),
        ...[...catalogue.keys()].map((id) => ({ id })),
      ],
      stock: withClassicStock.stock as never,
      today: TODAY,
      facts: {},
      classics: EXAMPLE_CLASSICS,
      lang: 'en',
      options: { maxMissing: 1 },
    });
    if (!direct.ok) throw new Error('direct');
    expect(direct.candidates.length).toBeGreaterThan(0);
    const ownDishes = found.within.filter((c) => c.kind === 'dish');
    expect(keys(found.dishes)).toEqual(
      keys(rankCandidates<AnyCandidate>([...ownDishes, ...direct.candidates])),
    );
    expect(found.dishes.some((c) => c.kind === 'classic')).toBe(true);
    expect(found.dishes.some((c) => c.kind === 'dish')).toBe(true);
    expect(found.parts.length).toBeGreaterThan(0);
  });

  test('a course narrows the list to the dishes of that course and hides the parts', () => {
    const soup = ask({ course: 'soup' });
    expect(keys(soup.dishes)).toEqual([`classic:${SECOND_DISH.id}`]);
    expect(soup.parts).toEqual([]);
    expect(soup.narrowed).toBe(true);
    const shippedOnly = ask({ origin: 'shipped' });
    expect(shippedOnly.dishes.every((c) => c.kind === 'classic')).toBe(true);
  });

  test('the "uses" view lists own records only, whatever the shipped side holds', () => {
    const found = find(
      withClassicStock,
      TODAY,
      { lacking: 3 },
      {
        ingredientId: 'cook-leek',
        entries: fixtureEntries,
        shipped: { classics: EXAMPLE_CLASSICS, catalogue, lang: 'en' },
      },
    );
    if (!found.ok) throw new Error('not ok');
    expect(found.classicsWithin).toEqual([]);
    expect(found.dishes.every((c) => c.kind === 'dish')).toBe(true);
  });
});

function must<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('undefined');
  return value;
}
