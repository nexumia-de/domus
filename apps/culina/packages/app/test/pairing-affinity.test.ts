// "Proven together": the table read in both directions, the rows for a dish, and the shipped file
// against the catalogue. What a cook thinks of the pairs is tested nowhere: the table is the
// project's own judgement, written by an AI model.
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { AFFINITIES, affinityRows, affinityTable } from '../src/pairing/affinity';

const table = affinityTable({
  tomato: ['basil', 'garlic', 'oil'],
  garlic: ['oil', 'parsley'],
  rice: ['peas'],
});
const parents: Record<string, string> = {
  'my-tomato': 'roma',
  roma: 'tomato',
  'thai-basil': 'basil',
};
const names = {
  parentOf: (id: string) => parents[id],
  nameOf: (id: string) => `name of ${id}`,
};
const line = (ingredient: string) => ({ ingredient, name: ingredient.toUpperCase() });

test("a pair holds in both directions, a row's own partners first", () => {
  expect(table.get('garlic')).toEqual(['oil', 'parsley', 'tomato']);
  expect(table.get('basil')).toEqual(['tomato']);
});

test('the partners most lines name come first, each with the lines it goes with', () => {
  expect(affinityRows([line('tomato'), line('garlic')], table, names)).toEqual([
    { ingredient: 'oil', name: 'name of oil', with: ['TOMATO', 'GARLIC'] },
    { ingredient: 'basil', name: 'name of basil', with: ['TOMATO'] },
    { ingredient: 'parsley', name: 'name of parsley', with: ['GARLIC'] },
  ]);
});

test('an ingredient stands for its nearest ancestor the table names', () => {
  expect(affinityRows([line('my-tomato')], table, names).map((r) => r.ingredient)).toEqual([
    'basil',
    'garlic',
    'oil',
  ]);
});

test('nothing that is in the dish is offered, as itself, as its group or as a member of it', () => {
  expect(
    affinityRows([line('tomato'), line('thai-basil')], table, names).map((r) => r.ingredient),
  ).toEqual(['garlic', 'oil']);
  // Two lines of the same ingredient count once.
  expect(affinityRows([line('tomato'), line('my-tomato')], table, names)[0]?.with).toEqual([
    'TOMATO',
  ]);
});

test('an ingredient the table does not know gives nothing; the limit holds', () => {
  expect(affinityRows([line('quince')], table, names)).toEqual([]);
  expect(affinityRows([line('tomato')], table, names, 2)).toHaveLength(2);
});

test('the shipped table names only ingredients of the catalogue, none with itself', () => {
  const catalogue = JSON.parse(
    readFileSync(new URL('../data/ingredient-catalogue.json', import.meta.url), 'utf8'),
  ) as { ingredients: { id: string }[] };
  const ids = new Set(catalogue.ingredients.map((i) => i.id));
  expect(AFFINITIES.size).toBeGreaterThan(80);
  for (const [id, partners] of AFFINITIES) {
    expect(ids.has(id), id).toBe(true);
    expect(partners.includes(id), id).toBe(false);
    expect(new Set(partners).size, id).toBe(partners.length);
  }
  // Tomato with basil, garlic and olive oil: the pairs the computed data did not give.
  expect(AFFINITIES.get('fdc-group-tomatoes')).toEqual(
    expect.arrayContaining(['fdc-172232', 'fdc-169230', 'fdc-171413']),
  );
});
