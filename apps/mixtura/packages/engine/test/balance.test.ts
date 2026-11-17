// Runs every balance vector against computeBalance and pins the rules that
// are not numbers: units of the output, no verdict words, data-driven dilution.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { computeBalance, computePrepared, buildTree, chooseDilution, DILUTION } from '../src/index';
import { validate } from './helpers/json-schema';
import { cases, flatten, legacyFiles, newFiles } from './helpers/balance-vectors';

const dir = fileURLToPath(new URL('../vectors/', import.meta.url));
const schema = JSON.parse(readFileSync(`${dir}balance/balance-vector.schema.json`, 'utf8'));

test('new vectors validate against their schema and carry their file name as id', () => {
  for (const f of newFiles) {
    const v = JSON.parse(readFileSync(`${dir}balance/${f}`, 'utf8'));
    expect(validate(schema, v), f).toEqual([]);
    expect(v.id).toBe(f.replace(/\.json$/, ''));
  }
});

test('the five original vectors and the new ones are all run', () => {
  expect(legacyFiles.length).toBe(4);
  expect(cases.length).toBe(legacyFiles.length + newFiles.length);
});

describe.each(cases)('$id', (c) => {
  const result = computeBalance(c.tree, c.spec, c.options);

  test('figures match', () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const got = flatten(result);
    for (const [key, want] of Object.entries(c.figures)) {
      const have = got[key];
      if (typeof want === 'number') {
        expect(have, key).toBeTypeOf('number');
        expect(have as number, key).toBeCloseTo(want, -Math.log10(c.tolerance));
        expect(Math.abs((have as number) - want), key).toBeLessThanOrEqual(c.tolerance);
      } else expect(have, key).toEqual(want);
    }
  });

  test('flags match', () => {
    if (!result.ok) throw new Error('no result');
    const v = result.value;
    const f = c.flags;
    if (f.diluted !== undefined) expect(v.after !== undefined).toBe(f.diluted);
    if (f.dilution_unavailable) expect(v.dilutionUnavailable).toBe(f.dilution_unavailable);
    if (f.estimated !== undefined) expect(v.estimated).toBe(f.estimated);
    if (f.estimated_ids) expect([...v.estimatedIds].sort()).toEqual([...f.estimated_ids].sort());
    if (f.excluded_ids) expect(v.excluded.map((e) => e.ingredientId)).toEqual(f.excluded_ids);
    if (f.dilution) expect(v.dilution).toMatchObject(f.dilution);
  });

  test('output carries numbers only, no verdict words', () => {
    const text = JSON.stringify(result).toLowerCase();
    for (const w of ['good', 'bad', 'wrong', 'balanced', 'verdict']) expect(text).not.toContain(w);
  });
});

test('every method of dilution.json has a vector', () => {
  const used = new Set(cases.map((c) => c.spec.method));
  for (const m of DILUTION) expect(used.has(m.id), m.id).toBe(true);
});

test('every figure of the document is covered by a vector', () => {
  const keys = new Set(cases.flatMap((c) => Object.keys(c.figures)));
  for (const k of [
    'volume_before_ml',
    'ethanol_ml',
    'abv_before_pct',
    'volume_after_ml',
    'abv_after_pct',
    'sugar_g',
    'sugar_g_per_100ml',
    'acid_g',
    'acid_pct',
    'sugar_acid_ratio',
    'uk_units',
  ]) {
    expect(keys.has(k), k).toBe(true);
  }
});

test('the dilution data is read from the table, not from code', () => {
  const custom = [
    { id: 'stir', fractionLow: 1, fractionDefault: 2, fractionHigh: 3, evidence: 'assumption' },
  ] as const;
  const c = chooseDilution('stir', { table: custom, bound: 'high' });
  expect(c.ok && c.value.fraction).toBe(3);
  expect(chooseDilution('stir', { table: [] })).toEqual({ ok: false, reason: 'unknown-method' });
  expect(chooseDilution(undefined)).toEqual({ ok: false, reason: 'no-method' });
  expect(chooseDilution('stir', { fraction: -1 })).toEqual({
    ok: false,
    reason: 'invalid-fraction',
  });
});

test('bad input gives errors, not figures', () => {
  const built = buildTree([{ id: 'x', name: 'X', level: 'product', abv: 0, sugar: 0, acid: 0 }]);
  if (!built.ok) throw new Error('tree');
  const r = computeBalance(built.tree, {
    lines: [
      { ingredientId: 'x', amount: 1, unit: 'furlong' },
      { ingredientId: 'x', amount: -1, unit: 'ml' },
    ],
  });
  expect(r.ok).toBe(false);
  if (r.ok) return;
  expect(r.errors.map((e) => e.code)).toEqual(['unknown-unit', 'invalid-amount']);
  const bad = computeBalance(
    built.tree,
    { method: 'stir', lines: [] },
    { dilution: { fraction: NaN } },
  );
  expect(bad.ok).toBe(false);
});

test('prepared by mass: the original syrup vector runs through computePrepared', () => {
  const v = JSON.parse(readFileSync(`${dir}prepared-simple-syrup-1-1.json`, 'utf8'));
  const { sugar_g, water_g, density_g_per_ml } = v.inputs;
  const built = buildTree([
    { id: 'prepared', name: 'Prepared', level: 'category' },
    { id: 'sugar', name: 'Sugar', level: 'product', abv: 0, sugar: 100, acid: 0 },
    { id: 'water', name: 'Water', level: 'product', abv: 0, sugar: 0, acid: 0 },
    {
      id: 'syrup',
      name: 'Syrup',
      level: 'product',
      parentId: 'prepared',
      prepared: { specId: 'syrup', yield: { amount: 1, unit: 'ml' } },
    },
  ]);
  if (!built.ok) throw new Error('tree');
  const specs = new Map([
    [
      'syrup',
      {
        lines: [
          { ingredientId: 'sugar', ml: 0, sugarG: sugar_g },
          { ingredientId: 'water', ml: water_g },
        ],
        yieldMl: (sugar_g + water_g) / density_g_per_ml,
      },
    ],
  ]);
  const r = computePrepared(built.tree, specs, 'syrup');
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(Math.abs(r.value.volumeMl - v.expected.volume_ml)).toBeLessThan(v.tolerance);
  expect(Math.abs((r.value.sugar.value as number) - v.expected.sugar_g_per_100ml)).toBeLessThan(
    v.tolerance,
  );
  expect(r.value.abv.value).toBe(v.expected.abv_pct);
  expect(r.value.acid.value).toBe(v.expected.acid_pct);
});
