// Sorts the computed ABV of a spec after dilution into none, low, standard or
// unknown against thresholds that are passed in as data (docs/non-alcoholic.md).
// Pure: it reads the balance figures and, for lines balance did not count, the tree.
import type { BalanceFigures } from '../balance/types';
import { resolveProperty } from '../drink-ingredients/properties';
import type { IngredientTree } from '../drink-ingredients/types';
import { ALCOHOL_THRESHOLDS } from './data';
import type { AlcoholClassResult, AlcoholThresholds } from './types';

const valid = (t: AlcoholThresholds) =>
  Number.isFinite(t.withoutPct) &&
  Number.isFinite(t.lowPct) &&
  t.withoutPct >= 0 &&
  t.lowPct >= t.withoutPct &&
  (t.withoutBound === 'below' || t.withoutBound === 'upTo');

/**
 * Classifies a drink by its calculated ABV after dilution.
 *
 * @param figures - The result of `computeBalance` (`after.abvPct` in percent is the figure used).
 * @param tree - The ingredient tree; lines balance did not count (a `top` without volume, a counted line without a volume) make the class `unknown` unless the ingredient's ABV is known to be 0.
 * @param thresholds - Lines in percent ABV; default `ALCOHOL_THRESHOLDS` (below 0.5 % none, up to 10 % low).
 * @returns The class, the ABV that was classified, and for `unknown` the reason and the ingredient ids. The class is about the number the app computed, not a legal term.
 */
export function classifyAlcohol(
  figures: BalanceFigures,
  tree: IngredientTree,
  thresholds: AlcoholThresholds = ALCOHOL_THRESHOLDS,
): AlcoholClassResult {
  const unknown = (
    reason: NonNullable<AlcoholClassResult['reason']>,
    ids?: string[],
    abvPct?: number,
  ): AlcoholClassResult => ({
    class: 'unknown',
    reason,
    ...(ids && ids.length > 0 ? { ids } : {}),
    ...(abvPct !== undefined ? { abvPct } : {}),
    thresholds,
  });
  if (!valid(thresholds)) return unknown('invalid-thresholds');
  const abv = figures.after?.abvPct;
  if (!abv) return unknown('no-dilution');
  if (!abv.known) return unknown('unknown-abv', abv.missingIds);
  const open = figures.excluded
    .map((e) => e.ingredientId)
    .filter((id) => resolveProperty(tree, id, 'abv').value !== 0);
  if (open.length > 0) return unknown('excluded-line', [...new Set(open)], abv.value);
  const v = abv.value;
  const none =
    thresholds.withoutBound === 'below' ? v < thresholds.withoutPct : v <= thresholds.withoutPct;
  if (none) return { class: 'none', abvPct: v, thresholds };
  if (v <= thresholds.lowPct) return { class: 'low', abvPct: v, thresholds };
  return { class: 'standard', abvPct: v, thresholds };
}
