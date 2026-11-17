// Runs every vector in vectors/ingredients/ against the ingredient module.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import {
  ancestors,
  buildTree,
  computePrepared,
  descendants,
  distance,
  INHERITED,
  isA,
  resolveCost,
  resolveProperty,
  sameClass,
  substitutesFor,
  swapCandidates,
  type Ingredient,
  type IngredientTree,
  type PreparedSpec,
  type Role,
} from '../src/index';
import { makeAjv, schemas } from './schema-helpers';
import { validate } from './helpers/json-schema';

const dir = fileURLToPath(new URL('../vectors/ingredients/', import.meta.url));
const read = (name: string) => JSON.parse(readFileSync(`${dir}${name}`, 'utf8'));
const vectorSchema = read('ingredient-vector.schema.json');
const files = readdirSync(dir).filter((f) => f.endsWith('.json') && !f.includes('schema'));
const ajv = makeAjv();
const validIngredient = ajv.compile(schemas.ingredient as object);

interface Vector {
  id: string;
  kind: string;
  ingredients: Ingredient[];
  expected: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  queries?: { id: string; role?: string; expected: Record<string, any> }[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  specs?: Record<string, PreparedSpec>;
  query?: string;
  tolerance?: number;
}

function treeOf(v: Vector): IngredientTree {
  const built = buildTree(v.ingredients);
  if (!built.ok) throw new Error(built.errors.map((e) => e.message).join('; '));
  return built.tree;
}

const shape = (r: { value: unknown; from?: string; reason?: string }) =>
  r.value === undefined ? { missing: r.reason } : { value: r.value, from: r.from };

test('there is a vector for every kind of rule', () => {
  const kinds = new Set(files.map((f) => read(f).kind));
  expect([...kinds].sort()).toEqual(
    [
      'inheritance',
      'prepared',
      'substitution',
      'swap-candidates',
      'tree-errors',
      'tree-queries',
    ].sort(),
  );
});

describe.each(files)('%s', (file) => {
  const v = read(file) as Vector;

  test('has the vector shape and valid ingredients', () => {
    expect(validate(vectorSchema, v as never)).toEqual([]);
    expect(v.id).toBe(file.replace(/\.json$/, ''));
    for (const ing of v.ingredients) {
      validIngredient(ing);
      expect(validIngredient.errors ?? [], ing.id).toEqual([]);
    }
  });

  test('engine reproduces the expected values', () => {
    if (v.kind === 'tree-errors') {
      const built = buildTree(v.ingredients);
      expect(built.ok).toBe(false);
      if (built.ok) return;
      expect(built.errors.map((e) => ({ code: e.code, ids: e.ids }))).toEqual(v.expected.errors);
      for (const e of built.errors) for (const id of e.ids) expect(e.message).toContain(id);
    } else if (v.kind === 'inheritance') {
      const tree = treeOf(v);
      for (const q of v.queries ?? []) {
        for (const [prop, want] of Object.entries(q.expected)) {
          const got =
            prop === 'cost'
              ? resolveCost(tree, q.id)
              : resolveProperty(tree, q.id, prop as (typeof INHERITED)[number]);
          expect(shape(got), `${q.id}.${prop}`).toEqual(want);
        }
      }
    } else if (v.kind === 'tree-queries') {
      const tree = treeOf(v);
      for (const [id, want] of Object.entries(v.expected.ancestors)) {
        expect(ancestors(tree, id) ?? null).toEqual(want);
      }
      for (const [id, want] of Object.entries(v.expected.descendants)) {
        expect(descendants(tree, id) ?? null).toEqual(want);
      }
      for (const c of v.expected.isA) expect(isA(tree, c.child, c.ancestor)).toBe(c.result);
      for (const c of v.expected.distance) {
        expect(distance(tree, c.a, c.b) ?? null).toBe(c.result);
        expect(distance(tree, c.b, c.a) ?? null).toBe(c.result);
      }
    } else if (v.kind === 'substitution') {
      const tree = treeOf(v);
      for (const [id, want] of Object.entries(v.expected.substitutesFor)) {
        expect(substitutesFor(tree, id), id).toEqual(want);
      }
      for (const c of v.expected.sameClass) {
        expect(sameClass(tree, c.a, c.b)).toBe(c.result);
        expect(sameClass(tree, c.b, c.a)).toBe(c.result);
      }
    } else if (v.kind === 'swap-candidates') {
      const tree = treeOf(v);
      for (const q of v.queries ?? []) {
        const { role } = q as { role?: Role };
        expect(swapCandidates(tree, q.id, role ? { role } : {}), `${q.id} ${role ?? ''}`).toEqual(
          q.expected,
        );
      }
    } else {
      const tree = treeOf(v);
      const specs = new Map(Object.entries(v.specs ?? {}));
      const got = computePrepared(tree, specs, v.query as string);
      if (v.expected.errors) {
        expect(got.ok).toBe(false);
        if (got.ok) return;
        expect(got.errors.map((e) => ({ code: e.code, ids: e.ids }))).toEqual(v.expected.errors);
        return;
      }
      expect(got.ok).toBe(true);
      if (!got.ok) return;
      const tol = v.tolerance as number;
      const num = (c: { value: number | undefined }) => c.value;
      expect(got.value.volumeMl).toBeCloseTo(v.expected.volume_ml, -Math.log10(tol));
      for (const [key, c] of [
        ['abv_pct', got.value.abv],
        ['sugar_g_per_100ml', got.value.sugar],
        ['acid_pct', got.value.acid],
      ] as const) {
        if (key in v.expected) expect(num(c)).toBeCloseTo(v.expected[key], -Math.log10(tol));
      }
      if (v.expected.sugar_missing) {
        expect(got.value.sugar.value).toBeUndefined();
        expect('reason' in got.value.sugar && got.value.sugar.reason).toBe(
          v.expected.sugar_missing,
        );
      }
    }
  });
});

test('a prepared ingredient never inherits abv, sugar or acid from its ancestors', () => {
  const built = buildTree([
    { id: 'syrup', name: 'Syrup', level: 'category', sugar: 60 },
    {
      id: 'mine',
      name: 'Mine',
      level: 'type',
      parentId: 'syrup',
      prepared: { specId: 's', yield: { amount: 1, unit: 'l' } },
    },
  ]);
  if (!built.ok) throw new Error('tree');
  expect(resolveProperty(built.tree, 'mine', 'sugar').value).toBeUndefined();
});
