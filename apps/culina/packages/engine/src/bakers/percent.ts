// Baker's percentages: every line as percent of the flour.
import type { BakersLine, BakersOptions, BakersPercentResult } from './types';

/**
 * Each line as percent of the flour. The flour is the summed mass of all
 * lines whose role is the base role, so several flours add up to 100 %.
 *
 * @param lines - Lines with grams (finite, not negative) and an optional role.
 * @param options - `baseRole`, default `flour`.
 * @returns Flour and dough mass, percent by line id and the total percent, or `invalid-value` (with the line id), `duplicate-id` or `no-base` (flour mass is 0).
 */
export function bakersPercent(
  lines: readonly BakersLine[],
  options: BakersOptions = {},
): BakersPercentResult {
  const baseRole = options.baseRole ?? 'flour';
  const seen = new Set<string>();
  let flourG = 0;
  let doughG = 0;
  for (const line of lines) {
    if (!Number.isFinite(line.g) || line.g < 0) {
      return { ok: false, error: { code: 'invalid-value', lineId: line.id } };
    }
    if (seen.has(line.id)) return { ok: false, error: { code: 'duplicate-id', lineId: line.id } };
    seen.add(line.id);
    doughG += line.g;
    if (line.role === baseRole) flourG += line.g;
  }
  if (flourG === 0) return { ok: false, error: { code: 'no-base' } };
  const pct = Object.fromEntries(lines.map((line) => [line.id, (100 * line.g) / flourG]));
  return { ok: true, flourG, doughG, pct, totalPct: (100 * doughG) / flourG };
}
