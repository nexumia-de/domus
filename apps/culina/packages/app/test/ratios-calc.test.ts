import { resolveTemplate, SEED_TEMPLATES } from '@culina/engine';
import { describe, expect, test } from 'vitest';
import { calculate, cautionsOf, fromFactor, fromRole, fromTotal } from '../src/ratios/calc';
import { formatMass } from '../src/ratios/format';
import { effectiveOf, readVector } from './vector-templates';

const near = (
  rows: { role: string; g: number }[],
  expected: Record<string, unknown>,
  tol: number,
) => {
  expect(rows.map((r) => r.role)).toEqual(Object.keys(expected));
  for (const row of rows)
    expect(Math.abs(row.g - Number(expected[row.role]))).toBeLessThanOrEqual(tol);
};

// Three ratios from the engine's vectors: pasta 3:2 (from the egg), pie dough 3:2:1 (from the
// water) and bread dough 5:3 (100 g of flour gives the baker's percentages of the vector).
const CASES = [
  { id: 'scale-anchor-pasta-egg', role: 'egg', g: 165, key: 'g' },
  { id: 'scale-anchor-three-roles', role: 'water', g: 80, key: 'g' },
  { id: 'percent-ratio-to-bakers', role: 'flour', g: 100, key: 'pct' },
] as const;

describe.each(CASES)('vector $id', ({ id, role, g, key }) => {
  const vector = readVector(id);
  const template = effectiveOf(vector.inputs.template);
  const expected = vector.expected[key] as Record<string, unknown>;

  test('one ingredient in grams gives the vector amounts', () => {
    const result = fromRole(template, role, { value: g, unit: 'g' });
    if (!result.ok) throw new Error('not ok');
    near(result.rows, expected, vector.tolerance);
  });

  test('the same weight in kilograms, ounces and pounds gives the same amounts', () => {
    for (const [unit, factor] of [
      ['kg', 1000],
      ['oz', 28.349523125],
      ['lb', 453.59237],
    ] as const) {
      const result = calculate(template, { mode: 'role', role, value: g / factor, unit });
      if (!result.ok) throw new Error('not ok');
      near(result.rows, expected, 1e-6);
    }
  });

  test('the total of the vector amounts gives the vector amounts', () => {
    const total = Object.values(expected).reduce<number>((s, v) => s + Number(v), 0);
    const result = fromTotal(template, total);
    if (!result.ok) throw new Error('not ok');
    near(result.rows, expected, 1e-6);
  });

  test('parts times the factor, one part one gram times the factor', () => {
    const parts = template.parts.find((p) => p.role === role)?.parts ?? 1;
    const result = fromFactor(template, g / parts);
    if (!result.ok) throw new Error('not ok');
    near(result.rows, expected, 1e-6);
  });
});

describe('pie dough from 500 g of flour (plain arithmetic on the seed template)', () => {
  const resolved = resolveTemplate(SEED_TEMPLATES, 'pie-dough');
  if (!resolved.ok) throw new Error('seed');
  const result = fromRole(resolved.template, 'flour', { value: 500, unit: 'g' });
  if (!result.ok) throw new Error('not ok');

  test('amounts 500, 333.33..., 166.66...', () => {
    near(result.rows, { flour: 500, fat: 1000 / 3, water: 500 / 3 }, 1e-9);
  });

  test('displayed rounded once to the 1 g step: 500, 333, 167; other units after that', () => {
    expect(result.rows.map((r) => formatMass(r.g, 'g'))).toEqual(['500 g', '333 g', '167 g']);
    expect(result.rows.map((r) => formatMass(r.g, 'kg'))).toEqual([
      '0.5 kg',
      '0.333 kg',
      '0.167 kg',
    ]);
    expect(formatMass(500, 'lb')).toBe('1.102 lb');
    expect(formatMass(500, 'oz')).toBe('17.64 oz');
  });

  test('the cautions: time always, salt only when the template has a salt role', () => {
    expect(cautionsOf(result)).toEqual(['time-not-linear']);
    const bread = resolveTemplate(SEED_TEMPLATES, 'bread-dough-bakers-percent');
    if (!bread.ok) throw new Error('seed');
    const loaf = fromRole(bread.template, 'flour', { value: 500, unit: 'g' });
    if (!loaf.ok) throw new Error('not ok');
    expect(cautionsOf(loaf)).toEqual(['time-not-linear', 'salt-not-linear']);
  });
});

test('values the engine cannot use are not results', () => {
  const template = effectiveOf(readVector('scale-anchor-pasta-egg').inputs.template);
  expect(fromRole(template, 'egg', { value: 0, unit: 'g' }).ok).toBe(false);
  expect(fromRole(template, 'nope', { value: 1, unit: 'g' }).ok).toBe(false);
  expect(fromTotal(template, -1).ok).toBe(false);
  expect(fromFactor(template, Number.POSITIVE_INFINITY).ok).toBe(false);
  expect(fromRole(template, 'egg', { value: 1e308, unit: 'lb' }).ok).toBe(false);
});

test('small amounts keep a tenth of a gram', () => {
  expect(formatMass(8.333, 'g')).toBe('8.3 g');
  expect(formatMass(0, 'kg')).toBe('0 g');
});
