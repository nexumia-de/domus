// Shared by the vector runners: reads every JSON file of a vector folder.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect } from 'vitest';

/** The envelope of docs/vectors.md; `inputs` and `expected` depend on `kind`. */
export interface Vector {
  id: string;
  description: string;
  inputs: { kind: string; [field: string]: unknown };
  expected?: Record<string, unknown>;
  error_code?: string;
  error_line_id?: string;
  tolerance: number;
  source: string;
}

/**
 * Loads all vectors of a folder under `packages/engine/vectors`; fails when
 * the folder is empty or a file's `id` differs from its name.
 */
export function loadVectors(folder: string): Vector[] {
  const dir = fileURLToPath(new URL(`../vectors/${folder}/`, import.meta.url));
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  expect(files.length, `no vectors in ${folder}`).toBeGreaterThan(0);
  return files.map((file) => {
    const vector = JSON.parse(readFileSync(dir + file, 'utf8')) as Vector;
    expect(vector.id, file).toBe(file.replace(/\.json$/, ''));
    expect(vector.source.length, `${file} names no source`).toBeGreaterThan(0);
    return vector;
  });
}

/** Asserts a number equals the expected one within the vector's absolute tolerance. */
export function near(actual: number, expected: number, tolerance: number, what: string): void {
  expect(Math.abs(actual - expected), `${what}: ${actual} vs ${expected}`).toBeLessThanOrEqual(
    tolerance,
  );
}

/** Asserts every named number of `expected` is in `actual` within tolerance. */
export function nearRecord(
  actual: Record<string, number>,
  expected: Record<string, number>,
  tolerance: number,
  what: string,
): void {
  expect(Object.keys(actual).sort(), what).toEqual(Object.keys(expected).sort());
  for (const [key, value] of Object.entries(expected)) {
    near(actual[key] as number, value, tolerance, `${what}.${key}`);
  }
}

/** Asserts an error result has the vector's `error_code` (and line id when given). */
export function expectError(
  result: { ok: boolean; error?: { code: string; lineId?: string } },
  vector: Vector,
): void {
  expect(result.ok, vector.id).toBe(false);
  expect(result.error?.code, vector.id).toBe(vector.error_code);
  if (vector.error_line_id !== undefined) {
    expect(result.error?.lineId, vector.id).toBe(vector.error_line_id);
  }
}
