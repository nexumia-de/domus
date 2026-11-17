// Spec lines to N servings with the amounts module. The unit is kept unless
// a target unit of the same kind is given (volume to volume, mass to mass).
import { convert, scale, UNITS } from '../amounts/index';
import type { Amount, UnitId, UnitOverrides } from '../amounts/index';
import type { BalanceLine } from '../balance/index';
import type { BatchError } from './types';

export interface ScaleOptions {
  targetUnit?: UnitId;
  unitOverrides?: UnitOverrides;
}

const kinds = new Map<string, string>(UNITS.map((u) => [u.id, u.kind]));

/**
 * Scales one line.
 *
 * @param line - A balance line.
 * @param factor - Unitless multiplier above 0.
 * @param options - Rounding of the scaled amount.
 * @returns The line in the same unit (`topMl` in ml scales with it; a counted amount is scaled exactly, rounding is the batch's), or an error.
 */
export function scaleLine(
  line: BalanceLine,
  factor: number,
  options: ScaleOptions = {},
): { ok: true; value: BalanceLine } | { ok: false; error: BatchError } {
  const bad = (message: string) => ({
    ok: false as const,
    error: { code: 'invalid-line' as const, ids: [line.ingredientId], message },
  });
  if (!kinds.has(line.unit)) return bad(`unit "${line.unit}" is not in the unit table`);
  let amount: Amount = { value: line.amount, unit: line.unit as UnitId };
  const s = scale(amount, factor);
  if (!s.ok) return bad(s.error.message);
  amount = s.value;
  const target = options.targetUnit;
  if (
    target &&
    kinds.get(target) === kinds.get(line.unit) &&
    kinds.get(target) !== 'fill' &&
    kinds.get(target) !== 'count'
  ) {
    const c = convert(amount, target, options.unitOverrides);
    if (!c.ok) return bad(c.error.message);
    amount = c.value;
  }
  const out: BalanceLine = { ...line, amount: amount.value, unit: amount.unit };
  if (line.topMl !== undefined) out.topMl = line.topMl * factor;
  return { ok: true, value: out };
}

/**
 * Scales all lines to a number of servings.
 *
 * @param lines - The lines of one serving.
 * @param servings - Number of servings above 0 (the factor).
 * @param options - Rounding of the scaled amounts.
 * @returns The scaled lines in their own units, or errors that name the lines.
 */
export function scaleLines(
  lines: readonly BalanceLine[],
  servings: number,
  options: ScaleOptions = {},
): { ok: true; value: BalanceLine[] } | { ok: false; errors: BatchError[] } {
  if (!Number.isFinite(servings) || servings <= 0) {
    return {
      ok: false,
      errors: [
        {
          code: 'invalid-servings',
          ids: [],
          message: 'the number of servings must be a number above zero',
        },
      ],
    };
  }
  const value: BalanceLine[] = [];
  const errors: BatchError[] = [];
  for (const line of lines) {
    const r = scaleLine(line, servings, options);
    if (r.ok) value.push(r.value);
    else errors.push(r.error);
  }
  return errors.length > 0 ? { ok: false, errors } : { ok: true, value };
}
