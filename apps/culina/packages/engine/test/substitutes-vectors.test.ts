// Runs every vector in vectors/substitutes against the public entry (docs/vectors.md): the rules a
// substitute file must meet and which substitutes apply to an ingredient.
import { describe, expect, test } from 'vitest';
import { substituteEffects, validateSubstitute, validateSubstitutes } from '../src/index';
import type { Substitute } from '../src/index';
import { expectValidation } from './content-vectors';
import { loadVectors } from './vector-files';

describe('substitute vectors', () => {
  for (const vector of loadVectors('substitutes')) {
    test(vector.id, () => {
      const i = vector.inputs;
      const checks =
        i.ingredient_ids === undefined
          ? {}
          : { ingredientIds: new Set(i.ingredient_ids as string[]) };
      switch (i.kind) {
        case 'substitute_validate':
          return expectValidation(validateSubstitute(i.substitute as Substitute, checks), vector);
        case 'substitute_list_validate':
          return expectValidation(
            validateSubstitutes(i.substitutes as Substitute[], checks),
            vector,
          );
        case 'substitute_lookup': {
          const found = substituteEffects(
            i.ingredient_id as string,
            i.ingredients as { id: string; parentId?: string }[],
            i.substitutes as Substitute[],
          );
          return expect(found.map((s) => s.id)).toEqual((vector.expected as { ids: string[] }).ids);
        }
        default:
          throw new Error(`${vector.id}: unknown kind ${i.kind}`);
      }
    });
  }
});
