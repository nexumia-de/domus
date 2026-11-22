// Runs every vector in vectors/makeable against the public entry (docs/vectors.md): what the
// stock allows, ranked, the ranking of a mixed list, the stock that can play a role and what uses an
// ingredient. The expected value is a subset of the result (arrays by position and length);
// `urgency: null` means no urgency.
import { describe, expect, test } from 'vitest';
import { makeable, rankCandidates, stockForRole, usesIngredient } from '../src/index';
import type { MakeableInput, RankedCandidate } from '../src/index';
import { expectError, loadVectors } from './vector-files';
import type { Vector } from './vector-files';

type Expected = {
  candidates?: Record<string, unknown>[];
  useUpFirst?: unknown[];
  items?: unknown[];
};

/** `urgency: null` in an expected candidate asserts that the result has none. */
function withoutUrgency(expected: Record<string, unknown>[], got: Record<string, unknown>[]): void {
  expected.forEach((e, i) => {
    if (e.urgency === null) {
      expect(got[i]?.urgency, `${String(e.id)}: urgency`).toBeUndefined();
      delete e.urgency;
    }
  });
}

function run(vector: Vector): void {
  const input = vector.inputs as unknown as MakeableInput & {
    kind: string;
    role?: string;
    ingredientId?: string;
  };
  if (input.kind === 'uses_ingredient') {
    const result = usesIngredient(input, input.ingredientId as string);
    if (vector.error_code !== undefined) return expectError(result as never, vector);
    if (!result.ok) throw new Error(`${vector.id}: ${result.error.code}`);
    expect(result.records).toEqual((vector.expected as { records: unknown[] }).records);
    return;
  }
  if (input.kind === 'rank_candidates') {
    // Also reversed: the order must not depend on the input's.
    const list = (vector.inputs as unknown as { candidates: RankedCandidate[] }).candidates;
    const keys = (l: readonly RankedCandidate[]) => l.map((c) => `${c.kind}:${c.id}`);
    const want = (vector.expected as { order: string[] }).order;
    expect(keys(rankCandidates(list))).toEqual(want);
    expect(keys(rankCandidates([...list].reverse()))).toEqual(want);
    return;
  }
  if (input.kind === 'stock_for_role') {
    const result = stockForRole(input, input.role as string);
    if (!result.ok) throw new Error(`${vector.id}: ${result.error.code}`);
    expect(result.items).toEqual((vector.expected as Expected).items);
    return;
  }
  const result = makeable(input);
  if (vector.error_code !== undefined) return expectError(result as never, vector);
  if (!result.ok) throw new Error(`${vector.id}: ${result.error.code}`);
  const e = structuredClone(vector.expected) as Expected;
  if (e.candidates !== undefined) {
    withoutUrgency(e.candidates, result.candidates as never);
    expect(result.candidates.length, `${vector.id}: candidates`).toBe(e.candidates.length);
    expect(result.candidates).toMatchObject(e.candidates);
  }
  if (e.useUpFirst !== undefined) {
    expect(result.useUpFirst.length, `${vector.id}: useUpFirst`).toBe(e.useUpFirst.length);
    expect(result.useUpFirst).toMatchObject(e.useUpFirst);
  }
}

describe('makeable vectors', () => {
  for (const vector of loadVectors('makeable')) test(vector.id, () => run(vector));
});
