// Runs every vector in vectors/classics-makeable against the public entry (docs/vectors.md): the
// shipped classics against the stock, with water left out and `wanted` lines named apart. The
// expected value is a subset of the result (arrays by position and length); `urgency: null` means
// no urgency.
import { describe, expect, test } from 'vitest';
import { classicsMakeable } from '../src/index';
import type { ClassicsMakeableInput } from '../src/index';
import { expectError, loadVectors } from './vector-files';

describe('classics makeable vectors', () => {
  for (const vector of loadVectors('classics-makeable')) {
    test(vector.id, () => {
      const result = classicsMakeable(vector.inputs as unknown as ClassicsMakeableInput);
      if (vector.error_code !== undefined) return expectError(result as never, vector);
      if (!result.ok) throw new Error(`${vector.id}: ${result.error.code}`);
      const expected = structuredClone(vector.expected) as {
        candidates: Record<string, unknown>[];
      };
      expected.candidates.forEach((e, i) => {
        if (e.urgency === null) {
          expect(result.candidates[i]?.urgency, `${String(e.id)}: urgency`).toBeUndefined();
          delete e.urgency;
        }
      });
      expect(result.candidates.length, `${vector.id}: candidates`).toBe(expected.candidates.length);
      expect(result.candidates).toMatchObject(expected.candidates);
    });
  }
});
