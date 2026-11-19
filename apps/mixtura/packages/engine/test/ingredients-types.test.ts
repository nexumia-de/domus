// The exported ingredient types must list the same fields as the JSON
// Schemas (docs/data-model.md is compared with the schemas elsewhere).
import { expect, test } from 'vitest';
import { INGREDIENT_FIELDS } from '../src/drink-ingredients/types';
import { PREPARED_FIELDS } from '@nexumia-de/materia';
import { schemas } from './schema-helpers';

const keys = (name: string) =>
  Object.keys((schemas[name] as { properties: object }).properties).sort();

test('Ingredient fields equal the ingredient schema properties', () => {
  expect([...INGREDIENT_FIELDS].sort()).toEqual(keys('ingredient'));
});

test('PreparedIngredient fields equal the prepared-ingredient schema properties', () => {
  expect([...PREPARED_FIELDS].sort()).toEqual(keys('prepared-ingredient'));
});

test('role, level and assumed values equal the schema enums', async () => {
  const role = (schemas.common as { $defs: { role: { enum: string[] } } }).$defs.role.enum;
  const level = (schemas.ingredient as { properties: { level: { enum: string[] } } }).properties
    .level.enum;
  const assumed = (schemas.ingredient as { properties: { assumed: { items: { enum: string[] } } } })
    .properties.assumed.items.enum;
  // Compile-time lists in the types are checked by tsc; here the schema side is pinned.
  expect(role).toEqual([
    'base',
    'modifier',
    'sweet',
    'sour',
    'bitter',
    'accent',
    'texture',
    'lengthener',
  ]);
  expect(level).toEqual(['category', 'type', 'product']);
  expect(assumed).toEqual(['role', 'abv', 'sugar', 'acid', 'shelfLifeDays', 'substitutionClass']);
});
