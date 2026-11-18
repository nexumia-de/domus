import { describe, expect, test } from 'vitest';
import { scaleByFactor, scaleFromLine, scaleToTotal } from '../src/index';
import type { ScalableLine } from '../src/index';

const lines: ScalableLine[] = [
  { id: 'flour', amount: { value: 250, unit: 'g' } },
  { id: 'butter', amount: { value: 125, unit: 'g' } },
  { id: 'salt', amount: { value: 5, unit: 'g' }, role: 'salt' },
];

const amounts = (r: ReturnType<typeof scaleByFactor>): number[] =>
  r.ok ? r.lines.map((l) => (l.amount as { value: number }).value) : [];

describe('scaling', () => {
  test('invalid factors', () => {
    for (const factor of [0, -2, NaN, Infinity]) {
      expect(scaleByFactor(lines, factor)).toEqual({
        ok: false,
        error: { code: 'invalid-factor' },
      });
    }
  });

  test('the input is not mutated', () => {
    const copy = JSON.parse(JSON.stringify(lines));
    scaleByFactor(lines, 2);
    expect(lines).toEqual(copy);
  });

  test('a bad amount names its line', () => {
    const bad: ScalableLine[] = [{ id: 'x', amount: { value: NaN, unit: 'g' } }];
    expect(scaleByFactor(bad, 2)).toEqual({
      ok: false,
      error: { code: 'invalid-value', lineId: 'x' },
    });
    const big: ScalableLine[] = [{ id: 'y', amount: { value: 1e308, unit: 'g' } }];
    expect(scaleByFactor(big, 10)).toEqual({
      ok: false,
      error: { code: 'invalid-value', lineId: 'y' },
    });
  });

  test('no salt caution without a salt role, and salt roles are configurable', () => {
    const plain = scaleByFactor([lines[0] as ScalableLine], 2);
    expect(plain.ok && plain.cautions).toEqual(['time-not-linear']);
    const custom = scaleByFactor(lines, 2, { saltRoles: ['brine'] });
    expect(custom.ok && custom.cautions).toEqual(['time-not-linear']);
  });

  test('to total: invalid target and unconvertible line', () => {
    expect(scaleToTotal(lines, 0)).toEqual({ ok: false, error: { code: 'invalid-target' } });
    const r = scaleToTotal([{ id: 'oil', amount: { value: 1, unit: 'tbsp' } }], 10);
    expect(r).toEqual({
      ok: false,
      error: { code: 'cannot-convert', lineId: 'oil', cause: { code: 'needs-density' } },
    });
  });

  test('to total reaches the target', () => {
    const r = scaleToTotal(lines, 1000);
    expect(amounts(r).reduce((a, b) => a + b, 0)).toBeCloseTo(1000, 9);
  });

  test('from line: different units use grams, missing facts name the line', () => {
    const l: ScalableLine[] = [{ id: 'sugar', amount: { value: 1, unit: 'cup' } }, ...lines];
    const r = scaleFromLine(
      l,
      'sugar',
      { value: 100, unit: 'g' },
      { sugar: { densityGPerMl: 0.85 } },
    );
    expect(r.ok && r.factor).toBeCloseTo(100 / (236.5882365 * 0.85), 12);
    expect(scaleFromLine(l, 'sugar', { value: 100, unit: 'g' })).toEqual({
      ok: false,
      error: { code: 'cannot-convert', lineId: 'sugar', cause: { code: 'needs-density' } },
    });
    expect(scaleFromLine(l, 'flour', { value: 0, unit: 'g' })).toEqual({
      ok: false,
      error: { code: 'invalid-value', lineId: 'flour' },
    });
    expect(
      scaleFromLine([{ id: 'p', amount: { value: 5, unit: 'percent' } }], 'p', {
        value: 1,
        unit: 'g',
      }),
    ).toEqual({
      ok: false,
      error: { code: 'percent-line', lineId: 'p' },
    });
    expect(scaleFromLine([{ id: 'n' }], 'n', { value: 1, unit: 'g' })).toEqual({
      ok: false,
      error: { code: 'no-amount', lineId: 'n' },
    });
  });
});

describe('property: scaling by k and then by 1/k', () => {
  // Stated tolerance: relative 1e-12 per amount (two multiplications, each
  // within 2^-53 relative; the bound leaves a wide margin).
  const TOLERANCE = 1e-12;
  const recipe: ScalableLine[] = [
    { id: 'a', amount: { value: 0.3, unit: 'g' } },
    { id: 'b', amount: { value: 1234.5678, unit: 'g' } },
    { id: 'c', amount: { value: 3, unit: 'cup' } },
    { id: 'd', amount: { value: 7, unit: 'count' } },
    { id: 'e', amount: { value: 33.3, unit: 'percent' } },
    { id: 'f' },
  ];

  // A fixed LCG (Numerical Recipes constants) gives the same factors every run.
  const factors = (n: number): number[] => {
    let state = 12345;
    const out: number[] = [];
    for (let i = 0; i < n; i++) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      out.push(10 ** ((state / 2 ** 32) * 6 - 3)); // 0.001 .. 1000
    }
    return out;
  };

  test.each(factors(200).map((k) => [k]))('k = %f', (k) => {
    const up = scaleByFactor(recipe, k);
    if (!up.ok) throw new Error('up');
    const down = scaleByFactor(up.lines, 1 / k);
    if (!down.ok) throw new Error('down');
    down.lines.forEach((line, i) => {
      const original = recipe[i] as ScalableLine;
      expect(line.id).toBe(original.id);
      if (!original.amount) return expect(line.amount).toBeUndefined();
      expect(line.amount?.unit).toBe(original.amount.unit);
      const rel =
        Math.abs((line.amount?.value as number) - original.amount.value) / original.amount.value;
      expect(rel).toBeLessThanOrEqual(TOLERANCE);
    });
  });
});
