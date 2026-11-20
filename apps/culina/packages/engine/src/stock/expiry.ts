// Remaining days of a stock item, derived from a date passed in (the engine has no clock),
// with materia's shelf helpers. A date is derived from the ingredient's recorded shelf life
// only when exactly one value applies; nothing is ever written back.
import { daysBetween, expiry } from '../model';
import { shelfLifeApplies } from './types';
import type { ShelfLifeEntry, StockExpiryResult, StockItem } from './types';

interface Options {
  /** Window of "use soon" in days; default materia's `USE_SOON_DAYS`. */
  soonDays?: number;
}

const soon = (options: Options): { soonDays?: number } =>
  options.soonDays === undefined ? {} : { soonDays: options.soonDays };

/**
 * The remaining days of a stock item.
 *
 * @param item - The item; only `useBy`, `preparedOn` and `state` are read.
 * @param today - Today as `YYYY-MM-DD`, from the host.
 * @param shelfLife - The recorded shelf life of the item's ingredient, if any (with a source).
 * @param options - `soonDays`, the "use soon" window.
 * @returns With an entered `useBy`: status, days left (0 on the day, negative after) and basis `entered`. Without one, if `preparedOn` and `state` are set and the shelf life has exactly one value for that state: the date from it, basis `shelf-life`. Otherwise status `none`. A date that is not a real date is `invalid-date`.
 */
export function stockExpiry(
  item: Pick<StockItem, 'useBy' | 'preparedOn' | 'state' | 'storage'>,
  today: string,
  shelfLife: readonly ShelfLifeEntry[] = [],
  options: Options = {},
): StockExpiryResult {
  if (daysBetween(today, today) === undefined) {
    return { ok: false, error: { code: 'invalid-date', field: 'today' } };
  }
  if (item.useBy !== undefined) {
    if (daysBetween(item.useBy, item.useBy) === undefined) {
      return { ok: false, error: { code: 'invalid-date', field: 'useBy' } };
    }
    // The use-by day is the last good day: a shelf life of 0 days from it.
    const e = expiry({ madeOn: item.useBy, today, shelfLifeDays: 0, ...soon(options) });
    return withBasis(e, 'entered');
  }
  if (item.preparedOn === undefined) return { ok: true, status: 'none' };
  if (daysBetween(item.preparedOn, item.preparedOn) === undefined) {
    return { ok: false, error: { code: 'invalid-date', field: 'preparedOn' } };
  }
  const days = new Set(shelfLife.filter((s) => shelfLifeApplies(s, item)).map((s) => s.days));
  const [only] = days;
  if (days.size !== 1 || only === undefined) return { ok: true, status: 'none' };
  const e = expiry({ madeOn: item.preparedOn, today, shelfLifeDays: only, ...soon(options) });
  return withBasis(e, 'shelf-life');
}

function withBasis(
  e: ReturnType<typeof expiry>,
  basis: 'entered' | 'shelf-life',
): StockExpiryResult {
  if (e.status === 'unknown' || e.useBy === undefined || e.daysLeft === undefined) {
    return { ok: false, error: { code: 'invalid-date', field: 'today' } };
  }
  return { ok: true, status: e.status, useBy: e.useBy, daysLeft: e.daysLeft, basis };
}
