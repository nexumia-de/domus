// The classics in the finder as the native Linux app asks (findClassics): the adapter hands the
// engine what a direct call gets, the filters only drop entries, a `wanted` line is named apart
// and never counts, and every entry opens its dish view. On the fictional example classics.
import { classicsMakeable } from '@culina/engine';
import type { Classic, ClassicsMakeableInput } from '@culina/engine';
import { expect, test } from 'vitest';
import { findClassics, withCatalogue } from '../src/cook/classic-finder';
import { classicLookup, classicRow } from '../src/cook/classic-rows';
import type { CookSource } from '../src/cook/input';
import { lookupOf } from '../src/cook/lookup';
import { parseCookFilters } from '../src/prefs';
import type { CookFilters } from '../src/prefs';
import type { IngredientRecord } from '../src/records';
import { loadContent, resetContent } from '../src/classics/content';
import { EXAMPLE_CLASSICS, EXAMPLE_SUBSTITUTES, PAN_DISH, SECOND_DISH } from './classics-fixture';
import { must } from './must';

const TODAY = '2026-11-18';
const record = (id: string, name: string, parentId?: string): IngredientRecord =>
  ({ id, name, ...(parentId === undefined ? {} : { parentId }) }) as IngredientRecord;
const catalogue = new Map(
  [
    record('fdc-173410', 'Butter, salted'),
    record('fdc-171413', 'Oil, olive'),
    record('fdc-173468', 'Salt, table'),
  ].map((r) => [r.id, r]),
);
const stockOf = (...ids: string[]): CookSource['stock'] =>
  ids.map((id) => ({ id: `s-${id}`, ref: { kind: 'ingredient', id } })) as never;
const source = (...ids: string[]): CookSource => ({
  ingredients: [],
  components: [],
  dishes: [],
  stock: stockOf(...ids),
});
const ask = (
  stock: CookSource,
  filters: CookFilters = { lacking: 3 },
  classics: readonly Classic[] = EXAMPLE_CLASSICS,
) => {
  const found = findClassics(classics, stock, catalogue, TODAY, filters, 'en');
  if (!found.ok) throw new Error('not ok');
  return found;
};

test('the notebook wins on an id; the catalogue adds the ids it lacks', () => {
  const mine = record('fdc-173410', 'My butter');
  const merged = withCatalogue([mine], catalogue);
  expect(merged.map((i) => i.name).sort()).toEqual(['My butter', 'Oil, olive', 'Salt, table']);
});

test('the finder hands the engine what a direct call gets', () => {
  const stock = source('fdc-173410', 'fdc-171413');
  const found = ask(stock, { lacking: 1 });
  const input: ClassicsMakeableInput = {
    ingredients: [...catalogue.values()].map((i) => ({ id: i.id })),
    stock: stock.stock as never,
    today: TODAY,
    facts: {},
    classics: EXAMPLE_CLASSICS,
    lang: 'en',
    options: { maxMissing: 1 },
  };
  const direct = classicsMakeable(input);
  if (!direct.ok) throw new Error('direct');
  expect(found.shown).toEqual(direct.candidates);
});

test('a wanted line is named apart and does not count as lacking', () => {
  const found = ask(source('fdc-173410', 'fdc-171413', 'fdc-173468'), { lacking: 0 });
  const second = must(found.shown.find((c) => c.id === SECOND_DISH.id));
  expect(second.notInCatalogue).toEqual(['Example broth stock']);
  expect(second.lacking).toBe(0);
  const row = classicRow(second, classicLookup(found.ingredients, lookupOf(source()), 'en'));
  expect(row.notInCatalogue).toEqual(['Example broth stock']);
  expect(row.status).toBe('complete');
});

test('an entry opens the dish view of the classic', () => {
  const found = ask(source('fdc-173410'));
  const row = classicRow(
    must(found.shown[0]),
    classicLookup(found.ingredients, lookupOf(source()), 'en'),
  );
  expect(row.href).toBe(`#/classic/${row.id}`);
  expect(row.key).toBe(`classic:${row.id}`);
});

test('the role only drops entries, in the engine order; an old country or meat field is ignored', () => {
  const stock = source('fdc-173410', 'fdc-171413', 'fdc-173468');
  const all = ask(stock);
  const main = ask(stock, { lacking: 3, role: 'main' });
  expect(main.shown.map((c) => c.id)).toEqual(
    all.shown.filter((c) => c.roles.includes('main')).map((c) => c.id),
  );
  // What an older version stored beside the threshold is no filter any more.
  expect(ask(stock, { lacking: 3, country: 'fr', meatFree: true } as never).shown).toEqual(
    all.shown,
  );
});

test('with nothing that matches, the nearest are named, fewest lacking first', () => {
  const found = ask(source('fdc-171413'), { lacking: 0 });
  expect(found.shown).toEqual([]);
  expect(found.nearest.length).toBeGreaterThan(0);
  const lacking = found.nearest.map((c) => c.lacking);
  expect(lacking).toEqual([...lacking].sort((a, b) => a - b));
});

test('the kept finder choices read role and threshold only', () => {
  expect(parseCookFilters({ lacking: 2, country: 'it', meatFree: true })).toEqual({ lacking: 2 });
});

test('a shipped substitute effect applies to a shipped dish as to an own one', async () => {
  // The tree as the catalogue has it: oil and butter under their groups, for which the effects are declared.
  const tree = new Map(
    [
      { id: 'fdc-group-oil', name: 'Oils' },
      { id: 'fdc-group-butter', name: 'Butter' },
      { id: 'fdc-171413', name: 'Oil, olive', parentId: 'fdc-group-oil' },
      { id: 'fdc-173410', name: 'Butter, salted', parentId: 'fdc-group-butter' },
      { id: 'fdc-173468', name: 'Salt, table' },
    ].map((r) => [r.id, r as IngredientRecord]),
  );
  const stock = source('fdc-173410', 'fdc-173468');
  const pan = () => {
    const found = findClassics(EXAMPLE_CLASSICS, stock, tree, TODAY, { lacking: 3 }, 'en');
    if (!found.ok) throw new Error('not ok');
    return must(found.shown.find((c) => c.id === PAN_DISH.id));
  };
  const without = pan();
  expect(without.substitutions).toEqual([]);
  try {
    await loadContent(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            format: 'culina-classics',
            formatVersion: 1,
            classics: EXAMPLE_CLASSICS,
            techniques: [],
            substitutes: EXAMPLE_SUBSTITUTES,
          }),
      }),
    );
    const withEffects = pan();
    expect(withEffects.substitutions.map((s) => s.effect)).toEqual(['example-oil-to-butter']);
    expect(withEffects.lacking).toBe(without.lacking - 1);
  } finally {
    resetContent();
  }
});
