import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import {
  UNIT_IDS,
  convert,
  displayStep,
  isUnitId,
  roundMass,
  toGrams,
  unitFactor,
  unitKind,
} from '../src/index';
import table from '../data/units.json';

const read = (path: string): unknown =>
  JSON.parse(readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8'));
const relClose = (a: number, b: number): void =>
  expect(Math.abs(a - b) / Math.abs(b)).toBeLessThanOrEqual(1e-14);

describe('the unit table', () => {
  test('its ids equal the amountUnit enum of common.schema.json', () => {
    const schema = read('../schemas/common.schema.json') as {
      $defs: { amountUnit: { enum: string[] } };
    };
    expect(Object.keys(table).sort()).toEqual([...schema.$defs.amountUnit.enum].sort());
    expect([...UNIT_IDS].sort()).toEqual([...schema.$defs.amountUnit.enum].sort());
  });

  test('every entry has a kind, a positive factor and a source', () => {
    for (const id of UNIT_IDS) {
      expect(['mass', 'volume', 'count']).toContain(unitKind(id));
      expect(unitFactor(id)).toBeGreaterThan(0);
      expect((table as Record<string, { source: string }>)[id]?.source.length).toBeGreaterThan(0);
    }
  });

  test('derived factors equal their exact definitions', () => {
    const lb = 453.59237; // 0.45359237 kg exactly
    const cup = (231 * 2.54 ** 3) / 16; // 1 US gallon = 231 in3, 1 in = 2.54 cm
    expect(unitFactor('lb')).toBe(lb);
    relClose(unitFactor('oz'), 453.59237 / 16);
    relClose(unitFactor('cup'), cup);
    relClose(unitFactor('tbsp'), cup / 16);
    relClose(unitFactor('tsp'), cup / 16 / 3);
    expect(unitFactor('kg')).toBe(1000);
    expect(unitFactor('l')).toBe(1000);
  });

  test('isUnitId accepts table ids only', () => {
    expect(isUnitId('cup')).toBe(true);
    expect(isUnitId('pinch')).toBe(false);
    expect(isUnitId('toString')).toBe(false);
    expect(isUnitId(3)).toBe(false);
  });
});

describe('conversion edge cases', () => {
  test('same unit returns the same value without facts', () => {
    expect(convert({ value: 3, unit: 'cup' }, 'cup')).toEqual({
      ok: true,
      amount: { value: 3, unit: 'cup' },
    });
  });

  test('lb to oz is exactly 16', () => {
    const r = convert({ value: 1, unit: 'lb' }, 'oz');
    expect(r.ok && Math.abs(r.amount.value - 16)).toBeLessThan(1e-12);
  });

  test('a round trip through grams returns the amount', () => {
    const facts = { densityGPerMl: 0.7, unitWeightG: 60 };
    for (const a of UNIT_IDS) {
      for (const b of UNIT_IDS) {
        const there = convert({ value: 3.7, unit: a }, b, facts);
        if (!there.ok) throw new Error(`${a} to ${b}`);
        const back = convert(there.amount, a, facts);
        if (!back.ok) throw new Error(`${b} to ${a}`);
        relClose(back.amount.value, 3.7);
      }
    }
  });

  test('errors carry their context', () => {
    expect(convert({ value: 1, unit: 'cup' }, 'g')).toEqual({
      ok: false,
      error: { code: 'needs-density' },
    });
    expect(convert({ value: 1, unit: 'g' }, 'count')).toEqual({
      ok: false,
      error: { code: 'needs-unit-weight' },
    });
    // one missing fact gives its own code, both missing give not-convertible
    expect(convert({ value: 1, unit: 'count' }, 'ml', { unitWeightG: 50 })).toEqual({
      ok: false,
      error: { code: 'needs-density' },
    });
    expect(convert({ value: 1, unit: 'count' }, 'ml', { densityGPerMl: 1 })).toEqual({
      ok: false,
      error: { code: 'needs-unit-weight' },
    });
  });

  test('values and facts that are not finite and positive are refused, never NaN', () => {
    for (const value of [0, -1, NaN, Infinity]) {
      expect(convert({ value, unit: 'g' }, 'kg')).toEqual({
        ok: false,
        error: { code: 'invalid-value', field: 'value' },
      });
    }
    expect(toGrams({ value: 1, unit: 'ml' }, { densityGPerMl: 0 })).toEqual({
      ok: false,
      error: { code: 'invalid-value', field: 'densityGPerMl' },
    });
    expect(toGrams({ value: 1, unit: 'count' }, { unitWeightG: NaN })).toEqual({
      ok: false,
      error: { code: 'invalid-value', field: 'unitWeightG' },
    });
    expect(convert({ value: 1, unit: 'g' }, 'pinch' as never)).toEqual({
      ok: false,
      error: { code: 'unknown-unit', unit: 'pinch' },
    });
  });

  test('toGrams of mass needs no facts, of volume and count does', () => {
    expect(toGrams({ value: 2, unit: 'kg' })).toEqual({ ok: true, g: 2000 });
    expect(toGrams({ value: 100, unit: 'ml' }, { densityGPerMl: 1.2 })).toEqual({
      ok: true,
      g: 120,
    });
    expect(toGrams({ value: 3, unit: 'count' }, { unitWeightG: 50 })).toEqual({ ok: true, g: 150 });
    expect(toGrams({ value: 1, unit: 'l' })).toEqual({
      ok: false,
      error: { code: 'needs-density' },
    });
  });
});

describe('rounding', () => {
  test('default step', () => {
    expect(displayStep(9.99)).toBe(0.1);
    expect(displayStep(10)).toBe(1);
    expect(displayStep(-3)).toBe(0.1);
  });

  test('ties go away from zero and binary noise does not count', () => {
    expect(roundMass(2.675, 0.01)).toEqual({ ok: true, g: 2.68 });
    expect(roundMass(1.005, 0.01)).toEqual({ ok: true, g: 1.01 });
    expect(roundMass(0.5, 1)).toEqual({ ok: true, g: 1 });
    expect(roundMass(-0.5, 1)).toEqual({ ok: true, g: -1 });
    expect(roundMass(2.7, 0.1)).toEqual({ ok: true, g: 2.7 });
  });

  test('a small value rounds to zero without a negative zero', () => {
    const r = roundMass(-0.2, 1);
    expect(r.ok && Object.is(r.g, 0)).toBe(true);
  });

  test('invalid input is an error', () => {
    expect(roundMass(NaN, 1)).toEqual({ ok: false, error: { code: 'invalid-value' } });
    expect(roundMass(1, 0)).toEqual({ ok: false, error: { code: 'invalid-step' } });
    expect(roundMass(1, -1)).toEqual({ ok: false, error: { code: 'invalid-step' } });
    expect(roundMass(Infinity, 1)).toEqual({ ok: false, error: { code: 'invalid-value' } });
  });
});
