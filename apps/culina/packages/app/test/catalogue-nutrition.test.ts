// The nutrients of the catalogue: read from the dataset by the generator (never typed), the rule for
// what a row and a parent carry, and the shipped file against the schema.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, test } from 'vitest';
import { buildCatalogue, type CatalogueRow } from '../../../tools/catalogue/build.mjs';
import type { Food } from '../../../tools/catalogue/derive.mjs';
import { agreedNutrition, nutritionOf } from '../../../tools/catalogue/nutrition.mjs';
import { must } from './must';

const read = (url: string): unknown =>
  JSON.parse(readFileSync(fileURLToPath(new URL(url, import.meta.url)), 'utf8'));
const shipped = read('../data/ingredient-catalogue.json') as { ingredients: CatalogueRow[] };
const excerpt = (read('./fixtures/catalogue/sr-legacy-excerpt.json') as { SRLegacyFoods: Food[] })
  .SRLegacyFoods;
const groups = (
  read('./fixtures/catalogue/sr-legacy-groups-excerpt.json') as { SRLegacyFoods: Food[] }
).SRLegacyFoods;

const nutrient = (number: string, unitName: string, amount: number) => ({
  nutrient: { number, unitName },
  amount,
});
/** A synthetic food with the nutrients the rule reads; the numbers are invented for the rule. */
const food = (extra: ReturnType<typeof nutrient>[] = [], leave: string[] = []): Food => ({
  fdcId: 1,
  description: 'Example',
  foodNutrients: [
    nutrient('208', 'kcal', 100),
    nutrient('268', 'kJ', 418),
    nutrient('203', 'g', 5),
    nutrient('204', 'g', 2),
    nutrient('205', 'g', 15),
    ...extra,
  ].filter((n) => !leave.includes(n.nutrient.number)),
});

describe('what a food row carries', () => {
  test('the five core nutrients, and fibre and sodium when the dataset has them', () => {
    expect(nutritionOf(food([nutrient('291', 'g', 3), nutrient('307', 'mg', 20)]))).toEqual({
      per100g: {
        kcal: 100,
        kJ: 418,
        proteinG: 5,
        fatG: 2,
        carbohydrateG: 15,
        fibreG: 3,
        sodiumMg: 20,
      },
    });
    expect(nutritionOf(food())?.per100g).not.toHaveProperty('fibreG');
    expect(nutritionOf(food())?.per100g).not.toHaveProperty('sodiumMg');
  });
  test('a missing core nutrient, a negative one or another unit gives no nutrition', () => {
    expect(nutritionOf(food([], ['204']))).toBeUndefined();
    expect(nutritionOf({ ...food(), foodNutrients: [nutrient('208', 'kJ', 1)] })).toBeUndefined();
    expect(
      nutritionOf({
        ...food(),
        foodNutrients: [...(food().foodNutrients ?? []), nutrient('291', 'g', -1)],
      })?.per100g,
    ).not.toHaveProperty('fibreG');
    expect(nutritionOf({ fdcId: 2, description: 'Bare' })).toBeUndefined();
  });
  test('every figure of the fixture rows is the dataset figure', () => {
    const rows = buildCatalogue(excerpt, '2018-04');
    const butter = must(rows.find((r) => r.id === 'fdc-173410'));
    const source = must(
      excerpt
        .find((f) => f.fdcId === 173410)
        ?.foodNutrients?.find((n) => n.nutrient.number === '208'),
    );
    expect(butter['x-nutrition']?.per100g.kcal).toBe(source.amount);
    expect(butter['x-nutrition']).not.toHaveProperty('source');
  });
});

describe('what a parent carries', () => {
  const row = (kcal: number, fibreG?: number): CatalogueRow => ({
    id: 'fdc-1',
    name: 'Example',
    'x-fdc': { id: 1, description: 'Example' },
    'x-nutrition': {
      per100g: {
        kcal,
        kJ: kcal * 4.184,
        proteinG: 5,
        fatG: 2,
        carbohydrateG: 15,
        ...(fibreG === undefined ? {} : { fibreG }),
      },
    },
  });
  test('rows that agree give the median and a source that names the rule', () => {
    const got = agreedNutrition([row(100, 2), row(103, 2), row(101, 2)]);
    expect(got?.per100g.kcal).toBe(101);
    expect(got?.per100g.fibreG).toBe(2);
    expect(got?.source).toContain('median');
  });
  test('the flour parent of the fixture excerpt takes the nutrition its rows share', () => {
    const rows = buildCatalogue(groups, '2018-04');
    const flour = must(rows.find((r) => r.name === 'Wheat flour, white, all-purpose'));
    expect(flour['x-nutrition']?.per100g.kcal).toBe(364);
    expect(flour['x-nutrition']?.source).toContain('3 food rows');
  });
  test('rows that differ in a core nutrient give nothing', () => {
    expect(agreedNutrition([row(100), row(140)])).toBeUndefined();
  });
  test('a row without nutrition, or a single row, gives nothing', () => {
    expect(agreedNutrition([row(100), { ...row(100), 'x-nutrition': undefined }])).toBeUndefined();
    expect(agreedNutrition([row(100)])).toBeUndefined();
  });
  test('fibre is taken only when every row has it and they agree', () => {
    expect(agreedNutrition([row(100, 2), row(100)])?.per100g).not.toHaveProperty('fibreG');
    expect(agreedNutrition([row(100, 2), row(100, 9)])?.per100g).not.toHaveProperty('fibreG');
  });
});

describe('the shipped file', () => {
  const foodRows = shipped.ingredients.filter((r) => r['x-fdc'] !== undefined);
  test('every food row has the five core nutrients and no source of its own', () => {
    for (const r of foodRows) {
      const n = must(r['x-nutrition'], r.id);
      for (const k of ['kcal', 'kJ', 'proteinG', 'fatG', 'carbohydrateG']) {
        expect(n.per100g[k], `${r.id} ${k}`).toBeGreaterThanOrEqual(0);
      }
      expect(n.source, r.id).toBeUndefined();
    }
  });
  test('energy in kJ and kcal agree within the dataset’s own rounding for rows above 20 kcal', () => {
    for (const r of foodRows) {
      const { kcal, kJ } = must(r['x-nutrition']).per100g;
      if (kcal !== undefined && kJ !== undefined && kcal > 20) {
        expect(kJ / kcal, r.id).toBeGreaterThan(3.9);
        expect(kJ / kcal, r.id).toBeLessThan(4.5);
      }
    }
  });
  test('a parent carries nutrition only with a source that names the rule', () => {
    const parents = shipped.ingredients.filter((r) => r['x-group'] !== undefined);
    const withNutrition = parents.filter((r) => r['x-nutrition'] !== undefined);
    expect(withNutrition.length).toBeGreaterThan(0);
    for (const p of withNutrition) {
      expect(p['x-nutrition']?.source, p.id).toContain('Derived by tools/catalogue/build.mjs');
    }
  });
});

describe('the schema', () => {
  const schemaDir = '../../engine/schemas/';
  const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
  for (const file of ['common', 'ingredient']) {
    ajv.addSchema(read(`${schemaDir}${file}.schema.json`) as object);
  }
  const validate = must(
    ajv.getSchema('https://nexumia-de.github.io/culina/schemas/ingredient.schema.json'),
  );
  const ok = { id: 'fdc-1', name: 'Example' };
  const per100g = { kcal: 1, kJ: 4, proteinG: 0, fatG: 0, carbohydrateG: 0 };
  test('accepts the core nutrients with optional fibre and sodium', () => {
    expect(validate({ ...ok, 'x-nutrition': { per100g } })).toBe(true);
    expect(
      validate({ ...ok, 'x-nutrition': { per100g: { ...per100g, fibreG: 1, sodiumMg: 2 } } }),
    ).toBe(true);
  });
  test('refuses a missing core nutrient, a negative number, an unknown nutrient', () => {
    const rest: Record<string, number> = { ...per100g };
    delete rest['kcal'];
    expect(validate({ ...ok, 'x-nutrition': { per100g: rest } })).toBe(false);
    expect(validate({ ...ok, 'x-nutrition': { per100g: { ...per100g, fatG: -1 } } })).toBe(false);
    expect(validate({ ...ok, 'x-nutrition': { per100g: { ...per100g, iron: 1 } } })).toBe(false);
    expect(validate({ ...ok, 'x-nutrition': {} })).toBe(false);
  });
});
