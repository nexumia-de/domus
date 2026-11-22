// Dropping old removal markers (docs/sync.md#dropping-old-removal-markers):
// without it a collection only grows. The cost, stated in the docs, is that a
// device away for longer than the horizon needs the stale device rule.

import { compareText } from './canonical';
import { instantMs, instantText } from './instant';
import type { SyncRecord } from './records';

const DAY_MS = 86_400_000;

export interface PruneResult<V = unknown> {
  /** The records without the old tombstones, in their input order. */
  records: SyncRecord<V>[];
  /** The keys removed, sorted. */
  pruned: string[];
  /** The cut-off instant; absent when nothing could be pruned (bad horizon or bad `now`). */
  prunedBefore?: string;
}

/**
 * Removes the tombstones whose `updatedAt` is strictly earlier than `now`
 * minus `horizonDays` whole days. Live records are never removed, whatever
 * their age; records with an unreadable time are left for the merge to reject.
 * @param records The merged records of a collection.
 * @param now The current time as a timestamp.
 * @param horizonDays How many whole days a tombstone is kept; a positive integer.
 * @returns The records, the removed keys and the cut-off; with a bad horizon or an unreadable `now` nothing is pruned and there is no cut-off.
 */
export function pruneTombstones<V>(
  records: readonly SyncRecord<V>[],
  now: unknown,
  horizonDays: number,
): PruneResult<V> {
  const n = instantMs(now);
  const cut =
    n === undefined || !Number.isInteger(horizonDays) || horizonDays <= 0
      ? undefined
      : n - horizonDays * DAY_MS;
  const prunedBefore = cut === undefined ? undefined : instantText(cut);
  if (cut === undefined || prunedBefore === undefined) return { records: [...records], pruned: [] };
  const kept: SyncRecord<V>[] = [];
  const pruned: string[] = [];
  for (const r of records) {
    const at = r.deleted === true ? instantMs(r.updatedAt) : undefined;
    if (at !== undefined && at < cut) pruned.push(r.key);
    else kept.push(r);
  }
  return { records: kept, pruned: pruned.sort(compareText), prunedBefore };
}
