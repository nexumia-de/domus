// The checked classics (vectors/classics): each has its template match and
// figures worked out by hand (independent of the engine) and is run here
// through the engine with the properties written in the vector; a second
// test requires that the seed plus the curated classics values still give
// those properties.
import { readdirSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import {
  buildTree,
  computeBalance,
  matchSpec,
  resolveProperty,
  ROOT_TEMPLATES,
  type Ingredient,
} from '../src/index';
import { makeAjv } from './schema-helpers';
import { curated, engineRoot, read, seed, seedTree } from './seed-data';

const dir = `${engineRoot}vectors/classics/`;
const check = makeAjv().compile(read(`${dir}classics-vector.schema.json`));
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.json') && !f.includes('schema'))
  .sort();
const vectors = files.map((f) => ({ file: f, v: read(`${dir}${f}`) }));

const flat = (v: (typeof vectors)[number]['v']): Ingredient[] =>
  Object.entries(v.properties as Record<string, Record<string, unknown>>).map(
    ([id, p]) => ({ id, name: id, level: 'product', ...p }) as Ingredient,
  );

test('at least ten classics, every file named after its id, all six templates covered', () => {
  expect(vectors.length).toBeGreaterThanOrEqual(10);
  for (const { file, v } of vectors) {
    expect(check(v), JSON.stringify(check.errors)).toBe(true);
    expect(file).toBe(`${v.id}.json`);
  }
  const covered = new Set(vectors.map(({ v }) => v.expected.templateId).filter(Boolean));
  expect([...covered].sort()).toEqual(ROOT_TEMPLATES.map((t) => t.id).sort());
});

describe.each(vectors)('$file', ({ v }) => {
  const built = buildTree(flat(v));
  if (!built.ok) throw new Error('classic tree invalid');
  const lines = v.lines as { ingredientId: string; amount: number; unit: string; topMl?: number }[];

  test('template match', () => {
    const r = matchSpec(built.tree, ROOT_TEMPLATES, { lines });
    expect(r.chosen?.templateId ?? null).toBe(v.expected.templateId);
  });

  test('figures after dilution', () => {
    const r = computeBalance(built.tree, { method: v.method, lines });
    expect(r.ok).toBe(true);
    if (!r.ok || !r.value.after) throw new Error('no figures');
    const after = r.value.after;
    expect(Math.abs(after.volumeMl - v.expected.volumeAfterMl)).toBeLessThanOrEqual(v.tolerance);
    for (const key of ['abvPct', 'sugarPer100Ml', 'acidPct'] as const) {
      const got = after[key];
      const want = v.expected[key];
      if (want === 'unknown') {
        expect(got.known, key).toBe(false);
        if (!got.known)
          expect([...got.missingIds].sort(), key).toEqual(v.expected[`${key}MissingIds`]);
      } else {
        expect(got.known, key).toBe(true);
        if (got.known) expect(Math.abs(got.value - want), key).toBeLessThanOrEqual(v.tolerance);
      }
    }
  });

  test('the seed and the curated classics values still give the properties of the vector', () => {
    const withCurated = seed.ingredients.ingredients.map((i) => {
      const extra = (curated.classics as Record<string, object>)[i.id];
      if (!extra) return i;
      const values: Record<string, unknown> = {};
      for (const k of ['abv', 'sugar', 'acid']) {
        const v = (extra as Record<string, unknown>)[k];
        if (v !== undefined) values[k] = v;
      }
      return { ...i, ...values } as Ingredient;
    });
    const tree = seedTree(withCurated);
    for (const [id, props] of Object.entries(
      v.properties as Record<string, Record<string, number | string>>,
    )) {
      for (const p of ['role', 'abv', 'sugar', 'acid'] as const) {
        expect(resolveProperty(tree, id, p).value, `${id} ${p}`).toBe(props[p]);
      }
    }
  });
});

test('a seed classic has the lines of its seed spec, optional lines left out', () => {
  for (const { v } of vectors) {
    const spec = seed.specs.specs.find((s) => s.id === v.id);
    if (!spec) continue;
    const want = spec.lines
      .filter((l) => !l.optional)
      .map((l) => [l.ingredientId, l.amount, l.unit]);
    const got = (v.lines as { ingredientId: string; amount: number; unit: string }[]).map((l) => [
      l.ingredientId,
      l.amount,
      l.unit,
    ]);
    expect(got, v.id).toEqual(want);
  }
});

test('the curated classics values all say where they come from', () => {
  for (const [id, e] of Object.entries(
    curated.classics as Record<string, Record<string, unknown>>,
  )) {
    expect(e.source !== undefined || e.basis === 'assumption', id).toBe(true);
  }
});
