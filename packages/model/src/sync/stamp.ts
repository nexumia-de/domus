// A stamp that never goes backwards (docs/sync.md#a-stamp-that-never-goes-backwards):
// "newest wins" compares device clocks, so a change made after seeing a
// record must be stamped later than that record whatever the clock says.

import { instantMs, instantText } from './instant';

/**
 * Gives the timestamp for a record the user changes now: the clock when it is
 * later than everything seen, otherwise one millisecond after the newest
 * `updatedAt` seen. A change made after seeing a record is therefore always
 * newer than it, whether the clock is behind or ahead.
 * @param now The device's clock as `YYYY-MM-DDThh:mm:ss[.fff]Z`.
 * @param latest The newest `updatedAt` the device has seen in the collection, local or remote; an unreadable value counts as absent.
 * @returns The stamp with exactly three fraction digits; undefined when `now` is unreadable or `latest` is the last instant a timestamp can name.
 */
export function nextStamp(now: unknown, latest?: unknown): string | undefined {
  const n = instantMs(now);
  if (n === undefined) return undefined;
  const l = instantMs(latest);
  return instantText(l === undefined || n > l ? n : l + 1);
}

/**
 * Finds the newest readable `updatedAt` of a list, to hand to `nextStamp`.
 * @param records Records of a collection; ones with an unreadable `updatedAt` are skipped.
 * @returns The greatest time as text with three fraction digits, or undefined when none is readable.
 */
export function latestStamp(records: readonly { updatedAt?: unknown }[]): string | undefined {
  let best: number | undefined;
  for (const r of records) {
    const ms = r !== null && typeof r === 'object' ? instantMs(r.updatedAt) : undefined;
    if (ms !== undefined && (best === undefined || ms > best)) best = ms;
  }
  return best === undefined ? undefined : instantText(best);
}
