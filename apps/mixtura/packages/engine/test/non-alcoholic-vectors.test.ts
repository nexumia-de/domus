/* eslint-disable @typescript-eslint/no-non-null-assertion -- vector files are untyped JSON read by the test */
// Runs the vectors of vectors/non-alcoholic: the alcohol class (classifyAlcohol)
// and the variant templates offered by matchSpec for a class (docs/non-alcoholic.md,
// docs/templates.md#variants-by-alcohol-class). Expected values are worked out by hand.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import {
  buildTree,
  classifyAlcohol,
  computeBalance,
  matchSpec,
  ROOT_TEMPLATES,
  VARIANT_TEMPLATES,
  type BalanceFigures,
  type Ingredient,
} from '../src/index';
import { validate } from './helpers/json-schema';

const dir = fileURLToPath(new URL('../vectors/non-alcoholic/', import.meta.url));
const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const schema = read(`${dir}non-alcoholic-vector.schema.json`);
const built = buildTree(read(`${dir}tree.json`).ingredients as Ingredient[]);
if (!built.ok) throw new Error('tree.json is invalid');
const tree = built.tree;
const vectors = readdirSync(dir)
  .filter((f) => f.endsWith('.json') && !f.includes('schema') && f !== 'tree.json')
  .map((f) => ({ file: f, v: read(`${dir}${f}`) }));
const TEMPLATES = [...ROOT_TEMPLATES, ...VARIANT_TEMPLATES];

const figures = (abvPct: number): BalanceFigures =>
  ({
    excluded: [],
    after: { abvPct: { known: true, value: abvPct } },
  }) as unknown as BalanceFigures;

test('vectors validate against their schema and carry their file name as id', () => {
  expect(vectors.length).toBeGreaterThanOrEqual(30);
  for (const { file, v } of vectors) {
    expect(validate(schema, v), file).toEqual([]);
    expect(v.id).toBe(file.replace(/\.json$/, ''));
  }
});

describe('classify-spec', () => {
  test.each(vectors.filter((x) => x.v.kind === 'classify-spec'))('$file', ({ v }) => {
    const bal = computeBalance(tree, { method: v.method, lines: v.lines });
    if (!bal.ok) throw new Error('balance failed');
    const r = classifyAlcohol(bal.value, tree, v.thresholds);
    expect(r.class).toBe(v.expected.class);
    if (v.expected.abvPct !== undefined) expect(r.abvPct).toBeCloseTo(v.expected.abvPct, 3);
    expect(r.reason).toBe(v.expected.reason);
    expect(r.ids).toEqual(v.expected.ids);
  });
});

describe('classify-figures', () => {
  test.each(vectors.filter((x) => x.v.kind === 'classify-figures'))('$file', ({ v }) => {
    for (const c of v.cases) {
      expect(classifyAlcohol(figures(c.abvPct), tree, c.thresholds).class, JSON.stringify(c)).toBe(
        c.class,
      );
    }
  });

  test('without figures after dilution the class is unknown with the reason', () => {
    const none = { excluded: [] } as unknown as BalanceFigures;
    expect(classifyAlcohol(none, tree)).toMatchObject({ class: 'unknown', reason: 'no-dilution' });
  });

  test('the default thresholds are the data file: below 0.5 % none, up to 10 % low', () => {
    expect(classifyAlcohol(figures(0.49), tree).class).toBe('none');
    expect(classifyAlcohol(figures(0.5), tree).class).toBe('low');
    expect(classifyAlcohol(figures(10), tree).class).toBe('low');
    expect(classifyAlcohol(figures(10.01), tree).class).toBe('standard');
  });
});

describe('match with an alcohol class', () => {
  test.each(vectors.filter((x) => x.v.kind === 'match'))('$file', ({ v }) => {
    const r = matchSpec(
      tree,
      TEMPLATES,
      { lines: v.lines },
      v.alcohol ? { alcohol: v.alcohol } : {},
    );
    expect(r.chosen?.templateId).toBe(v.expected.chosen ?? undefined);
    const ids = r.candidates.map((c) => c.templateId);
    for (const id of v.expected.notCandidates ?? []) expect(ids, id).not.toContain(id);
    if (v.expected.distance !== undefined)
      expect(r.candidates[0]!.distance).toBe(v.expected.distance);
  });

  test('without a class the result is the same as with the six root templates', () => {
    for (const { v } of vectors.filter((x) => x.v.kind === 'match')) {
      const a = matchSpec(tree, TEMPLATES, { lines: v.lines });
      const b = matchSpec(tree, ROOT_TEMPLATES, { lines: v.lines });
      expect(a).toEqual(b);
    }
  });
});
