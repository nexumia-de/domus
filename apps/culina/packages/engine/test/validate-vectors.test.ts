// Runs every vector in vectors/validate against `validateModel` (docs/vectors.md):
// `inputs.model` is the model, `expected` is `{ ok, findings }` compared exactly,
// findings in order.
import { mkdtempSync, rmSync } from 'node:fs';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { validateModel } from '../src/index';
import type { ModelInput } from '../src/index';
import { loadVectors } from './vector-files';
import type { Vector } from './vector-files';

const vectors = loadVectors('validate');

function run(vector: Vector): void {
  const i = vector.inputs;
  if (i.kind !== 'validate_model') throw new Error(`${vector.id}: unknown vector kind ${i.kind}`);
  expect(validateModel(i.model as ModelInput), vector.id).toEqual(vector.expected);
}

describe('validate vectors', () => {
  test.each(vectors.map((v) => [v.id, v] as const))('%s', (_id, vector) => run(vector));

  test('every code of the table has a vector', () => {
    const codes = new Set(
      vectors.flatMap((v) => (v.expected?.findings as { code: string }[]).map((f) => f.code)),
    );
    expect([...codes].sort()).toEqual(
      [
        'anchor-not-a-role',
        'cycle',
        'duplicate-id',
        'duplicate-role',
        'invalid-parts',
        'invalid-range',
        'not-root-or-derivative',
        'role-exists',
        'unknown-component',
        'unknown-dish',
        'unknown-family',
        'unknown-ingredient',
        'unknown-parent',
        'unknown-role',
        'unknown-template',
      ].sort(),
    );
  });

  test('unknown kinds are rejected', () => {
    const bogus: Vector = {
      id: 'x',
      description: '',
      inputs: { kind: 'nope' },
      tolerance: 0,
      source: 's',
    };
    expect(() => run(bogus)).toThrow(/unknown vector kind/);
  });

  test('an empty vector folder fails', () => {
    const dir = mkdtempSync(fileURLToPath(new URL('../vectors/empty-', import.meta.url)));
    try {
      expect(() => loadVectors(basename(dir))).toThrow(/no vectors/);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });
});
