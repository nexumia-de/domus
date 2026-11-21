// The finder's adapter and filters against direct engine calls, on the fixture notebook.
import { makeable, rankCandidates, SEED_TEMPLATES, usesIngredient } from '@culina/engine';
import type { MakeableCandidate, MakeableInput } from '@culina/engine';
import { expect, test } from 'vitest';
import { find } from '../src/cook/finder';
import { cookInput } from '../src/cook/input';
import { lookupOf } from '../src/cook/lookup';
import { cookRow, keyOf } from '../src/cook/rows';
import { openRows } from '../src/dishes/slots';
import { must } from './must';
import { source, TODAY } from './cook-model.helpers';

/** The engine input written out by hand from the fixture, without the adapter. */
const direct = (maxMissing: number): MakeableInput => ({
  ingredients: source.ingredients.map((i) => ({
    id: i.id,
    ...(i.parentId === undefined ? {} : { parentId: i.parentId }),
    ...(i.roles === undefined ? {} : { roles: i.roles }),
  })),
  components: source.components as MakeableInput['components'],
  dishes: source.dishes as MakeableInput['dishes'],
  templates: SEED_TEMPLATES,
  stock: source.stock as MakeableInput['stock'],
  today: TODAY,
  facts: {},
  options: { maxMissing },
});

const candidates = (maxMissing: number): MakeableCandidate[] => {
  const r = makeable(direct(maxMissing));
  if (!r.ok) throw new Error(r.error.code);
  return r.candidates;
};

/** Both groups of an own-only finding, ranked again as one: the engine's list, narrowed. */
const shownOf = (found: Extract<ReturnType<typeof find>, { ok: true }>): MakeableCandidate[] =>
  rankCandidates([...found.dishes, ...found.parts] as MakeableCandidate[]);

test('without shipped dishes the groups split the engine list: dishes, then the rest', () => {
  const found = find(source, TODAY, { lacking: 1 });
  if (!found.ok) throw new Error('not ok');
  const engine = candidates(1);
  expect(found.dishes.map(keyOf)).toEqual(engine.filter((c) => c.kind === 'dish').map(keyOf));
  expect(found.parts.map(keyOf)).toEqual(engine.filter((c) => c.kind !== 'dish').map(keyOf));
  expect(found.classicsWithin).toEqual([]);
});

test('the adapter hands the engine what a direct call gets: the same result, every time', () => {
  for (const n of [0, 1, 3]) {
    expect(makeable(cookInput(source, TODAY, { maxMissing: n }))).toEqual(makeable(direct(n)));
  }
});

test('the adapter passes every version of a component, and the engine lists the head only', () => {
  const input = cookInput(source, TODAY);
  expect(input.components?.filter((c) => c.name === 'Onion tart')).toHaveLength(2);
  const names = candidates(1).map((c) => `${c.id}`);
  expect(names).toContain('cook-onion-tart-2');
  expect(names).not.toContain('cook-onion-tart-1');
});

test('a parent that is not in the notebook is left out instead of stopping the finder', () => {
  const stale = {
    ...source,
    ingredients: [...source.ingredients, { id: 'x', name: 'X', parentId: 'gone' }],
  };
  expect(makeable(cookInput(stale as never, TODAY)).ok).toBe(true);
});

test('the screen order is the engine ranking, filters only drop entries', () => {
  const engine = candidates(1);
  const found = find(source, TODAY, { lacking: 1 });
  if (!found.ok) throw new Error('not ok');
  expect(shownOf(found).map(keyOf)).toEqual(engine.map(keyOf));
  const sauce = find(source, TODAY, { lacking: 1, role: 'sauce' });
  if (!sauce.ok) throw new Error('not ok');
  expect(shownOf(sauce).map(keyOf)).toEqual(
    engine.filter((c) => c.roles.includes('sauce')).map(keyOf),
  );
  expect(shownOf(sauce).length).toBeGreaterThan(0);
  expect(shownOf(sauce).length).toBeLessThan(engine.length);
});

test('complete only is the engine threshold 0', () => {
  const found = find(source, TODAY, { lacking: 0 });
  if (!found.ok) throw new Error('not ok');
  expect(shownOf(found).map(keyOf)).toEqual(candidates(0).map(keyOf));
  expect(shownOf(found).every((c) => c.complete)).toBe(true);
});

test('start from one ingredient keeps the engine order of what uses it', () => {
  const found = find(source, TODAY, { lacking: 3 }, { ingredientId: 'cook-leek' });
  if (!found.ok) throw new Error('not ok');
  const uses = usesIngredient(direct(3), 'cook-leek');
  if (!uses.ok) throw new Error('not ok');
  const keys = new Set(uses.records.map(keyOf));
  expect(shownOf(found).map(keyOf)).toEqual(
    candidates(3)
      .filter((c) => keys.has(keyOf(c)))
      .map(keyOf),
  );
  const names = shownOf(found).map((c) => c.name);
  expect(names).toEqual(
    expect.arrayContaining(['Potato and leek soup', 'Buttered leeks', 'Onion tart', 'Soup plate']),
  );
  expect(names).not.toContain('Walnut butter');
});

test('when nothing matches the nearest are named, fewest lacking first', () => {
  const little = {
    ...source,
    stock: source.stock.filter((s) => ['cook-s-onion', 'cook-s-salt'].includes(s.id)),
  };
  const found = find(little, TODAY, { lacking: 0 });
  if (!found.ok) throw new Error('not ok');
  expect(shownOf(found)).toEqual([]);
  expect(found.narrowed).toBe(false);
  expect(found.nearest.map((c) => c.name)).toContain('Onion tart');
  const lacks = found.nearest.map((c) => c.lacking);
  expect([...lacks].sort((a, b) => a - b)).toEqual(lacks);
  expect(lacks.every((n) => n > 0)).toBe(true);
});

test('a role nothing covers leaves no nearest and says the choices are narrowed', () => {
  const found = find(source, TODAY, { lacking: 3, role: 'garnish' });
  if (!found.ok) throw new Error('not ok');
  expect(shownOf(found)).toEqual([]);
  expect(found.nearest).toEqual([]);
  expect(found.narrowed).toBe(true);
});

test('the reason line is built from the engine: urgency item, days left and the roles', () => {
  const found = find(source, TODAY, { lacking: 1 });
  if (!found.ok) throw new Error('not ok');
  const row = (id: string) =>
    cookRow(must(shownOf(found).find((c) => c.id === id)), found.look, found.offers);
  const soup = row('cook-potato-leek-soup');
  expect(soup.status).toBe('complete');
  expect(soup.reason).toBe('uses the Leek with 1 day left; covers aromatic, main element, sauce');
  expect(soup.unknown).toEqual(['Cream is there; how much is not known.']);
  const leeks = row('cook-buttered-leeks');
  expect(leeks.status).toBe('complete');
  expect(leeks.substitutions).toEqual(['with Salted butter in place of Unsalted butter']);
  const tart = row('cook-onion-tart-2');
  expect(tart.status).toBe('lacks 1');
  expect(tart.lacks).toEqual(['Thyme']);
  expect(tart.reason).toBe('nothing it uses has a use-by date; covers main element');
  const dish = row('cook-soup-plate');
  expect(dish.offers).toEqual(['You could add a crunch: Walnut']);
});

test('the names come from the notebook, a component by its family head', () => {
  const look = lookupOf(source);
  expect(look.name({ kind: 'ingredient', id: 'cook-leek' })).toBe('Leek');
  expect(look.name({ kind: 'component', id: 'cook-onion-tart-1' })).toBe('Onion tart');
  expect(look.name({ kind: 'ingredient', id: 'nope' })).toBe('nope');
  expect(look.itemRef('cook-s-leek')).toEqual({ kind: 'ingredient', id: 'cook-leek' });
});

test('use up first is the engine list: dated items, nearest first, with what uses each', () => {
  const found = find(source, TODAY, { lacking: 1 });
  if (!found.ok) throw new Error('not ok');
  expect(found.useUpFirst.map((u) => u.itemId)).toEqual([
    'cook-s-leek',
    'cook-s-cream',
    'cook-s-yoghurt',
  ]);
  expect(must(found.useUpFirst[0]).daysLeft).toBe(1);
  expect(must(found.useUpFirst[2]).candidates).toEqual([]);
});

test('without a stock, a notebook or a match the empty states can be told apart', () => {
  const none = find({ ...source, stock: [] }, TODAY, { lacking: 1 });
  if (!none.ok) throw new Error('not ok');
  expect(none.hasStock).toBe(false);
  const bare = find({ ...source, components: [], dishes: [] }, TODAY, { lacking: 1 });
  if (!bare.ok) throw new Error('not ok');
  expect(bare.hasRecipes).toBe(false);
  expect(bare.hasStock).toBe(true);
});

test('the open roles of a dish are offered only where the stock has something for them', () => {
  const found = find(source, TODAY, { lacking: 1 });
  if (!found.ok) throw new Error('not ok');
  const dish = must(source.dishes[0]);
  const rows = openRows(dish, found.offers);
  expect(rows.map((r) => r.role)).toEqual(['crunch', 'acid', 'garnish']);
  expect(rows.filter((r) => r.offer !== undefined).map((r) => [r.role, r.offer])).toEqual([
    ['crunch', 'You could add a crunch: Walnut'],
  ]);
  expect(openRows(dish).every((r) => r.offer === undefined)).toBe(true);
});
