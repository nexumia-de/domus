// Runs every vector in vectors/nutrition against the engine (docs/vectors.md): the nutrition of a
// derived dish per portion with its coverage, and the display rounding.
import { describe, expect, test } from 'vitest';
import { dishNutrition, lineFigures, roundNutrition } from '../src/index';
import type {
  DerivedComponent,
  DerivedDish,
  FactsByIngredient,
  FigureRecord,
  NutritionById,
  PortionNutrients,
} from '../src/index';
import { closeDeep } from './content-vectors';
import { expectError, loadVectors } from './vector-files';
import type { Vector } from './vector-files';

function dish(vector: Vector): void {
  const i = vector.inputs as unknown as {
    derived: { dish: DerivedDish; components: DerivedComponent[] };
    facts: FactsByIngredient;
    nutrition: NutritionById;
    seasonings?: string[];
  };
  const result = dishNutrition(i.derived, {
    facts: i.facts,
    nutrition: i.nutrition,
    ...(i.seasonings === undefined ? {} : { seasonings: i.seasonings }),
  });
  if (vector.error_code !== undefined) return expectError(result, vector);
  if (!result.ok) throw new Error(`${vector.id}: ${result.error.code}`);
  const shown = JSON.parse(JSON.stringify(result)) as Record<string, unknown>;
  delete shown.ok;
  closeDeep(shown, vector.expected, vector.tolerance, vector.id);
}

function figures(vector: Vector): void {
  const i = vector.inputs as unknown as { records: Record<string, FigureRecord>; ids: string[] };
  const shown = Object.fromEntries(
    i.ids.map((id) => [id, JSON.parse(JSON.stringify(lineFigures(id, (r) => i.records[r])))]),
  ) as Record<string, unknown>;
  closeDeep(shown, vector.expected, vector.tolerance, vector.id);
}

function round(vector: Vector): void {
  const i = vector.inputs as unknown as { figures: PortionNutrients };
  const result = roundNutrition(i.figures);
  if (vector.error_code !== undefined) return expectError(result, vector);
  if (!result.ok) throw new Error(`${vector.id}: ${result.error.code}`);
  closeDeep({ rounded: result.rounded }, vector.expected, vector.tolerance, vector.id);
}

describe('nutrition vectors', () => {
  for (const vector of loadVectors('nutrition')) {
    test(vector.id, () => {
      switch (vector.inputs.kind) {
        case 'nutrition_dish':
          return dish(vector);
        case 'nutrition_figures':
          return figures(vector);
        case 'nutrition_round':
          return round(vector);
        default:
          expect.unreachable(`${vector.id}: unknown kind ${vector.inputs.kind}`);
      }
    });
  }
});
