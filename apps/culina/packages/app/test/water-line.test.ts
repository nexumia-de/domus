// Water as a catalogue ingredient (USDA tap water, fdc-173647) in the shipped recipes, where it
// was a `wanted` name before: the finder does not ask for it, a recipe with water can be kept in
// the notebook, and the characters do not count it. On the real shipped files and catalogue.
// Not proved: a browser, a stored notebook, the native app.
import { readFileSync } from 'node:fs';
import { copyClassic } from '@culina/engine';
import type { Classic } from '@culina/engine';
import { expect, test } from 'vitest';
import { withRoles } from '../src/catalogue/roles';
import { belowOf } from '../src/characters/classes';
import { factsOfClassic } from '../src/characters/classic';
import { CLASSICS } from '../src/classics/index';
import { findClassics } from '../src/cook/classic-finder';
import type { CookSource } from '../src/cook/input';
import type { IngredientRecord } from '../src/records';
import { must } from './must';

const WATER = 'fdc-173647';
const file = JSON.parse(
  readFileSync(new URL('../data/ingredient-catalogue.json', import.meta.url), 'utf8'),
) as { ingredients: IngredientRecord[] };
const plain = new Map(file.ingredients.map((r) => [r.id, r]));
const withRole = new Map(withRoles(file.ingredients).map((r) => [r.id, r]));
const classic = (id: string): Classic => must(CLASSICS.find((c) => c.id === id));

const refsOf = (c: Classic): string[] =>
  [...(c.components ?? []).flatMap((k) => k.lines), ...c.slots].flatMap((l) =>
    l.ref?.kind === 'ingredient' ? [l.ref.id] : [],
  );
/** A stock of everything the recipe names, except water. */
const stockWithoutWater = (c: Classic): CookSource => ({
  ingredients: [],
  components: [],
  dishes: [],
  stock: refsOf(c)
    .filter((id) => id !== WATER)
    .map((id) => ({ id: `s-${id}`, ref: { kind: 'ingredient', id } })) as never,
});
const shown = (c: Classic, catalogue: Map<string, IngredientRecord>): string[] => {
  const found = findClassics(
    [c],
    stockWithoutWater(c),
    catalogue,
    '2026-11-24',
    { lacking: 0 },
    'en',
  );
  if (!found.ok) throw new Error('finder');
  return found.shown.map((e) => e.id);
};

test('the plain rice names water as a catalogue ingredient', () => {
  expect(refsOf(classic('bai-mi-fan'))).toContain(WATER);
});

test('the finder does not ask for water: the role water is the kitchen own', () => {
  const rice = classic('bai-mi-fan');
  expect(shown(rice, withRole)).toEqual(['bai-mi-fan']);
});

test('control: without the role, water is an ingredient like any other and is lacking', () => {
  const rice = classic('bai-mi-fan');
  expect(shown(rice, plain)).toEqual([]);
});

const keep = (id: string) => {
  let n = 0;
  return copyClassic(classic(id), { lang: 'en', date: '2026-11-24', newId: () => `u-${++n}` });
};

test('a recipe with water can be kept in the notebook; its water line points at the catalogue', () => {
  const kept = keep('arroz-rojo');
  expect(kept.ok).toBe(true);
  if (!kept.ok) return;
  expect(kept.components.flatMap((c) => c.lines.map((l) => l.ref.id))).toContain(WATER);
});

test('control: a recipe with a line the catalogue lacks (dashi) is still refused', () => {
  const kept = keep('miso-shiru');
  expect(kept.ok).toBe(false);
  if (kept.ok) return;
  expect(kept.error.code).toBe('wanted-ingredient');
});

test('the characters leave the water line out of the facts', () => {
  const lookup = (id: string): IngredientRecord | undefined => plain.get(id);
  const facts = must(factsOfClassic(classic('bai-mi-fan'), lookup, belowOf(file.ingredients)));
  expect(facts.lines.some((l) => l.classes[0] === WATER)).toBe(false);
  // Control: the rice is a line.
  expect(facts.lines.length).toBeGreaterThan(0);
});
