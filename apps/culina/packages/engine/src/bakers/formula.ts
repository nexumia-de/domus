// From a baker's formula (percent of the flour) to grams.
import type { BakersOptions, FormulaLine, FormulaResult, FormulaTarget } from './types';

/** How far the base lines may lie from 100 in total. */
const BASE_TOLERANCE = 1e-9;

/**
 * Grams of every line of a formula for a dough weight or a flour weight.
 * The base-role lines must add up to 100; flour = dough / (sum of all
 * percentages / 100).
 *
 * @param formula - Lines with percent (finite, not negative) and an optional role.
 * @param target - `{ doughG }` or `{ flourG }`, finite and greater than 0.
 * @param options - `baseRole`, default `flour`.
 * @returns Flour mass, grams by line id and dough mass, or `invalid-value`, `duplicate-id`, `no-base`, `base-not-100` (with `basePct`) or `invalid-target`.
 */
export function fromBakersPercent(
  formula: readonly FormulaLine[],
  target: FormulaTarget,
  options: BakersOptions = {},
): FormulaResult {
  const baseRole = options.baseRole ?? 'flour';
  const seen = new Set<string>();
  let basePct = 0;
  let totalPct = 0;
  let hasBase = false;
  for (const line of formula) {
    if (!Number.isFinite(line.pct) || line.pct < 0) {
      return { ok: false, error: { code: 'invalid-value', lineId: line.id } };
    }
    if (seen.has(line.id)) return { ok: false, error: { code: 'duplicate-id', lineId: line.id } };
    seen.add(line.id);
    totalPct += line.pct;
    if (line.role === baseRole) {
      hasBase = true;
      basePct += line.pct;
    }
  }
  if (!hasBase) return { ok: false, error: { code: 'no-base' } };
  if (Math.abs(basePct - 100) > BASE_TOLERANCE) {
    return { ok: false, error: { code: 'base-not-100', basePct } };
  }
  const wanted = 'doughG' in target ? target.doughG : target.flourG;
  if (typeof wanted !== 'number' || !Number.isFinite(wanted) || wanted <= 0) {
    return { ok: false, error: { code: 'invalid-target' } };
  }
  const flourG = 'doughG' in target ? (wanted * 100) / totalPct : wanted;
  const g = Object.fromEntries(formula.map((line) => [line.id, (line.pct / 100) * flourG]));
  const doughG = Object.values(g).reduce((sum, n) => sum + n, 0);
  return { ok: true, flourG, g, doughG };
}
