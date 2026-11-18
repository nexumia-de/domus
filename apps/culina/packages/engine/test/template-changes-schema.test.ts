// The `set` change and the range of an `add` in template.schema.json.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, test } from 'vitest';

const dir = fileURLToPath(new URL('../schemas/', import.meta.url));
const read = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
for (const f of readdirSync(dir).filter((n) => n.endsWith('.schema.json')))
  ajv.addSchema(read(dir + f) as object);
const validate = ajv.getSchema((read(`${dir}template.schema.json`) as { $id: string }).$id);
const valid = (doc: unknown): boolean => validate?.(doc) === true;
const derivative = (changes: unknown[]) => ({
  id: 'v',
  name: 'v',
  source: 'user',
  parentId: 'p',
  changes,
});

describe('template changes: set and the range of an add', () => {
  test('the variation examples', () => {
    expect(valid(read(`${dir}examples/template-variation.valid.json`))).toBe(true);
    expect(valid(read(`${dir}examples/template-variation.invalid.json`))).toBe(false);
  });
  test.each([
    ['set', { op: 'set', role: 'fat', parts: 1 }],
    ['set with range', { op: 'set', role: 'fat', parts: 1, range: { min: 1, max: 2 } }],
    ['add with range', { op: 'add', role: 'salt', parts: 2, range: { min: 1.8, max: 2 } }],
  ])('%s is valid', (_name, change) => {
    expect(valid(derivative([change]))).toBe(true);
  });
  test.each([
    ['set without parts', { op: 'set', role: 'fat' }],
    ['set with parts 0', { op: 'set', role: 'fat', parts: 0 }],
    ['set with a negative range', { op: 'set', role: 'fat', parts: 1, range: { min: -1, max: 2 } }],
    ['set with a range missing max', { op: 'set', role: 'fat', parts: 1, range: { min: 1 } }],
    ['set with an ingredient class', { op: 'set', role: 'fat', parts: 1, ingredientClass: 'x' }],
    ['remove with a range', { op: 'remove', role: 'fat', range: { min: 1, max: 2 } }],
    ['swap with parts', { op: 'swap', role: 'fat', ingredientClass: 'x', parts: 1 }],
  ])('%s is invalid', (_name, change) => {
    expect(valid(derivative([change]))).toBe(false);
  });
});
