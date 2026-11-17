// Properties of a prepared ingredient, computed from the lines of its spec
// with the formulas of docs/balance.md (see mixture.ts). The walk over
// nested prepared ingredients and cycles is the general resolver
// (ingredients/prepared.ts); this file passes the mixing formulas.
import { resolvePrepared, type PreparedFold, type SpecLookup } from '../ingredients/prepared';
import type { PreparedError } from '../ingredients/prepared';
import { resolveProperty } from '../ingredients/properties';
import type { IngredientTree } from '../ingredients/tree';
import type { Id } from '../ingredients/types';
import { mix, type Computed, type MixPart, type MixResult } from './mixture';

export interface PreparedProperties {
  /** The yield if the spec has one, else the sum of the lines and the added water. */
  volumeMl: number;
  abv: Computed;
  sugar: Computed;
  acid: Computed;
}

export type PreparedResult =
  { ok: true; value: PreparedProperties } | { ok: false; errors: PreparedError[] };

/** The properties a line takes from its ingredient, and the mixture of a prepared one. */
interface Mixed {
  abv?: number;
  sugar?: number;
  acid?: number;
  mixed?: MixResult;
}

function mixFold(tree: IngredientTree): PreparedFold<Mixed> {
  return {
    raw: (id) => ({
      abv: resolveProperty(tree, id, 'abv').value,
      sugar: resolveProperty(tree, id, 'sugar').value,
      acid: resolveProperty(tree, id, 'acid').value,
    }),
    prepared: (_id, spec, values) => {
      if (!spec) return undefined;
      const parts = spec.lines.map((line, i): MixPart => {
        const v = values[i];
        return {
          id: line.ingredientId,
          ml: line.ml,
          sugarG: line.sugarG,
          abv: v?.abv,
          sugar: v?.sugar,
          acid: v?.acid,
        };
      });
      const mixed = mix(parts, spec.addedWaterMl ?? 0, spec.yieldMl);
      return { abv: mixed.abv.value, sugar: mixed.sugar.value, acid: mixed.acid.value, mixed };
    },
  };
}

/**
 * Computes ABV, sugar, acid and volume of a prepared ingredient from its spec.
 *
 * @param tree - A validated tree.
 * @param specs - Specs of prepared ingredients by spec id; amounts in ml or g.
 * @param id - Id of the prepared ingredient.
 * @returns ABV in percent, sugar in g per 100 ml, acid in percent and volume in ml, or errors (cycle, unknown spec, unit).
 */
export function computePrepared(tree: IngredientTree, specs: SpecLookup, id: Id): PreparedResult {
  const r = resolvePrepared(tree, specs, id, mixFold(tree));
  if (r.errors.length > 0) return { ok: false, errors: r.errors };
  return { ok: true, value: (r.value as Mixed).mixed as MixResult };
}
