// Portions from a yield: how many, and how much each. Unrounded where the
// answer is a quantity; the whole-portion count is robust against binary noise.
import type { PortionsResult, PortionWeightResult } from './types';

const positive = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;

/**
 * Portions that a yield gives at a weight per portion.
 *
 * @param yieldG - Output weight in grams (finite, greater than 0).
 * @param portionG - Weight of one portion in grams (finite, greater than 0).
 * @returns `portions` (unrounded), `wholePortions` (the quotient trimmed to 12 significant digits, then floored, so 0.3 / 0.1 is 3) and `remainderG` (not negative); or `invalid-value` with the field.
 */
export function portionsFromYield(yieldG: number, portionG: number): PortionsResult {
  if (!positive(yieldG)) return { ok: false, error: { code: 'invalid-value', field: 'yieldG' } };
  if (!positive(portionG))
    return { ok: false, error: { code: 'invalid-value', field: 'portionG' } };
  const portions = yieldG / portionG;
  const wholePortions = Math.floor(Number(portions.toPrecision(12)));
  const remainderG = Math.max(0, yieldG - wholePortions * portionG);
  return { ok: true, portions, wholePortions, remainderG };
}

/**
 * Weight of one portion when a yield is divided into a number of portions.
 *
 * @param yieldG - Output weight in grams (finite, greater than 0).
 * @param count - Number of portions (finite, greater than 0).
 * @returns `portionG` (unrounded), or `invalid-value` with the field.
 */
export function portionWeight(yieldG: number, count: number): PortionWeightResult {
  if (!positive(yieldG)) return { ok: false, error: { code: 'invalid-value', field: 'yieldG' } };
  if (!positive(count)) return { ok: false, error: { code: 'invalid-value', field: 'count' } };
  return { ok: true, portionG: yieldG / count };
}
