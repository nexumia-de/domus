/* eslint-disable @typescript-eslint/no-non-null-assertion -- fixtures are known */
import { expect, test } from 'vitest';
import { applyFilters } from '../src/screens/browse/filters';
import { candidatesOf } from '../src/screens/stock/buy-next-model';
import { deriveStock, drinkCounts, hasStock, rankStock } from '../src/stock/derived';
import type { StockRecords } from '../src/stock/state';
import { rankedStock } from '../src/stock/rank-async';
import { fixtureModel } from './browse-fixture';

const model = fixtureModel();
const rec = (...ids: string[]): StockRecords =>
  new Map(ids.map((id) => [id, { ingredientId: id, present: true }]));
const name = (spec: string): string => model.specById.get(spec)!.name;
const states = (r: StockRecords): Record<string, string> =>
  Object.fromEntries(
    [...deriveStock(model, r).states].map(([id, a]) => [
      name(id),
      a.kind === 'one' ? `one:${a.missing}` : a.kind === 'several' ? `several:${a.count}` : a.kind,
    ]),
  );

test('an empty stock allows nothing and a record that says out does not count', () => {
  expect(deriveStock(model, rec()).states.size).toBe(0);
  const out: StockRecords = new Map([['rum', { ingredientId: 'rum', present: false }]]);
  expect(hasStock(model, out)).toBe(false);
  expect(deriveStock(model, out).states.size).toBe(0);
});

test('makeable, missing one with its name, and a stocked type that does not satisfy a product line', () => {
  expect(states(rec('rum', 'lime', 'simple', 'gin', 'soda'))).toEqual({
    Daiquiri: 'makeable',
    'No Method Drink': 'makeable',
    'Gin and Soda': 'makeable',
    // 'gin' (a type) does not satisfy a line that names London Dry Gin
    'Gimlet (less syrup)': 'one:london-gin',
    Martini: 'one:vermouth',
    // two or more missing: the list only says how many
    'Crème Brûlée Flip': 'several:2',
  });
});

test('counts are over the drinks of the list', () => {
  expect(deriveStock(model, rec('rum', 'lime', 'simple')).counts).toEqual({
    makeable: 2,
    substitute: 0,
    one: 1, // the Gimlet, missing London Dry Gin
  });
  expect(deriveStock(model, rec('rum', 'lime')).counts.one).toBe(1);
});

test('results are kept for the same records and recomputed for new ones', () => {
  const r = rec('rum', 'lime');
  expect(deriveStock(model, r)).toBe(deriveStock(model, r));
  expect(deriveStock(model, rec('rum', 'lime'))).not.toBe(deriveStock(model, r));
});

test('the makeable filter keeps one state and is empty without stock', () => {
  const d = deriveStock(model, rec('rum', 'lime', 'simple', 'gin', 'soda'));
  const names = (makeable: string): string[] =>
    applyFilters(model, { q: '', makeable }, model.drinks, d.states).map((x) => x.spec.name);
  expect(names('yes')).toEqual(['Daiquiri', 'Gin and Soda', 'No Method Drink']);
  expect(names('one')).toEqual(['Gimlet (less syrup)', 'Martini']);
  expect(names('substitute')).toEqual([]);
  expect(applyFilters(model, { q: '', makeable: 'yes' }, model.drinks, new Map())).toEqual([]);
});

test('the ranking: count, drinks by name, and the same numbers as adding the item and counting', () => {
  const r = rec('rum', 'simple');
  const ranking = candidatesOf(model, rankStock(model, r, 'strict'));
  const top = ranking[0]!;
  expect(top.id).toBe('lime');
  expect(top.drinks.map((d) => d.name)).toEqual(['Daiquiri', 'No Method Drink']);
  for (const c of ranking) {
    const before = deriveStock(model, r).counts.makeable;
    const after = deriveStock(model, rec('rum', 'simple', c.id)).counts.makeable;
    expect(after - before).toBe(c.count);
  }
  expect(rankStock(model, r, 'strict')).toBe(rankStock(model, r, 'strict'));
});

test('drinks per ingredient include the ancestors of the lines', () => {
  const counts = drinkCounts(model);
  expect(counts.get('gin')).toBe(3); // Gimlet (via London Dry Gin), Martini, Gin and Soda
  expect(counts.get('spirits')).toBe(6);
  expect(counts.get('lime')).toBe(3);
});

test('without a worker the ranking is computed at once and equals the synchronous one', () => {
  const r = rec('rum', 'simple');
  let called = 0;
  const ranked = rankedStock(model, r, 'strict', ['retired'], () => (called += 1));
  expect(ranked.result).toBe(rankStock(model, r, 'strict'));
  expect(ranked.previous).toBe(ranked.result);
  expect(called).toBe(0);
});

test('the statuses left out change the ranking and are kept apart', () => {
  const r = rec('rum', 'simple');
  const without = rankStock(model, r, 'strict', ['retired']);
  const all = rankStock(model, r, 'strict', []);
  expect(rankStock(model, r, 'strict', ['retired'])).toBe(without);
  expect(rankStock(model, r, 'strict', [])).toBe(all);
  expect(all).not.toBe(without);
});

test('"several missing" is no filter state and no count', () => {
  const r = rec('rum', 'simple', 'gin', 'soda');
  const { states: all, counts } = deriveStock(model, r);
  const several = [...all.values()].filter((a) => a.kind === 'several');
  expect(several.length).toBeGreaterThan(0);
  expect(counts.one).toBe([...all.values()].filter((a) => a.kind === 'one').length);
});
