// The date a dish was cooked: the calendar day an own dish was last cooked, one stored personal
// record per dish family (docs/data-model.md, Date a dish was cooked). No time, no history of dates
// and no count: the notebook keeps the date a dish was cooked and no more (AGENTS.md, no food
// diary). The engine has no clock: the date comes in from the host.

/** The stored record: `id` is `cooked-` plus the family id of the dish. */
export interface CookedRecord {
  id: string;
  /** The family of the dish: the id of its first version. */
  dish: string;
  /** `YYYY-MM-DD`. */
  date: string;
}

/**
 * The record id of a dish family's date.
 *
 * @param family - The family id of a dish (`version.family`).
 * @returns `cooked-<family>`: one record per dish, so cooking it again writes the same row, and
 *   two devices that cook the same dish merge by `updatedAt`.
 */
export const cookedId = (family: string): string => `cooked-${family}`;

/**
 * The record to write when a dish was cooked on a day.
 *
 * @param family - The family id of the dish.
 * @param date - The calendar day, `YYYY-MM-DD`, from the host's clock.
 * @returns The record, valid against `cooked.schema.json`.
 */
export const cookedRecord = (family: string, date: string): CookedRecord => ({
  id: cookedId(family),
  dish: family,
  date,
});

/**
 * The date of each dish family. A record whose id is not the id of its family is ignored, so a
 * stray record cannot date a dish.
 *
 * @param records - The live records.
 * @returns Family id to `YYYY-MM-DD`.
 */
export function cookedDates(records: readonly CookedRecord[]): Map<string, string> {
  return new Map(records.filter((r) => r.id === cookedId(r.dish)).map((r) => [r.dish, r.date]));
}

/**
 * True when `YYYY-MM-DD` names a day the calendar has: the schema's pattern lets `2026-02-30`
 * through, and a day of cooking that never was is refused on import.
 *
 * @param date - A string of the schema's date pattern.
 */
export function isCalendarDay(date: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (match === null) return false;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  // Arithmetic, not a Date: the engine has no clock. The Gregorian leap year rule.
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
  return days !== undefined && d >= 1 && d <= days;
}

/**
 * The order "Not cooked for long": a dish with a date stands before one without, the earlier date
 * first. Two dishes without a date, or with the same date, compare equal, so the caller breaks the
 * tie (by name). A dish never cooked (as far as the notebook knows) has no date: it says nothing
 * about how long ago it was cooked, so it is not placed above the dishes that were.
 *
 * @param a - The date of the first dish, or undefined.
 * @param b - The date of the second dish, or undefined.
 * @returns Negative, zero or positive, as `Array.prototype.sort` wants.
 */
export function byNotCookedForLong(a: string | undefined, b: string | undefined): number {
  if (a === b) return 0;
  if (a === undefined) return 1;
  if (b === undefined) return -1;
  return a < b ? -1 : 1;
}
