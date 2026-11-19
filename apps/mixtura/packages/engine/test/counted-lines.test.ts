// Stored counted and top lines: the schemas accept the fields, and balance,
// matching and batching read them from the spec line and the ingredient data
// (docs/units.md#counted-units, docs/balance.md#counted-lines-and-open-amounts).
import { describe, expect, test } from 'vitest';
import { buildTree, computeBalance, lineMl, prediluted, type Ingredient } from '../src/index';
import { makeAjv } from './schema-helpers';

const ajv = makeAjv();
const spec = (line: Record<string, unknown>) => ({
  id: 's',
  lineageId: 's',
  version: 1,
  name: 'S',
  status: 'draft',
  lines: [{ ingredientId: 'i', amount: 1, ...line }],
});
const ok = (id: string, data: unknown) => ajv.getSchema(id)?.(data) === true;

describe('schemas', () => {
  test('a top line may store its volume; no other unit may', () => {
    expect(ok('urn:mixtura:spec', spec({ unit: 'top', topMl: 90 }))).toBe(true);
    expect(ok('urn:mixtura:spec', spec({ unit: 'top' }))).toBe(true);
    expect(ok('urn:mixtura:spec', spec({ unit: 'ml', topMl: 90 }))).toBe(false);
    expect(ok('urn:mixtura:spec', spec({ unit: 'top', topMl: -1 }))).toBe(false);
  });

  test('a counted line is an ordinary line', () => {
    expect(ok('urn:mixtura:spec', spec({ unit: 'whole' }))).toBe(true);
  });

  test('unitVolumes needs a positive volume and its evidence', () => {
    const base = { id: 'egg', name: 'Egg', level: 'product' };
    const uv = (v: unknown) => ({ ...base, unitVolumes: { whole: v } });
    expect(ok('urn:mixtura:ingredient', uv({ ml: 45, evidence: 'assumption' }))).toBe(true);
    expect(ok('urn:mixtura:ingredient', uv({ ml: 0, evidence: 'assumption' }))).toBe(false);
    expect(ok('urn:mixtura:ingredient', uv({ ml: 45 }))).toBe(false);
    expect(ok('urn:mixtura:ingredient', uv({ ml: 45, evidence: 'guess' }))).toBe(false);
  });
});

const tree = (list: Ingredient[]) => {
  const b = buildTree(list);
  if (!b.ok) throw new Error('tree');
  return b.tree;
};
const egg = (unitVolumes?: Ingredient['unitVolumes']): Ingredient[] => [
  { id: 'rum', name: 'Rum', level: 'product', abv: 40, sugar: 0, acid: 0 },
  { id: 'egg', name: 'Egg', level: 'product', abv: 0, sugar: 0, acid: 0, unitVolumes },
];

describe('behaviour', () => {
  test('lineMl reads the volume of a counted line from the ingredient, or says why not', () => {
    const line = { ingredientId: 'egg', amount: 2, unit: 'whole' };
    const known = tree(egg({ whole: { ml: 45, evidence: 'assumption' } }));
    expect(lineMl(line, {}, known)).toEqual({ ml: 90 });
    expect(lineMl(line, {}, tree(egg()))).toEqual({ reason: 'counted-without-volume' });
    expect(lineMl(line)).toEqual({ reason: 'counted-without-volume' });
  });

  test('an excluded counted line names its unit', () => {
    const r = computeBalance(tree(egg()), {
      lines: [
        { ingredientId: 'rum', amount: 60, unit: 'ml' },
        { ingredientId: 'egg', amount: 1, unit: 'whole' },
      ],
    });
    expect(r.ok && r.value.excluded).toEqual([
      { ingredientId: 'egg', reason: 'counted-without-volume', unit: 'whole' },
    ]);
  });

  test('a batch rounds a counted amount up to whole units and keeps the exact amount', () => {
    const t = tree(egg({ whole: { ml: 45, evidence: 'assumption' } }));
    const r = prediluted(
      t,
      {
        method: 'shake',
        lines: [
          { ingredientId: 'rum', amount: 60, unit: 'ml' },
          { ingredientId: 'egg', amount: 0.5, unit: 'whole' },
        ],
      },
      5,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const line = r.value.lines[1];
    expect(line?.exact.value).toBeCloseTo(2.5, 9);
    expect(line?.rounded).toEqual({ value: 3, unit: 'whole' });
    expect(line?.roundingError).toBeCloseTo(22.5, 9);
  });
});
