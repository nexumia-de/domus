// Runs every vector in vectors/units against the engine (docs/vectors.md).
import { describe, expect, test } from 'vitest';
import {
  convert,
  displayStep,
  roundMass,
  scaleByFactor,
  scaleFromLine,
  scaleToTotal,
} from '../src/index';
import type {
  Amount,
  FactsById,
  IngredientFacts,
  ScalableLine,
  ScaleOptions,
  ScaleResult,
  UnitId,
} from '../src/index';
import { expectError, loadVectors, near, nearRecord } from './vector-files';
import type { Vector } from './vector-files';

const vectors = loadVectors('units');

function runScale(result: ScaleResult, vector: Vector): void {
  if (vector.error_code !== undefined) return expectError(result, vector);
  if (!result.ok) throw new Error(`${vector.id}: ${JSON.stringify(result.error)}`);
  const expected = vector.expected as {
    factor: number;
    values: Record<string, number>;
    unscaled: unknown[];
    cautions: string[];
  };
  near(result.factor, expected.factor, vector.tolerance, 'factor');
  const values = Object.fromEntries(
    result.lines.flatMap((l) => (l.amount ? [[l.id, l.amount.value]] : [])),
  );
  nearRecord(values, expected.values, vector.tolerance, 'values');
  expect(result.unscaled).toEqual(expected.unscaled);
  expect(result.cautions).toEqual(expected.cautions);
}

function run(vector: Vector): void {
  const i = vector.inputs;
  const options: ScaleOptions = i.salt_roles ? { saltRoles: i.salt_roles as string[] } : {};
  switch (i.kind) {
    case 'convert': {
      const result = convert(i.amount as Amount, i.to as UnitId, i.facts as IngredientFacts);
      if (vector.error_code !== undefined) return expectError(result, vector);
      if (!result.ok) throw new Error(`${vector.id}: ${JSON.stringify(result.error)}`);
      expect(result.amount.unit).toBe(i.to);
      near(
        result.amount.value,
        (vector.expected as { value: number }).value,
        vector.tolerance,
        'value',
      );
      return;
    }
    case 'round': {
      const g = i.g as number;
      const step = i.step_g === undefined ? displayStep(g) : (i.step_g as number);
      const result = roundMass(g, step);
      if (vector.error_code !== undefined) return expectError(result, vector);
      if (!result.ok) throw new Error(`${vector.id}: ${JSON.stringify(result.error)}`);
      near(result.g, (vector.expected as { g: number }).g, vector.tolerance, 'g');
      return;
    }
    case 'scale_factor':
      return runScale(
        scaleByFactor(i.lines as ScalableLine[], i.factor as number, options),
        vector,
      );
    case 'scale_total':
      return runScale(
        scaleToTotal(
          i.lines as ScalableLine[],
          i.target_g as number,
          (i.facts_by_id ?? {}) as FactsById,
          options,
        ),
        vector,
      );
    case 'scale_line':
      return runScale(
        scaleFromLine(
          i.lines as ScalableLine[],
          i.line_id as string,
          i.have as Amount,
          (i.facts_by_id ?? {}) as FactsById,
          options,
        ),
        vector,
      );
    default:
      throw new Error(`${vector.id}: unknown vector kind ${String(i.kind)}`);
  }
}

describe('units vectors', () => {
  test.each(vectors.map((v) => [v.id, v] as const))('%s', (_id, vector) => run(vector));
});
