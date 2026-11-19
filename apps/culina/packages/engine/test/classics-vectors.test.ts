// Runs every vector in vectors/classics against the engine (docs/vectors.md): validation of a
// classic, its derived amounts, its copy into the notebook and the list of wanted lines.
import { describe, expect, test } from 'vitest';
import { copyClassic, deriveClassic, validateClassic, wantedLines } from '../src/index';
import type { Classic, Lang, Technique } from '../src/index';
import { closeDeep, expectValidation } from './content-vectors';
import { expectError, loadVectors } from './vector-files';
import type { Vector } from './vector-files';

interface Inputs {
  classic: Classic;
  lang: Lang;
  portions?: number;
}

const options = (i: Inputs): { lang: Lang; portions?: number } => ({
  lang: i.lang,
  ...(i.portions === undefined ? {} : { portions: i.portions }),
});

function derive(vector: Vector): void {
  const i = vector.inputs as unknown as Inputs;
  const result = deriveClassic(i.classic, options(i));
  if (vector.error_code !== undefined) return expectError(result, vector);
  if (!result.ok) throw new Error(`${vector.id}: ${result.error.code}`);
  const shown = JSON.parse(JSON.stringify(result)) as Record<string, unknown>;
  delete shown.ok;
  closeDeep(shown, vector.expected, vector.tolerance, vector.id);
}

function copy(vector: Vector): void {
  const i = vector.inputs as unknown as Inputs & {
    date: string;
    ids: string[];
    ingredient_ids?: Record<string, string>;
  };
  let next = 0;
  const result = copyClassic(i.classic, {
    ...options(i),
    date: i.date,
    newId: () => i.ids[next++] as string,
    ...(i.ingredient_ids === undefined ? {} : { ingredientIds: i.ingredient_ids }),
  });
  if (vector.error_code !== undefined) return expectError(result, vector);
  if (!result.ok) throw new Error(`${vector.id}: ${result.error.code}`);
  const shown = JSON.parse(JSON.stringify(result)) as Record<string, unknown>;
  delete shown.ok;
  closeDeep(shown, vector.expected, vector.tolerance, vector.id);
}

describe('classic vectors', () => {
  for (const vector of loadVectors('classics')) {
    test(vector.id, () => {
      const i = vector.inputs;
      switch (i.kind) {
        case 'classic_validate':
          return expectValidation(
            validateClassic(i.classic as Classic, {
              techniques: i.techniques as Technique[],
              ...(i.ingredient_ids === undefined
                ? {}
                : { ingredientIds: new Set(i.ingredient_ids as string[]) }),
            }),
            vector,
          );
        case 'classic_derive':
          return derive(vector);
        case 'classic_copy':
          return copy(vector);
        case 'classic_wanted':
          return expect(
            wantedLines(i.classic as Classic).map((w) => ({ path: w.path, ...w.wanted })),
          ).toEqual((vector.expected as { wanted: unknown[] }).wanted);
        default:
          throw new Error(`${vector.id}: unknown kind ${i.kind}`);
      }
    });
  }
});
