// The stock item schema: presence alone is a valid item, the detail is optional but checked
// when given. Examples are in schemas/examples (stock-presence, stock-always).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { stockValidator } from './validators';

const read = (name: string): Record<string, unknown> =>
  JSON.parse(
    readFileSync(
      fileURLToPath(new URL(`../schemas/examples/${name}.json`, import.meta.url)),
      'utf8',
    ),
  ) as Record<string, unknown>;
const validate = stockValidator;

describe('stock item schema', () => {
  test('an item that says only what is there is valid', () => {
    const item = read('stock-presence.valid');
    expect(Object.keys(item).sort()).toEqual(['id', 'ref']);
    expect(validate(item), JSON.stringify(validate.errors)).toBe(true);
  });
  test('always there is valid, and a field of another app stays allowed', () => {
    const item = read('stock-always.valid');
    expect(validate(item), JSON.stringify(validate.errors)).toBe(true);
    expect(item['x-emptio']).toBeDefined();
  });
  test('a component can be stock, with the detail left out', () => {
    expect(validate({ id: 's', ref: { kind: 'component', id: 'c' } })).toBe(true);
  });
  test('a text for always is refused', () => {
    expect(validate(read('stock-presence.invalid'))).toBe(false);
  });
  test('id and ref stay required', () => {
    expect(validate({ ref: { kind: 'ingredient', id: 'carrot' } })).toBe(false);
    expect(validate({ id: 's' })).toBe(false);
  });
  test('detail that is given is still checked', () => {
    const ref = { kind: 'ingredient', id: 'carrot' };
    expect(validate({ id: 's', ref, amount: { value: 3, unit: 'count' } })).toBe(true);
    expect(validate({ id: 's', ref, amount: { value: 3 } })).toBe(false);
    expect(validate({ id: 's', ref, state: 'frozen' })).toBe(false);
    expect(validate({ id: 's', ref, preparedOn: '2026-02-30x' })).toBe(false);
  });
});
