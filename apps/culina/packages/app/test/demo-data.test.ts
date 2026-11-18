import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { validateModel } from '@culina/engine';
import { expect, test } from 'vitest';
import {
  factsByIngredient,
  getComponent,
  getDish,
  getIngredient,
  ingredientName,
  listComponents,
  listDishes,
  listIngredients,
} from '../src/demo';
import { DISH_ROLES, openRoles } from '../src/dishes/roles';

const schemaDir = fileURLToPath(new URL('../../engine/schemas/', import.meta.url));
const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
for (const file of readdirSync(schemaDir).filter((f) => f.endsWith('.schema.json'))) {
  ajv.addSchema(JSON.parse(readFileSync(schemaDir + file, 'utf8')) as object);
}
const validator = (name: string) => {
  const id = `https://nexumia-de.github.io/culina/schemas/${name}.schema.json`;
  const fn = ajv.getSchema(id);
  if (!fn) throw new Error(`schema ${name} not loaded`);
  return fn;
};

test('every demo record is valid against its schema', () => {
  const sets: [string, readonly unknown[]][] = [
    ['ingredient', listIngredients()],
    ['component', listComponents()],
    ['dish', listDishes()],
  ];
  for (const [name, records] of sets) {
    const validate = validator(name);
    expect(records.length, name).toBeGreaterThan(0);
    for (const record of records) {
      expect(validate(record), `${name} ${JSON.stringify(validate.errors)}`).toBe(true);
    }
  }
});

test('the demo set passes validateModel with no findings', () => {
  const result = validateModel({
    ingredients: listIngredients(),
    components: listComponents(),
    dishes: listDishes(),
  });
  expect(result.findings).toEqual([]);
  expect(result.ok).toBe(true);
});

test('every demo record is marked as an example, and every yield too', () => {
  for (const c of listComponents()) {
    expect(c.name, c.id).toMatch(/^Example\b/);
    expect(c.id, c.id).toMatch(/^example-/);
    if (c.yield !== undefined) expect(c.yield.source, c.id).toMatch(/^Example\b/);
  }
  for (const d of listDishes()) {
    expect(d.name, d.id).toMatch(/^Example\b/);
    expect(d.note, d.id).toMatch(/^Example\b/);
  }
  for (const i of listIngredients()) {
    expect(i.note, i.id).toMatch(/^Example\b/);
    for (const y of i.yields ?? []) expect(y.source, i.id).toMatch(/^Example\b/);
  }
});

test('the set covers what the screens must show', () => {
  const components = listComponents();
  expect(components.length).toBeGreaterThanOrEqual(4);
  expect(components.length).toBeLessThanOrEqual(5);
  expect(components.some((c) => c.percentBase !== undefined)).toBe(true);
  expect(components.some((c) => c.yield === undefined)).toBe(true);
  expect(components.some((c) => c.lines.some((l) => l.amount === undefined))).toBe(true);
  // three levels: the sauce uses a stock that uses a base
  const sauce = getComponent('example-pan-sauce');
  const stock = getComponent('example-vegetable-stock');
  expect(sauce?.lines.some((l) => l.ref.id === stock?.id)).toBe(true);
  expect(stock?.lines.some((l) => l.ref.kind === 'component')).toBe(true);
  const dishes = listDishes();
  expect(dishes.length).toBe(2);
  expect(dishes.some((d) => openRoles(d.slots.map((s) => s.role)).length > 0)).toBe(true);
  expect(dishes.some((d) => d.slots.some((s) => s.ref.kind === 'ingredient'))).toBe(true);
  for (const d of dishes) {
    for (const s of d.slots) expect(s.role).toMatch(/^[a-z]+$/);
  }
  expect(DISH_ROLES).toContain('crunch');
});

test('the access module answers by id and falls back to the id for a name', () => {
  expect(getComponent('example-herb-oil')?.name).toBe('Example: Herb oil');
  expect(getComponent('nope')).toBeUndefined();
  expect(getDish('nope')).toBeUndefined();
  expect(getDish('example-vegetable-plate')?.portions).toBe(2);
  expect(getIngredient('flour')?.name).toBe('Flour');
  expect(ingredientName('flour')).toBe('Flour');
  expect(ingredientName('unknown-thing')).toBe('unknown-thing');
  expect(Object.keys(factsByIngredient()).sort()).toEqual(
    listIngredients()
      .map((i) => i.id)
      .sort(),
  );
});
