// The classics in the finder: the adapter hands the engine what a direct call gets, the filters
// only drop entries, a `wanted` line is named apart and never counts, and every entry opens its
// dish view. On the fictional example classics.
import { classicsMakeable } from '@culina/engine';
import type { Classic, ClassicsMakeableInput } from '@culina/engine';
import { expect, test } from 'vitest';
import { findClassics, withCatalogue } from '../src/cook/classic-finder';
import { classicLookup, classicRow } from '../src/cook/classic-rows';
import type { CookSource } from '../src/cook/input';
import { lookupOf } from '../src/cook/lookup';
import { parseCookFilters } from '../src/prefs';
import type { IngredientRecord } from '../src/records';
import { EXAMPLE_CLASSICS, PAN_DISH, SECOND_DISH } from './classics-fixture';
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
  filters = { lacking: 3 },
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

test('the country and the meat filter only drop entries, in the engine order', () => {
  const stock = source('fdc-173410', 'fdc-171413', 'fdc-173468');
  const all = ask(stock);
  const de = ask(stock, { lacking: 3, country: 'de' } as never);
  const free = ask(stock, { lacking: 3, meatFree: true } as never);
  expect(all.shown.map((c) => c.id)).toEqual(expect.arrayContaining([PAN_DISH.id, SECOND_DISH.id]));
  expect(de.shown.every((c) => c.country === 'de')).toBe(true);
  expect(free.shown.every((c) => c.vegetarian)).toBe(true);
  expect(de.shown.map((c) => c.id)).toEqual(
    all.shown.filter((c) => c.country === 'de').map((c) => c.id),
  );
  expect(ask(stock, { lacking: 3, country: 'fr' } as never).shown).toEqual([]);
  expect(de.matching).toBe(EXAMPLE_CLASSICS.filter((c) => c.country === 'de').length);
});

test('with nothing that matches, the nearest are named, fewest lacking first', () => {
  const found = ask(source('fdc-171413'), { lacking: 0 });
  expect(found.shown).toEqual([]);
  expect(found.nearest.length).toBeGreaterThan(0);
  const lacking = found.nearest.map((c) => c.lacking);
  expect(lacking).toEqual([...lacking].sort((a, b) => a - b));
});

test('the kept filters read the country and the meat choice, and drop what is not one', () => {
  expect(parseCookFilters({ lacking: 2, country: 'it', meatFree: true })).toEqual({
    lacking: 2,
    country: 'it',
    meatFree: true,
  });
  expect(parseCookFilters({ lacking: 2, country: 'xx', meatFree: 'yes' })).toEqual({ lacking: 2 });
});
