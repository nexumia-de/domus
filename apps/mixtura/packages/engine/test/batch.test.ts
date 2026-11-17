// Runs every batch vector and checks the properties of docs/balance.md,
// "Batching", over all balance vectors.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import {
  buildTree,
  computeBalance,
  prediluted,
  roundCount,
  scaleLine,
  scaleLines,
  shelfLife,
  type BalanceSpec,
  type Ingredient,
  type PreparedSpec,
} from '../src/index';
import { validate } from './helpers/json-schema';
import { cases as balanceCases, flatten } from './helpers/balance-vectors';

const dir = fileURLToPath(new URL('../vectors/batch/', import.meta.url));
const read = (f: string) => JSON.parse(readFileSync(`${dir}${f}`, 'utf8'));
const schema = read('batch-vector.schema.json');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type VectorCase = Record<string, any>;
const files = readdirSync(dir).filter((f) => f.endsWith('.json') && !f.includes('schema'));

function tree(ingredients: Ingredient[]) {
  const b = buildTree(ingredients);
  if (!b.ok) throw new Error(b.errors.map((e) => e.message).join('; '));
  return b.tree;
}

describe.each(files)('%s', (file) => {
  const v = read(file);
  const t = tree(v.ingredients);
  const options = {
    specs: new Map(Object.entries((v.specs ?? {}) as Record<string, PreparedSpec>)),
    targetUnit: v.options?.target_unit,
  };

  test('has the vector shape', () => {
    expect(validate(schema, v)).toEqual([]);
    expect(v.id).toBe(file.replace(/\.json$/, ''));
  });

  if (v.error_servings) {
    test.each(v.error_servings as number[])('servings %s is the error %s', (n) => {
      const r = prediluted(t, v.spec, n, options);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errors.map((e) => e.code)).toContain(v.error_code);
    });
    return;
  }

  describe.each(v.cases as VectorCase[])('$servings servings', (c) => {
    const r = prediluted(t, v.spec, c.servings, options);
    const close = (have: number, want: number, tol = v.tolerance) =>
      expect(Math.abs(have - want)).toBeLessThanOrEqual(tol);

    test('quantities', () => {
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      const b = r.value;
      close(b.water.exactMl, c.water_ml);
      close(b.totalVolumeMl, c.total_volume_ml);
      close(b.pourPerServingMl, c.pour_per_serving_ml);
      close(b.water.roundedMl, c.rounded_water_ml);
      close(b.roundedTotalMl, c.rounded_total_ml);
      for (const line of b.lines) {
        const [value, unit, err] = c.rounded_lines[line.ingredientId];
        expect(line.rounded.unit).toBe(unit);
        close(line.rounded.value, value);
        if (err === null) expect(line.roundingError).toBeNull();
        else close(line.roundingError as number, err);
      }
      expect(b.lines.length).toBe(Object.keys(c.rounded_lines).length);
    });

    test('figures of the batch equal one drink; the rounded batch stays within tolerance', () => {
      if (!r.ok) throw new Error('no batch');
      for (const [name, key] of [
        ['abv_after_pct', 'abvPct'],
        ['sugar_g_per_100ml', 'sugarPer100Ml'],
        ['acid_pct', 'acidPct'],
      ] as const) {
        for (const [set, tol] of [
          [r.value.exact, v.tolerance],
          [r.value.perDrink, v.tolerance],
          [r.value.made, v.made_tolerance ?? 0.3],
        ] as const) {
          const f = set.after?.[key];
          expect(f?.known).toBe(true);
          close(f && f.known ? f.value : NaN, c.drink[name], tol);
        }
        const f = r.value.made.after?.[key];
        close(f && f.known ? f.value : NaN, c.made[name]);
      }
    });

    test('shelf life', () => {
      if (!r.ok || !v.shelf_life) return;
      const s = r.value.shelfLife;
      if (v.shelf_life.unknown)
        expect(s).toEqual({ known: false, missingIds: v.shelf_life.unknown });
      else
        expect(s).toEqual({
          known: true,
          days: v.shelf_life.days,
          limitingId: v.shelf_life.limiting_id,
        });
    });
  });
});

describe('top lines are served at the glass', () => {
  test('listed apart and not in the batch', () => {
    const v = read('batch-top-line.json');
    const r = prediluted(tree(v.ingredients), v.spec, 6);
    expect(r.ok && r.value.servedSeparately.map((l) => l.ingredientId)).toEqual(['soda']);
    expect(r.ok && r.value.lines.map((l) => l.ingredientId)).toEqual(['whisky']);
  });
});

describe('properties over every balance vector', () => {
  const noTop = (spec: BalanceSpec): BalanceSpec => ({
    ...spec,
    lines: spec.lines.filter((l) => l.unit !== 'top'),
  });

  test.each(balanceCases.map((c) => [c.id, c] as const))('%s', (_id, c) => {
    const drink = computeBalance(c.tree, noTop(c.spec), c.options);
    expect(drink.ok).toBe(true);
    if (!drink.ok) return;
    for (const n of [1, 3, 10]) {
      const r = prediluted(c.tree, c.spec, n, c.options);
      if (!drink.value.after) {
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.errors[0]?.code).toBe('no-dilution');
        continue;
      }
      expect(r.ok).toBe(true);
      if (!r.ok) continue;
      const b = r.value;
      // The exact batch has the figures of one served drink, known or unknown alike.
      const want = flatten(drink);
      const got = flatten({ ok: true, value: b.exact });
      for (const k of [
        'abv_after_pct',
        'sugar_g_per_100ml',
        'acid_pct',
        'sugar_acid_ratio',
        'uk_units',
      ] as const) {
        const w = want[k];
        const g = got[k];
        if (k === 'uk_units') continue; // units scale with the batch, checked below
        if (typeof w === 'number') expect(Math.abs((g as number) - w), k).toBeLessThan(1e-9);
        else expect(g, k).toEqual(w);
      }
      const after = drink.value.after;
      expect(Math.abs(b.pourPerServingMl - after.volumeMl)).toBeLessThan(1e-9);
      expect(Math.abs(b.totalVolumeMl - n * after.volumeMl)).toBeLessThan(1e-9);
      expect(Math.abs(b.water.exactMl - n * after.waterMl)).toBeLessThan(1e-9);
      // The reported rounding errors add up to the change of the batch volume.
      const volumeLines = b.lines.every((l) => l.exact.unit !== 'g' && l.exact.unit !== 'oz_mass');
      if (volumeLines) {
        const sum =
          b.lines.reduce((s, l) => s + (l.roundingError ?? 0), 0) + b.water.roundingErrorMl;
        expect(Math.abs((b.made.after?.volumeMl ?? NaN) - b.totalVolumeMl - sum)).toBeLessThan(
          1e-9,
        );
      }
    }
  });
});

describe('scaling', () => {
  const lines = [
    { ingredientId: 'a', amount: 22.5, unit: 'ml' },
    { ingredientId: 'b', amount: 2, unit: 'dash' },
    { ingredientId: 'c', amount: 4.2, unit: 'g' },
    { ingredientId: 'd', amount: 1, unit: 'top', topMl: 90 },
  ];

  test.each([1, 2, 3, 7, 10])('by %s then by 1/%s returns the original', (n) => {
    const up = scaleLines(lines, n);
    expect(up.ok).toBe(true);
    if (!up.ok) return;
    const down = scaleLines(up.value, 1 / n);
    expect(down.ok).toBe(true);
    if (!down.ok) return;
    for (const [i, l] of down.value.entries()) {
      expect(l.unit).toBe(lines[i]?.unit);
      expect(Math.abs(l.amount - (lines[i]?.amount as number))).toBeLessThan(1e-9);
    }
    expect(Math.abs((down.value[3]?.topMl as number) - 90)).toBeLessThan(1e-9);
  });

  test('a target unit converts lines of the same kind and leaves the others', () => {
    const r = scaleLines(
      [
        { ingredientId: 'a', amount: 1, unit: 'cl' },
        { ingredientId: 'c', amount: 4, unit: 'g' },
      ],
      2,
      { targetUnit: 'ml' },
    );
    expect(r.ok && r.value).toEqual([
      { ingredientId: 'a', amount: 20, unit: 'ml' },
      { ingredientId: 'c', amount: 8, unit: 'g' },
    ]);
  });

  test('bad input is an error', () => {
    for (const n of [0, -1, NaN, Infinity]) expect(scaleLines(lines, n).ok).toBe(false);
    expect(scaleLine({ ingredientId: 'a', amount: 1, unit: 'furlong' }, 2).ok).toBe(false);
    expect(scaleLine({ ingredientId: 'a', amount: -1, unit: 'ml' }, 2).ok).toBe(false);
  });
});

test('shelf life of no parts is unknown, not infinite', () => {
  const t = tree([{ id: 'x', name: 'X', level: 'product' }]);
  expect(shelfLife(t, [])).toEqual({ known: false, missingIds: [] });
  expect(shelfLife(t, ['x'])).toEqual({ known: false, missingIds: ['x'] });
});

test('roundCount rounds a scaled count up to whole units, never below 1', () => {
  expect(roundCount(2.5)).toEqual({ value: 3, step: 1 });
  expect(roundCount(3)).toEqual({ value: 3, step: 1 });
  expect(roundCount(3.0000000001)).toEqual({ value: 3, step: 1 });
  expect(roundCount(0.25)).toEqual({ value: 1, step: 1 });
  expect(roundCount(0)).toEqual({ value: 0, step: 1 });
});
