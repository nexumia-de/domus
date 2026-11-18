// Hydration: water over flour. The engine counts only what it is told is
// flour or water; it does not know the water content of any ingredient.
import type { HydrationLine, HydrationOptions, HydrationResult } from './types';

const bad = (n: number): boolean => !Number.isFinite(n) || n < 0;

/**
 * Hydration in percent: water mass over flour mass. Counted as flour: lines
 * with the base role. Counted as water: lines with a water role. A line with
 * a recorded `composition` (a preferment) adds its own flour and water
 * instead. A `component` line without composition is on neither side and
 * its id is returned in `notCounted`. Milk, eggs, oil and the like count
 * only when the caller gives them a water role; nothing is derived from
 * their water content.
 *
 * @param lines - Lines with grams (finite, not negative), optional role, composition or component flag.
 * @param options - `baseRole` (default `flour`) and `waterRoles` (default `['water']`).
 * @returns Hydration percent, flour and water mass and the uncounted ids, or `invalid-value` (with the line id) or `no-base` (flour mass is 0).
 */
export function hydration(
  lines: readonly HydrationLine[],
  options: HydrationOptions = {},
): HydrationResult {
  const baseRole = options.baseRole ?? 'flour';
  const waterRoles = options.waterRoles ?? ['water'];
  let flourG = 0;
  let waterG = 0;
  const notCounted: string[] = [];
  for (const line of lines) {
    const { composition } = line;
    if (bad(line.g) || (composition && (bad(composition.flourG) || bad(composition.waterG)))) {
      return { ok: false, error: { code: 'invalid-value', lineId: line.id } };
    }
    if (composition) {
      flourG += composition.flourG;
      waterG += composition.waterG;
    } else if (line.component === true) {
      notCounted.push(line.id);
    } else if (line.role === baseRole) {
      flourG += line.g;
    } else if (line.role !== undefined && waterRoles.includes(line.role)) {
      waterG += line.g;
    }
  }
  if (flourG === 0) return { ok: false, error: { code: 'no-base' } };
  return { ok: true, hydrationPct: (100 * waterG) / flourG, flourG, waterG, notCounted };
}
