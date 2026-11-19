// The pure step of one sync cycle for a collection of a space
// (docs/sync.md#the-plan-of-one-cycle): the merge, the stale device rule and
// the pruning of old removal markers, in that order.

import { canonicalJson, compareText } from './canonical';
import { buildCollection, COLLECTION_FORMAT, COLLECTION_VERSION } from './collection';
import type { CollectionDocument } from './collection';
import { recordsByKey } from './frame';
import { instantMs } from './instant';
import { pruneTombstones } from './prune';
import { mergeRecords, type SyncRecord } from './records';

export interface LocalCollectionState<V = unknown> {
  space: string;
  collection: string;
  records: SyncRecord<V>[];
  /** The `now` of this device's last successful cycle for this collection; absent when it never synced. */
  syncedAt?: string;
}

export interface CollectionPlanOptions {
  /** The current time as a timestamp; time is an input, not read here. */
  now: string;
  /** How many whole days a removal marker is kept; a positive integer. */
  horizonDays: number;
}

export interface CollectionSyncPlan<V = unknown> {
  /** What the app stores locally after this cycle; `syncedAt` is `now`. */
  local: LocalCollectionState<V> & { syncedAt: string };
  /** True when the stored records differ from the input records (not for `syncedAt` alone). */
  localChanged: boolean;
  /** The document to write, or undefined when the remote already equals it. */
  write?: CollectionDocument<V>;
  /** Dropped records as `local:<key>` / `remote:<key>`, as `mergeRecords` gives them. */
  rejected: string[];
  /** Keys dropped locally by the stale device rule, sorted. */
  expired: string[];
  /** Removal markers pruned in this cycle, sorted. */
  pruned: string[];
}

const same = (a: readonly SyncRecord<unknown>[], b: readonly SyncRecord<unknown>[]): boolean =>
  a.length === b.length && canonicalJson(recordsByKey(a)) === canonicalJson(recordsByKey(b));

/**
 * Plans one cycle for a collection. A device that was away for longer than
 * the remote kept removal markers (`remote.prunedBefore` is later than
 * `local.syncedAt`) drops its records that the remote lacks entirely and that
 * it has not changed since `syncedAt`: somebody removed them while it was
 * away. A record edited after `syncedAt` stays, and a device that never
 * synced (no `syncedAt`) expires nothing.
 * @param local The local space, collection, records and time of the last cycle.
 * @param remote The parsed remote document, or undefined when there is no file.
 * @param options The current time and the horizon in days.
 * @returns The plan, `other-space` or `other-collection` when the remote file
 * belongs elsewhere, or `bad-now` when `options.now` is unreadable.
 */
export function planCollectionSync<V>(
  local: LocalCollectionState<V>,
  remote: CollectionDocument<V> | undefined,
  options: CollectionPlanOptions,
): CollectionSyncPlan<V> | { error: 'other-space' | 'other-collection' | 'bad-now' } {
  if (remote && remote.space !== local.space) return { error: 'other-space' };
  if (remote && remote.collection !== local.collection) return { error: 'other-collection' };
  const { now, horizonDays } = options;
  if (instantMs(now) === undefined) return { error: 'bad-now' };

  const remoteRecords = remote?.records ?? [];
  const remoteCut =
    instantMs(remote?.prunedBefore) === undefined ? undefined : remote?.prunedBefore;
  const synced = instantMs(local.syncedAt);
  const stale =
    synced !== undefined && remoteCut !== undefined && synced < (instantMs(remoteCut) as number);
  const expired = new Set<string>();
  let keep = local.records;
  if (stale) {
    const held = new Set(remoteRecords.map((r) => r.key));
    keep = local.records.filter((r) => {
      const at = instantMs(r.updatedAt);
      const gone = at !== undefined && at <= synced && !held.has(r.key);
      if (gone) expired.add(r.key);
      return !gone;
    });
  }

  const merged = mergeRecords(keep, remoteRecords);
  const prune = pruneTombstones(merged.records, now, horizonDays);
  let prunedBefore = remoteCut;
  if (prune.pruned.length > 0 && prune.prunedBefore !== undefined) {
    const later =
      remoteCut !== undefined &&
      (instantMs(remoteCut) as number) >= (instantMs(prune.prunedBefore) as number);
    prunedBefore = later ? remoteCut : prune.prunedBefore;
  }

  const doc: CollectionDocument<V> = {
    format: COLLECTION_FORMAT,
    version: COLLECTION_VERSION,
    space: local.space,
    collection: local.collection,
    records: prune.records,
    ...(prunedBefore === undefined ? {} : { prunedBefore }),
  };
  const plan: CollectionSyncPlan<V> = {
    local: {
      space: local.space,
      collection: local.collection,
      records: prune.records,
      syncedAt: now,
    },
    localChanged: !same(prune.records, local.records),
    rejected: merged.rejected,
    expired: [...expired].sort(compareText),
    pruned: prune.pruned,
  };
  // The remote equals the plan when it prints the same text: the print sorts and cleans records.
  if (!remote || buildCollection(remote) !== buildCollection(doc)) plan.write = doc;
  return plan;
}
