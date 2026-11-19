// Helpers of the vector runners for shipped content: findings and deep comparison with tolerance.
import { expect } from 'vitest';
import type { Vector } from './vector-files';

/** Asserts `actual` equals `expected` deeply; numbers within the vector's absolute tolerance. */
export function closeDeep(actual: unknown, expected: unknown, tolerance: number, at: string): void {
  if (typeof expected === 'number') {
    expect(typeof actual, at).toBe('number');
    expect(
      Math.abs((actual as number) - expected),
      `${at}: ${String(actual)} vs ${expected}`,
    ).toBeLessThanOrEqual(tolerance);
  } else if (Array.isArray(expected)) {
    expect(Array.isArray(actual), at).toBe(true);
    expect((actual as unknown[]).length, `${at} length`).toBe(expected.length);
    expected.forEach((e, i) => closeDeep((actual as unknown[])[i], e, tolerance, `${at}[${i}]`));
  } else if (typeof expected === 'object' && expected !== null) {
    const got = (actual ?? {}) as Record<string, unknown>;
    const keys = Object.keys(got).filter((k) => got[k] !== undefined);
    expect(keys.sort(), `${at} keys`).toEqual(Object.keys(expected).sort());
    for (const [k, v] of Object.entries(expected)) closeDeep(got[k], v, tolerance, `${at}.${k}`);
  } else {
    expect(actual, at).toEqual(expected);
  }
}

/** Runs a validator result against the vector: `expected.ok` or the findings of `error_detail`. */
export function expectValidation(
  result: { ok: boolean; error?: { code: string; findings?: unknown[] } },
  vector: Vector,
): void {
  if (vector.error_code === undefined) {
    expect(result.ok, `${vector.id}: ${JSON.stringify(result)}`).toBe(true);
    return;
  }
  expect(result.ok, vector.id).toBe(false);
  expect(result.error?.code, vector.id).toBe(vector.error_code);
  expect(result.error, vector.id).toMatchObject(vector.error_detail ?? {});
}
