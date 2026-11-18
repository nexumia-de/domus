// Unit tests of `validateModel` beyond the vectors: the schema examples, never
// throwing, and that input records are not changed.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { validateModel } from '../src/index';
import type { ModelInput } from '../src/index';

const example = (name: string): Record<string, unknown> =>
  JSON.parse(
    readFileSync(
      fileURLToPath(new URL(`../schemas/examples/${name}.valid.json`, import.meta.url)),
      'utf8',
    ),
  ) as Record<string, unknown>;

const collections = {
  ingredient: 'ingredients',
  template: 'templates',
  component: 'components',
  dish: 'dishes',
  stock: 'stock',
  affinity: 'affinities',
} as const;

// code:ref of every finding expected when the example is the only record of the model
const alone: Record<keyof typeof collections, string[]> = {
  ingredient: ['unknown-parent:alliums'],
  template: [],
  component: [
    'unknown-ingredient:wheat-flour',
    'unknown-ingredient:water',
    'unknown-ingredient:salt',
    'unknown-component:u-3f1c2a52-8d1e-4b7a-9c01-5a1e0c0ffee3',
  ],
  dish: [
    'unknown-ingredient:carrot',
    'unknown-component:u-3f1c2a52-8d1e-4b7a-9c01-5a1e0c0ffee3',
    'unknown-ingredient:hazelnut',
    'unknown-parent:u-3f1c2a52-8d1e-4b7a-9c01-5a1e0c0ffee1',
  ],
  stock: ['unknown-component:u-3f1c2a52-8d1e-4b7a-9c01-5a1e0c0ffee3'],
  affinity: ['unknown-ingredient:carrot', 'unknown-ingredient:hazelnut'],
};

const referenceCodes = [
  'unknown-ingredient',
  'unknown-component',
  'unknown-template',
  'unknown-parent',
  'unknown-family',
];

describe('schema examples put into a model alone', () => {
  // Asserted: every finding is a reference code with a `ref` that is the id of no
  // record in the model (nothing else: no cycle, anchor, range, duplicate, structure
  // finding), and the list of code:ref equals the references in the example.
  test.each(Object.entries(collections))('%s.valid.json', (kind, collection) => {
    const record = example(kind) as { id: string };
    const result = validateModel({ [collection]: [record] } as ModelInput);
    for (const f of result.findings) {
      expect(referenceCodes, JSON.stringify(f)).toContain(f.code);
      expect(f.ref, JSON.stringify(f)).toBeDefined();
      expect(f.ref).not.toBe(record.id);
    }
    expect(result.findings.map((f) => `${f.code}:${f.ref}`)).toEqual(
      alone[kind as keyof typeof collections],
    );
    expect(result.ok).toBe(alone[kind as keyof typeof collections].length === 0);
  });

  test('export.valid.json: only references to records not in the file (of the kind referred to)', () => {
    const file = example('export') as ModelInput;
    const result = validateModel(file);
    const idsIn = (collection: string): string[] =>
      ((file as Record<string, { id: string }[]>)[collection] ?? []).map((r) => r.id);
    const pointsTo: Record<string, string> = {
      'unknown-ingredient': 'ingredients',
      'unknown-component': 'components',
      'unknown-template': 'templates',
    };
    expect(result.findings.length).toBeGreaterThan(0);
    for (const f of result.findings) {
      expect(referenceCodes, JSON.stringify(f)).toContain(f.code);
      const collection = pointsTo[f.code] ?? collections[f.kind];
      expect(idsIn(collection), JSON.stringify(f)).not.toContain(f.ref);
    }
  });
});

describe('validateModel', () => {
  test('collects every finding and ok is false', () => {
    const result = validateModel({
      ingredients: [{ id: 'a', parentId: 'x' }],
      stock: [{ id: 's', ref: { kind: 'component', id: 'y' } }],
    });
    expect(result.ok).toBe(false);
    expect(result.findings.map((f) => f.code)).toEqual(['unknown-parent', 'unknown-component']);
  });

  test('an empty model is ok', () => {
    expect(validateModel({})).toEqual({ ok: true, findings: [] });
  });

  test('does not change its input', () => {
    const model: ModelInput = {
      ingredients: [
        { id: 'a', parentId: 'b' },
        { id: 'b', parentId: 'a' },
      ],
    };
    const before = JSON.stringify(model);
    validateModel(model);
    expect(JSON.stringify(model)).toBe(before);
  });

  test('a long parent chain is checked without error', () => {
    const ingredients = Array.from({ length: 500 }, (_, i) =>
      i === 0 ? { id: 'n0' } : { id: `n${i}`, parentId: `n${i - 1}` },
    );
    const templates = ingredients.map((r) => ({
      id: r.id,
      name: r.id,
      source: 'user',
      ...('parentId' in r
        ? { parentId: r.parentId, changes: [{ op: 'add' as const, role: r.id, parts: 1 }] }
        : { parts: [{ role: 'base', parts: 1 }] }),
    }));
    expect(validateModel({ ingredients, templates })).toEqual({ ok: true, findings: [] });
  });
});
