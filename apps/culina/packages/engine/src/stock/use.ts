// Using up part of an amount in stock: the used amount may be in another unit of the same
// kind (or one the ingredient's facts connect); what is left is in the stock's own unit.
import { convert } from '../amounts/convert';
import type { Amount, ConvertError, IngredientFacts } from '../amounts/types';

export type UseResult =
  | { ok: true; usedUp: false; amount: Amount }
  | { ok: true; usedUp: true }
  | { ok: false; error: ConvertError };

const MICRO = 1e6;

/**
 * What is left after using some of an amount.
 *
 * @param stock - The amount in stock (value above 0).
 * @param used - The amount used (value above 0), in any unit that converts to the stock's.
 * @param facts - Density and unit weight of the ingredient, if known; needed to cross kinds.
 * @returns The remaining amount in the stock's unit (rounded to six decimals), or `usedUp` when nothing is left; a conversion that is not possible is the conversion error.
 */
export function useAmount(stock: Amount, used: Amount, facts?: IngredientFacts): UseResult {
  const converted = convert(used, stock.unit, facts);
  if (!converted.ok) return converted;
  const left = Math.round((stock.value - converted.amount.value) * MICRO) / MICRO;
  return left > 0
    ? { ok: true, usedUp: false, amount: { value: left, unit: stock.unit } }
    : { ok: true, usedUp: true };
}
