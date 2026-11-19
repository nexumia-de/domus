// Runs every vector in vectors/ratios/salt against the engine (docs/vectors.md).
// Mapping: `food_g` and `water_g` are `foodG` and `waterG`.
import { describe, test } from 'vitest';
import { saltFor } from '../src/index';
import type { SaltBasis } from '../src/index';
import { expectError, loadVectors, near } from './vector-files';
import type { Vector } from './vector-files';

const vectors = loadVectors('ratios/salt');

function run(vector: Vector): void {
  const i = vector.inputs;
  if (i.kind !== 'salt_percent') throw new Error(`${vector.id}: unknown vector kind ${i.kind}`);
  const result = saltFor({
    basis: i.basis as SaltBasis,
    pct: i.pct as number,
    ...(i.food_g !== undefined ? { foodG: i.food_g as number } : {}),
    ...(i.water_g !== undefined ? { waterG: i.water_g as number } : {}),
  });
  if (vector.error_code !== undefined) return expectError(result, vector);
  if (!result.ok) throw new Error(`${vector.id}: ${JSON.stringify(result.error)}`);
  const expected = vector.expected as { salt_g: number; total_g: number };
  near(result.saltG, expected.salt_g, vector.tolerance, 'salt_g');
  near(result.totalG, expected.total_g, vector.tolerance, 'total_g');
}

describe('salt vectors', () => {
  test.each(vectors.map((v) => [v.id, v] as const))('%s', (_id, vector) => run(vector));
});
