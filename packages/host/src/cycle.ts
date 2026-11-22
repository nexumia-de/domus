// One sync cycle for one collection of a space, and the helper an app uses
// for a change the user makes. Pure rules come from materia; this file does
// the reading, writing and storing in the right order. See docs/spaces.md.
import {
  latestStamp,
  mergeRecords,
  nextStamp,
  planCollectionSync,
  type AdapterFailure,
  type StorageAdapter,
  type SyncRecord,
} from '@nexumia-de/materia';
import { openCollection, sealCollection, type OpenError } from './seal';
import type { Space } from './space';
import type { Store } from './store';

export interface SyncOptions {
  /** The derived space; `space.id` is also the id under which the store keeps it. */
  space: Space;
  collection: string;
  adapter: StorageAdapter;
  store: Store;
  /** The current time as `YYYY-MM-DDThh:mm:ss[.fff]Z`; an injected clock. */
  now: () => string;
  /** How many days a removal marker is kept; default 90. */
  horizonDays?: number;
  /** How often a cycle starts over after a write conflict; default 3. */
  attempts?: number;
}

export type CycleFailure = AdapterFailure | OpenError | 'bad-now';

export type CycleResult =
  | {
      ok: true;
      /** The local records changed. */
      changed: boolean;
      /** The remote file was written. */
      wrote: boolean;
      /** Keys dropped locally because they were removed while this device was away. */
      expired: string[];
      /** Removal markers dropped as too old. */
      pruned: string[];
      /** Records dropped as invalid, `local:<key>` / `remote:<key>`. */
      rejected: string[];
      /** The user changed something during the cycle; run another soon. */
      pending: boolean;
    }
  | { ok: false; failure: CycleFailure; detail?: string };

/** The path of a collection's file in the storage. */
export const collectionPath = (spaceId: string, collection: string): string =>
  `${spaceId}/${collection}.json`;

// Equal records give equal text whatever the key order inside values.
const stable = (v: unknown): string =>
  JSON.stringify(v, (_k, x: unknown) =>
    x !== null && typeof x === 'object' && !Array.isArray(x)
      ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : x,
  );

/**
 * Runs one cycle: read, merge, write if needed, store. Nothing is stored
 * before a needed write succeeded, so a failed cycle leaves local data as it
 * was. A file that cannot be read is never overwritten. A conflict on write
 * starts over, up to `attempts` times.
 */
export async function syncCollection(options: SyncOptions): Promise<CycleResult> {
  const { space, collection, adapter, store, now } = options;
  const horizonDays = options.horizonDays ?? 90;
  const attempts = Math.max(1, options.attempts ?? 3);
  const path = collectionPath(space.id, collection);

  for (let attempt = 0; attempt < attempts; attempt++) {
    const state = await store.readCollection(space.id, collection);
    const base = new Map(state.records.map((r) => [r.key, stable(r)]));

    const read = await adapter.read(path);
    if (!read.ok) {
      return { ok: false, failure: read.failure, ...(read.detail ? { detail: read.detail } : {}) };
    }
    let remote;
    if (!read.missing) {
      const opened = await openCollection(space, collection, read.body);
      if (!opened.ok) {
        return {
          ok: false,
          failure: opened.error,
          ...(opened.detail ? { detail: opened.detail } : {}),
        };
      }
      remote = opened.document;
    }

    const plan = planCollectionSync(
      {
        space: space.id,
        collection,
        records: state.records,
        ...(state.syncedAt === undefined ? {} : { syncedAt: state.syncedAt }),
      },
      remote,
      { now: now(), horizonDays },
    );
    if ('error' in plan) return { ok: false, failure: plan.error };

    let etag = read.missing ? undefined : read.etag;
    if (plan.write) {
      const text = await sealCollection(space, plan.write);
      const written = await adapter.write(path, text, read.missing ? null : read.etag);
      if (!written.ok) {
        if (written.failure === 'conflict') continue;
        return {
          ok: false,
          failure: written.failure,
          ...(written.detail ? { detail: written.detail } : {}),
        };
      }
      etag = written.etag;
    }

    // Store the result without losing what the user changed since step 1:
    // a record that differs from the base is merged over the plan's result
    // (its stamp follows everything seen, so it wins) and the caller is told
    // to run again, because the remote file does not have it yet.
    let pending = false;
    await store.changeRecords(space.id, collection, (current) => {
      const mine = current.records.filter((r) => base.get(r.key) !== stable(r));
      pending = mine.length > 0;
      const next = {
        records: pending ? mergeRecords(plan.local.records, mine).records : plan.local.records,
        syncedAt: plan.local.syncedAt,
      } as { records: SyncRecord[]; syncedAt: string; etag?: string };
      if (etag !== undefined) next.etag = etag;
      return next;
    });
    return {
      ok: true,
      changed: plan.localChanged,
      wrote: plan.write !== undefined,
      expired: plan.expired,
      pruned: plan.pruned,
      rejected: plan.rejected,
      pending,
    };
  }
  return { ok: false, failure: 'conflict' };
}

/** The clock reads something that is not a timestamp. */
export class BadClock extends Error {
  constructor() {
    super('The clock gave no readable timestamp');
    this.name = 'BadClock';
  }
}

/** What a user change does: records to put and keys to remove. */
export interface LocalEdit {
  put?: { key: string; value: unknown }[];
  /** Keys to remove; written as tombstones. A key that is absent or already removed is skipped. */
  remove?: string[];
}

/**
 * Applies a change the user made, atomically in the store. All records of
 * the change get one stamp that is later than everything in the collection,
 * even when the device clock is behind. A key both in `put` and `remove` is put.
 * @param edit Gets the current records and says what to change.
 * @returns The stamp.
 * @throws BadClock when `now()` is not a timestamp.
 */
export async function localChange(
  store: Store,
  spaceId: string,
  collection: string,
  now: () => string,
  edit: (records: readonly SyncRecord[]) => LocalEdit,
): Promise<string> {
  let stamp: string | undefined;
  await store.changeRecords(spaceId, collection, (current) => {
    stamp = nextStamp(now(), latestStamp(current.records));
    if (stamp === undefined) throw new BadClock();
    const at = stamp;
    const { put = [], remove = [] } = edit(current.records);
    const byKey = new Map(current.records.map((r) => [r.key, r]));
    for (const key of remove) {
      const had = byKey.get(key);
      if (had && had.deleted !== true) byKey.set(key, { key, updatedAt: at, deleted: true });
    }
    for (const { key, value } of put) byKey.set(key, { key, updatedAt: at, value });
    return { ...current, records: [...byKey.values()] };
  });
  return stamp as unknown as string;
}
