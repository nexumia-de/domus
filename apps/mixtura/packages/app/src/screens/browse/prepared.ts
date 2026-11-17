// The prepared ingredients' specs as the engine reads them: each spec line in
// ml (or g of solid sugar) and the yield in ml, keyed by spec id. The engine
// computes ABV, sugar and acid of a prepared ingredient from this
// (docs/ingredients.md); nothing derived is stored. A spec whose lines
// cannot all be measured is left out, so its properties stay unknown and the
// balance names the ingredient instead of guessing.

import {
  lineMl,
  resolveProperty,
  toGrams,
  toMl,
  UNITS,
  type IngredientTree,
  type PreparedLine,
  type PreparedSpec,
  type UnitId,
} from '@mixtura/engine';
import type { Ingredient, SpecData, SpecLine } from './types';

const KIND = new Map<string, string>(UNITS.map((u) => [u.id, u.kind]));

/** One line of a prepared ingredient's spec, or why it cannot be measured. */
export function preparedLine(tree: IngredientTree, line: SpecLine): PreparedLine | undefined {
  const kind = KIND.get(line.unit);
  if (kind === 'mass') {
    const grams = toGrams({ value: line.amount, unit: line.unit as UnitId });
    const sugar = resolveProperty(tree, line.ingredientId, 'sugar').value;
    if (!grams.ok || sugar === undefined) return undefined;
    return { ingredientId: line.ingredientId, ml: 0, sugarG: (grams.value * sugar) / 100 };
  }
  const volume = lineMl(line, {}, tree);
  return 'ml' in volume ? { ingredientId: line.ingredientId, ml: volume.ml } : undefined;
}

/** The yield of a prepared ingredient in ml; absent for a mass (volumes add then). */
export function yieldMl(prepared: NonNullable<Ingredient['prepared']>): number | undefined {
  const ml = toMl({ value: prepared.yield.amount, unit: prepared.yield.unit as UnitId });
  return ml.ok ? ml.value : undefined;
}

export function preparedLookup(
  tree: IngredientTree,
  ingredients: readonly Ingredient[],
  specs: ReadonlyMap<string, SpecData>,
): Map<string, PreparedSpec> {
  const out = new Map<string, PreparedSpec>();
  for (const item of ingredients) {
    const prepared = item.prepared;
    const spec = prepared ? specs.get(prepared.specId) : undefined;
    if (!prepared || !spec) continue;
    const lines = spec.lines.map((line) => preparedLine(tree, line));
    if (lines.some((l) => l === undefined)) continue;
    const ml = yieldMl(prepared);
    out.set(spec.id, {
      lines: lines as PreparedLine[],
      ...(ml !== undefined && { yieldMl: ml }),
    });
  }
  return out;
}
