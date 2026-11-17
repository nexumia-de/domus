// Properties of a prepared ingredient, computed from the lines of its spec
// with the formulas of docs/balance.md (see mixture.ts). Nested prepared
// ingredients resolve recursively; a cycle is an error naming the ids.
import { mix, type Computed, type MixPart } from './mixture';
import { resolveProperty } from './properties';
import type { IngredientTree } from './tree';
import type { Id } from './types';

/** A line of a prepared ingredient's spec, already in ml (and g of solid sugar). */
export interface PreparedLine {
  ingredientId: Id;
  ml: number;
  sugarG?: number;
}

export interface PreparedSpec {
  lines: readonly PreparedLine[];
  /** Water added on top of the lines, in ml. */
  addedWaterMl?: number;
  /**
   * What one run yields, in ml. When given it is the volume of the result
   * (solid sugar dissolves into less than the sum of its parts); the totals
   * of ethanol, sugar and acid are conserved. Absent: volumes add.
   */
  yieldMl?: number;
}

export interface PreparedProperties {
  /** The yield if the spec has one, else the sum of the lines and the added water. */
  volumeMl: number;
  abv: Computed;
  sugar: Computed;
  acid: Computed;
}

export type PreparedErrorCode =
  'prepared-cycle' | 'unknown-ingredient' | 'unknown-spec' | 'not-prepared';

export interface PreparedError {
  code: PreparedErrorCode;
  ids: Id[];
  message: string;
}

export type PreparedResult =
  { ok: true; value: PreparedProperties } | { ok: false; errors: PreparedError[] };

/** Specs by spec id (`prepared.specId` of an ingredient). */
export type SpecLookup = ReadonlyMap<Id, PreparedSpec>;

function compute(
  tree: IngredientTree,
  specs: SpecLookup,
  id: Id,
  stack: readonly Id[],
): PreparedResult {
  const item = tree.byId.get(id);
  if (!item) {
    return {
      ok: false,
      errors: [
        { code: 'unknown-ingredient', ids: [...stack, id], message: `unknown ingredient ${id}` },
      ],
    };
  }
  if (!item.prepared) {
    return {
      ok: false,
      errors: [{ code: 'not-prepared', ids: [id], message: `${id} is not a prepared ingredient` }],
    };
  }
  if (stack.includes(id)) {
    const ids = [...stack.slice(stack.indexOf(id)), id];
    return {
      ok: false,
      errors: [
        { code: 'prepared-cycle', ids, message: `prepared ingredient cycle: ${ids.join(' -> ')}` },
      ],
    };
  }
  const spec = specs.get(item.prepared.specId);
  if (!spec) {
    const ids = [id, item.prepared.specId];
    return {
      ok: false,
      errors: [
        {
          code: 'unknown-spec',
          ids,
          message: `${id} refers to spec ${item.prepared.specId}, which is not known`,
        },
      ],
    };
  }

  const errors: PreparedError[] = [];
  const parts: MixPart[] = [];
  for (const line of spec.lines) {
    const part: MixPart = { id: line.ingredientId, ml: line.ml, sugarG: line.sugarG };
    const target = tree.byId.get(line.ingredientId);
    if (!target) {
      errors.push({
        code: 'unknown-ingredient',
        ids: [id, line.ingredientId],
        message: `${id}: unknown ingredient ${line.ingredientId}`,
      });
    } else if (target.prepared) {
      const nested = compute(tree, specs, line.ingredientId, [...stack, id]);
      if (nested.ok) {
        part.abv = nested.value.abv.value;
        part.sugar = nested.value.sugar.value;
        part.acid = nested.value.acid.value;
      } else errors.push(...nested.errors);
    } else {
      part.abv = resolveProperty(tree, line.ingredientId, 'abv').value;
      part.sugar = resolveProperty(tree, line.ingredientId, 'sugar').value;
      part.acid = resolveProperty(tree, line.ingredientId, 'acid').value;
    }
    parts.push(part);
  }
  if (errors.length > 0) {
    const seen = new Set<string>();
    return { ok: false, errors: errors.filter((e) => !seen.has(e.message) && seen.add(e.message)) };
  }
  const mixed = mix(parts, spec.addedWaterMl ?? 0, spec.yieldMl);
  return { ok: true, value: mixed };
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
  return compute(tree, specs, id, []);
}
