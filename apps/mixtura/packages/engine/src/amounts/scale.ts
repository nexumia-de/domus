// Scaling multiplies the stored value and keeps the unit (decision: units
// and display). No rounding here; display rounds.
import { fail, ok } from './types';
import type { Amount, Result } from './types';

/**
 * Multiplies an amount; the unit stays.
 *
 * @param amount - Value in `amount.unit`.
 * @param factor - Unitless multiplier above 0.
 * @returns The scaled amount in the same unit, or an error for an invalid factor or value.
 */
export function scale(amount: Amount, factor: number): Result<Amount> {
  if (!Number.isFinite(factor) || factor <= 0) {
    return fail('invalid_factor', 'The scaling factor must be a number above zero.');
  }
  if (!Number.isFinite(amount.value) || amount.value < 0) {
    return fail('invalid_value', 'An amount must be a finite number of zero or more.');
  }
  return ok({ value: amount.value * factor, unit: amount.unit });
}
