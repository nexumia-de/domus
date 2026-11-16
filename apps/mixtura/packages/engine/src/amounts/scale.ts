// Scaling multiplies the stored value and keeps the unit (decision: units
// and display). No rounding here; display rounds.
import { fail, ok } from './types';
import type { Amount, Result } from './types';

export function scale(amount: Amount, factor: number): Result<Amount> {
  if (!Number.isFinite(factor) || factor <= 0) {
    return fail('invalid_factor', 'The scaling factor must be a number above zero.');
  }
  if (!Number.isFinite(amount.value) || amount.value < 0) {
    return fail('invalid_value', 'An amount must be a finite number of zero or more.');
  }
  return ok({ value: amount.value * factor, unit: amount.unit });
}
