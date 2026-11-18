// Salt from a percentage, with the basis stated every time.

/** What the percentage is of: the food, the water, or the brine (salt plus water). */
export type SaltBasis = 'food' | 'water' | 'brine';

/** Input of `saltFor`; `foodG` is needed for basis `food`, `waterG` for `water` and `brine`. */
export interface SaltInput {
  basis: SaltBasis;
  pct: number;
  foodG?: number;
  waterG?: number;
}

/** Why `saltFor` failed. */
export type SaltErrorCode =
  'invalid-value' | 'pct-out-of-range' | 'basis-needs-food' | 'basis-needs-water';

/** Result of `saltFor`. */
export type SaltResult =
  { ok: true; saltG: number; totalG: number } | { ok: false; error: { code: SaltErrorCode } };

const fail = (code: SaltErrorCode): SaltResult => ({ ok: false, error: { code } });

/**
 * Salt mass for a percentage on a basis. food: salt = food * pct / 100;
 * water: salt = water * pct / 100; brine (pct is salt per 100 of salt plus
 * water): salt = water * pct / (100 - pct).
 *
 * @param input - Basis, `pct` (finite, not negative; below 100 for brine) and the mass the basis needs, in grams (finite, not negative).
 * @returns `saltG` and `totalG` (the food or water plus the salt), or `basis-needs-food`, `basis-needs-water`, `invalid-value` (a mass not finite or negative) or `pct-out-of-range`.
 */
export function saltFor(input: SaltInput): SaltResult {
  const { basis, pct } = input;
  const base = basis === 'food' ? input.foodG : input.waterG;
  if (base === undefined) return fail(basis === 'food' ? 'basis-needs-food' : 'basis-needs-water');
  if (!Number.isFinite(base) || base < 0) return fail('invalid-value');
  if (!Number.isFinite(pct) || pct < 0 || (basis === 'brine' && pct >= 100)) {
    return fail('pct-out-of-range');
  }
  const saltG = basis === 'brine' ? (base * pct) / (100 - pct) : (base * pct) / 100;
  return { ok: true, saltG, totalG: base + saltG };
}
