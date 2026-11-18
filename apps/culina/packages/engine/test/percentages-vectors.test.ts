// Runs every vector in vectors/percentages against the engine (docs/vectors.md).
// Mapping of the vector fields: `name` is the line id; `is_flour` true gives
// the role `flour`; in a formula without `is_flour` a line named `flour` is
// flour; in a `bakers_percent` vector the line named `water` has the role
// `water` for `hydration_pct`.
import { describe, expect, test } from 'vitest';
import { bakersPercent, fromBakersPercent, hydration } from '../src/index';
import type { BakersLine, FormulaLine, HydrationLine } from '../src/index';
import { expectError, loadVectors, near, nearRecord } from './vector-files';
import type { Vector } from './vector-files';

const vectors = loadVectors('percentages');

interface NamedLine {
  name: string;
  g?: number;
  pct?: number;
  is_flour?: boolean;
}

function run(vector: Vector): void {
  const i = vector.inputs;
  const tol = vector.tolerance;
  const failing = vector.error_code !== undefined;
  const expected = (vector.expected ?? {}) as {
    flour_g: number;
    dough_g: number;
    total_pct: number;
    hydration_pct: number;
    water_g: number;
    pct: Record<string, number>;
    g: Record<string, number>;
  };
  switch (i.kind) {
    case 'bakers_percent': {
      const named = i.lines as NamedLine[];
      const lines: BakersLine[] = named.map((l) => ({
        id: l.name,
        g: l.g as number,
        ...(l.is_flour ? { role: 'flour' } : {}),
      }));
      const result = bakersPercent(lines);
      if (failing) return expectError(result, vector);
      if (!result.ok) throw new Error(`${vector.id}: ${JSON.stringify(result.error)}`);
      near(result.flourG, expected.flour_g, tol, 'flour_g');
      near(result.doughG, expected.dough_g, tol, 'dough_g');
      near(result.totalPct, expected.total_pct, tol, 'total_pct');
      nearRecord(result.pct, expected.pct, tol, 'pct');
      const forHydration: HydrationLine[] = lines.map((l) =>
        l.id === 'water' ? { ...l, role: 'water' } : l,
      );
      const wet = hydration(forHydration);
      if (!wet.ok) throw new Error(vector.id);
      near(wet.hydrationPct, expected.hydration_pct, tol, 'hydration_pct');
      return;
    }
    case 'scale_bakers': {
      const formula: FormulaLine[] = (i.formula as NamedLine[]).map((l) => ({
        id: l.name,
        pct: l.pct as number,
        ...(l.is_flour === true || (l.is_flour === undefined && l.name === 'flour')
          ? { role: 'flour' }
          : {}),
      }));
      const target =
        i.target_dough_g !== undefined
          ? { doughG: i.target_dough_g as number }
          : { flourG: i.target_flour_g as number };
      const result = fromBakersPercent(formula, target);
      if (failing) return expectError(result, vector);
      if (!result.ok) throw new Error(`${vector.id}: ${JSON.stringify(result.error)}`);
      near(result.flourG, expected.flour_g, tol, 'flour_g');
      near(result.doughG, expected.dough_g, tol, 'dough_g');
      nearRecord(result.g, expected.g, tol, 'g');
      return;
    }
    case 'hydration': {
      const waterRoles = i.water_roles as string[] | undefined;
      const result = hydration(i.lines as HydrationLine[], waterRoles ? { waterRoles } : {});
      if (failing) return expectError(result, vector);
      if (!result.ok) throw new Error(`${vector.id}: ${JSON.stringify(result.error)}`);
      near(result.hydrationPct, expected.hydration_pct, tol, 'hydration_pct');
      near(result.flourG, expected.flour_g, tol, 'flour_g');
      near(result.waterG, expected.water_g, tol, 'water_g');
      expect(result.notCounted).toEqual(vector.expected?.not_counted);
      return;
    }
    default:
      throw new Error(`${vector.id}: unknown vector kind ${String(i.kind)}`);
  }
}

describe('percentages vectors', () => {
  test.each(vectors.map((v) => [v.id, v] as const))('%s', (_id, vector) => run(vector));
});
