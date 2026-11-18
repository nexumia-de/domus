// The shipped catalogue: valid against the schemas, rebuilt from fixture excerpts of the source
// with the generator's rules, and the rules themselves on small synthetic portions.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, test } from 'vitest';
import { buildRows, serialise, type CatalogueRow } from '../../../tools/catalogue/build.mjs';
import {
  deriveDensity,
  deriveUnitWeight,
  isBasic,
  nameOf,
  type Food,
} from '../../../tools/catalogue/derive.mjs';
import { must } from './must';

const read = (url: string): unknown =>
  JSON.parse(readFileSync(fileURLToPath(new URL(url, import.meta.url)), 'utf8'));
const schemaDir = '../../engine/schemas/';
const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
for (const file of readdirSync(fileURLToPath(new URL(schemaDir, import.meta.url))).filter((f) =>
  f.endsWith('.schema.json'),
)) {
  ajv.addSchema(read(schemaDir + file) as object);
}
const validate = must(
  ajv.getSchema('https://nexumia-de.github.io/culina/schemas/catalogue.schema.json'),
);

interface Shipped {
  dataset: { release: string };
  ingredients: CatalogueRow[];
}
const shipped = read('../data/ingredient-catalogue.json') as Shipped;
/** The food rows: entries with an FDC id; the others are the generated parents. */
const foodRows = shipped.ingredients.filter((r) => r['x-fdc'] !== undefined);
const excerpt = (read('./fixtures/catalogue/sr-legacy-excerpt.json') as { SRLegacyFoods: Food[] })
  .SRLegacyFoods;
const units = read('../../engine/data/units.json') as Record<string, { toBase: number }>;
const mlOf = (unit: string): number => must(units[unit]).toBase;

describe('the shipped file', () => {
  test('is valid against the catalogue and ingredient schemas', () => {
    expect(validate(shipped), JSON.stringify(validate.errors?.slice(0, 3))).toBe(true);
  });
  test('ids are unique, sorted, fdc-<FDC id>, and every row has a number the engine can use', () => {
    const ids = shipped.ingredients.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([...ids].sort());
    for (const row of foodRows) {
      expect(row.id).toBe(`fdc-${row['x-fdc']?.id}`);
      expect(row.densityGPerMl !== undefined || row.unitWeightG !== undefined, row.id).toBe(true);
    }
  });
  test('names are unique and every number names its FDC id, dataset release and portion', () => {
    const names = shipped.ingredients.map((r) => r.name);
    expect(new Set(names).size).toBe(names.length);
    for (const row of foodRows) {
      for (const n of [row.densityGPerMl, row.unitWeightG]) {
        if (n === undefined) continue;
        expect(n.source, row.id).toContain(`FDC ID ${row['x-fdc']?.id}`);
        expect(n.source, row.id).toContain(`release ${shipped.dataset.release}`);
        expect(n.source, row.id).toMatch(/portion: .+ = [\d.]+ g/);
      }
    }
  });
  test('carries no field the source does not give: no roles, shelf life, season', () => {
    const allowed = [
      'id',
      'name',
      'parentId',
      'names',
      'densityGPerMl',
      'unitWeightG',
      'yields',
      'x-fdc',
      'x-group',
    ];
    for (const row of shipped.ingredients) {
      expect(Object.keys(row).filter((k) => !allowed.includes(k))).toEqual([]);
    }
  });
});

describe('rows recomputed from the fixture excerpt', () => {
  const rows = buildRows(excerpt, shipped.dataset.release);
  const byId = (id: string) => rows.find((r) => r.id === id);

  test('only basic foods with a usable portion become rows', () => {
    expect(rows.map((r) => r.id)).toEqual([
      'fdc-168894',
      'fdc-169230',
      'fdc-171265',
      'fdc-171287',
      'fdc-171688',
      'fdc-173410',
    ]);
  });
  test('garlic: density from 1 cup, weight of one clove (not the 3 cloves portion)', () => {
    expect(byId('fdc-169230')).toMatchObject({
      name: 'Garlic',
      densityGPerMl: { value: 0.575 },
      unitWeightG: { value: 3 },
    });
    expect(byId('fdc-169230')?.unitWeightG?.source).toContain('portion: 1 clove = 3 g');
  });
  test('butter, flour and milk: density only', () => {
    expect(byId('fdc-173410')?.densityGPerMl?.value).toBe(0.959);
    expect(byId('fdc-168894')?.densityGPerMl?.value).toBe(0.528);
    expect(byId('fdc-171265')?.densityGPerMl?.value).toBe(1.031);
    expect(byId('fdc-173410')?.unitWeightG).toBeUndefined();
  });
  test('egg and apple: weight of the medium one, no density (their cups are not plain)', () => {
    expect(byId('fdc-171287')).toMatchObject({
      name: 'Egg, whole, fresh',
      unitWeightG: { value: 44 },
    });
    expect(byId('fdc-171287')?.densityGPerMl).toBeUndefined();
    expect(byId('fdc-171688')).toMatchObject({
      name: 'Apples, with skin',
      unitWeightG: { value: 182 },
    });
  });
  test('lemons (two sizes of fruit), cooked rice, a brand and beef give no row', () => {
    for (const id of ['fdc-167746', 'fdc-168935', 'fdc-171002', 'fdc-168605']) {
      expect(byId(id), id).toBeUndefined();
    }
  });
  test('the rows equal the shipped rows, and the serialisation is stable', () => {
    for (const row of rows) {
      // The shipped row also has its parent link, its yields and its German names, which the
      // excerpt cannot give (the names have their own test, catalogue-names.test.ts).
      const rest = { ...must(shipped.ingredients.find((r) => r.id === row.id)) };
      delete rest.parentId;
      delete rest.yields;
      delete rest.names;
      expect(rest).toEqual(row);
    }
    const envelope = { ...shipped, ingredients: rows };
    expect(serialise(envelope)).toBe(serialise(envelope));
    expect(() => JSON.parse(serialise(envelope))).not.toThrow();
  });
});

describe('the rules', () => {
  const portion = (modifier: string, gramWeight: number, amount = 1) => ({
    amount,
    modifier,
    gramWeight,
  });
  test('density: cup, tablespoon and teaspoon by the engine table; the largest unit wins', () => {
    const d = deriveDensity([portion('tsp', 2.8), portion('cup', 136)], mlOf);
    expect(d).toEqual({ value: 0.575, unit: 'cup', portion: '1 cup = 136 g' });
    expect(deriveDensity([portion('tablespoon', 15)], mlOf)?.value).toBe(1.014);
    expect(deriveDensity([portion('cup', 240, 0.5)], mlOf)?.value).toBe(2.029);
  });
  test('density: bulk forms, disagreeing portions and impossible values are left out', () => {
    expect(deriveDensity([portion('cup, chopped', 160)], mlOf)).toBeUndefined();
    expect(deriveDensity([portion('cup', 100), portion('tbsp', 10)], mlOf)).toBeUndefined();
    expect(deriveDensity([portion('cup', 1000)], mlOf)).toBeUndefined();
    expect(deriveDensity([portion('cup', 5)], mlOf)).toBeUndefined();
  });
  test('unit weight: medium, else the only size, else the only piece word; ambiguity gives none', () => {
    expect(deriveUnitWeight([portion('large', 50), portion('medium (3" dia)', 44)])?.value).toBe(
      44,
    );
    expect(deriveUnitWeight([portion('large', 50), portion('cup', 100)])?.value).toBe(50);
    expect(deriveUnitWeight([portion('large', 50), portion('small', 30)])).toBeUndefined();
    expect(deriveUnitWeight([portion('clove', 3), portion('cloves', 9, 3)])?.value).toBe(3);
    expect(
      deriveUnitWeight([portion('fruit (2" dia)', 84), portion('fruit (3" dia)', 58)]),
    ).toBeUndefined();
    expect(deriveUnitWeight([portion('medium', 44), portion('medium (2")', 40)])).toBeUndefined();
  });
  test('selection: category, raw, processing words and brands', () => {
    const food = (description: string, category: string): Food => ({
      fdcId: 1,
      description,
      foodCategory: { description: category },
    });
    expect(isBasic(food('Carrots, raw', 'Vegetables and Vegetable Products'))).toBe(true);
    expect(isBasic(food('Carrots, baby, raw', 'Vegetables and Vegetable Products'))).toBe(true);
    expect(isBasic(food('Carrots, cooked, boiled', 'Vegetables and Vegetable Products'))).toBe(
      false,
    );
    expect(isBasic(food('Carrots, canned', 'Vegetables and Vegetable Products'))).toBe(false);
    expect(
      isBasic(
        food(
          "Apples, raw, with skin (Includes foods for USDA's Program)",
          'Fruits and Fruit Juices',
        ),
      ),
    ).toBe(true);
    expect(isBasic(food('Salt, table', 'Spices and Herbs'))).toBe(true);
    expect(isBasic(food('Honey', 'Sweets'))).toBe(true);
    expect(isBasic(food('Candies, gumdrops', 'Sweets'))).toBe(false);
    expect(isBasic(food('Beef, ground, raw', 'Beef Products'))).toBe(false);
    expect(isBasic(food('Oil, olive, KRAFT', 'Fats and Oils'))).toBe(false);
  });
  test('names: parentheses and the word raw are dropped', () => {
    expect(nameOf("Apples, raw, with skin (Includes foods for USDA's Program)")).toBe(
      'Apples, with skin',
    );
    expect(nameOf('Garlic, raw')).toBe('Garlic');
  });
});
