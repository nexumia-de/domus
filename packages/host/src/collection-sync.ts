// Keeps collections of every shared space in step with its storage: one sync
// loop per space runs cycles on the collections an app names (Mixtura and
// Culina `stock`, Emptio its list). An app adds nothing of its own: no storage,
// no secret and no invite are handled here; they are set up in the Household
// app. A space that is on this device only causes no request. See
// docs/spaces.md#the-loops-of-an-app.
import type { StorageAdapter } from '@nexumia-de/materia';
import { syncCollection, type CycleResult } from './cycle';
import { isDeviceOnly } from './device';
import { deriveSpace } from './space';
import type { Store, StoredSpace, StoredStorage } from './store';
import { createSyncLoop, type SyncLoop } from './watch';

/** What is known of the sync of one space's collections, for a screen. */
export type SyncStatus =
  | { kind: 'device-only' }
  | { kind: 'never' }
  | { kind: 'syncing'; at?: string }
  | { kind: 'in-step'; at: string }
  /** The last cycle failed; `at` is the last good one, if any. */
  | { kind: 'failed'; failure: string; at?: string };

export interface CollectionSyncOptions {
  store: Store;
  /** The collections this app keeps in step, each in its own file; at least one. */
  collections: readonly string[];
  /** May throw for a storage it cannot use; the space then shows the failure `storage`. */
  adapter: (storage: StoredStorage) => StorageAdapter;
  now: () => string;
  /** Called when a cycle changed local records, or a status changed: the screens read again. */
  onChange: (what: 'records' | 'status') => void;
  isVisible?: () => boolean;
  isOnline?: () => boolean;
  /** Interval between cycles while the page is in front; the loop's default (20 s) when absent. */
  intervalMs?: number;
  /** Cycles only when the app asks (`changed`, `syncNow`, `syncSpace`); see the loop's `manual`. */
  manual?: boolean;
  /** For tests: the loop's timers. */
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

export interface CollectionSync {
  /**
   * Reads the spaces of the device and starts a loop for every shared one; safe to call again.
   * Never rejects: a database that cannot be read leaves things as they are.
   */
  refresh(): Promise<void>;
  /** The user changed a collection of this space: a cycle follows after a short pause. */
  changed(spaceId: string): void;
  /** A cycle now for every shared space (the page came to the front, the connection is back). */
  syncNow(): void;
  /**
   * One cycle of this space now, waited for: `synced`, `failed`, `device-only` (nothing to
   * sync), or `unknown` before `refresh` saw the space. Never rejects.
   */
  syncSpace(spaceId: string): Promise<'synced' | 'failed' | 'device-only' | 'unknown'>;
  status(spaceId: string): SyncStatus | undefined;
  stop(): void;
}

interface Running {
  /** What the loop was made for; a changed storage or access makes a new loop. */
  signature: string;
  loop?: SyncLoop;
  busy: boolean;
  failure?: string;
  syncedAt?: string;
  deviceOnly: boolean;
}

const signatureOf = (space: StoredSpace): string => JSON.stringify([space.secret, space.storage]);

export function createCollectionSync(options: CollectionSyncOptions): CollectionSync {
  const { store, collections, now, onChange } = options;
  const running = new Map<string, Running>();
  let stopped = false;
  let looking: Promise<void> | undefined;
  let again = false;
  /** The ids of the spaces at the last look, to notice one that came or went. */
  let known: string | undefined;

  function start(space: StoredSpace, entry: Running): void {
    let adapter: StorageAdapter;
    try {
      adapter = options.adapter(space.storage);
    } catch {
      entry.failure = 'storage';
      return;
    }
    const derived = deriveSpace(space.secret);
    const run = async (): Promise<CycleResult> => {
      entry.busy = true;
      onChange('status');
      // Every collection gets its cycle, also after one failed: a file that cannot be read
      // does not hold back the others. The run fails with the first failure.
      let result: CycleResult = {
        ok: true,
        changed: false,
        wrote: false,
        expired: [],
        pruned: [],
        rejected: [],
        pending: false,
      };
      let failed: CycleResult | undefined;
      for (const collection of collections) {
        let one: CycleResult;
        try {
          one = await syncCollection({
            space: await derived,
            collection,
            adapter,
            store,
            now,
          });
        } catch {
          one = { ok: false, failure: 'server', detail: 'unexpected' };
        }
        if (!one.ok) failed ??= one;
        else if (result.ok) {
          result = {
            ok: true,
            changed: result.changed || one.changed,
            wrote: result.wrote || one.wrote,
            expired: [...result.expired, ...one.expired],
            pruned: [...result.pruned, ...one.pruned],
            rejected: [...result.rejected, ...one.rejected],
            pending: result.pending || one.pending,
          };
        }
      }
      const changed = result.ok && result.changed;
      if (failed) result = failed;
      entry.busy = false;
      if (result.ok) {
        delete entry.failure;
        entry.syncedAt = now();
      } else entry.failure = result.failure;
      // Records a good cycle changed are told even when another collection failed.
      onChange(changed ? 'records' : 'status');
      return result;
    };
    entry.loop = createSyncLoop({
      run,
      ...(options.isVisible ? { isVisible: options.isVisible } : {}),
      ...(options.isOnline ? { isOnline: options.isOnline } : {}),
      ...(options.intervalMs === undefined ? {} : { intervalMs: options.intervalMs }),
      ...(options.manual === true ? { manual: true } : {}),
      ...(options.setTimer ? { setTimer: options.setTimer } : {}),
      ...(options.clearTimer ? { clearTimer: options.clearTimer } : {}),
    });
    entry.loop.start();
  }

  /** The oldest `syncedAt` of the collections; undefined while one was never in step. */
  async function lastSynced(spaceId: string): Promise<string | undefined> {
    let oldest: string | undefined;
    for (const collection of collections) {
      const at = await store
        .readCollection(spaceId, collection)
        .then((state) => state.syncedAt)
        .catch(() => undefined);
      if (at === undefined) return undefined;
      if (oldest === undefined || at < oldest) oldest = at;
    }
    return oldest;
  }

  /** Reads the spaces once and makes the loops match them. Never rejects. */
  async function look(): Promise<void> {
    if (stopped) return;
    let spaces: StoredSpace[];
    try {
      spaces = await store.listSpaces();
    } catch {
      // The shared database cannot be opened (no IndexedDB, a private window): nothing to
      // sync, and the app says so itself.
      return;
    }
    if (stopped) return;
    const ids = spaces
      .map((s) => s.id)
      .sort()
      .join(' ');
    // A space joined, made or removed elsewhere (the Household app in another tab): the
    // screens hold the spaces of their last read and must read again. Not on the first look,
    // which follows the screens' own read.
    const moved = known !== undefined && known !== ids;
    known = ids;
    const here = new Set(spaces.map((s) => s.id));
    for (const [id, entry] of running) {
      if (here.has(id)) continue;
      entry.loop?.stop();
      running.delete(id);
    }
    for (const space of spaces) {
      const signature = signatureOf(space);
      const old = running.get(space.id);
      if (old?.signature === signature) continue;
      const syncedAt = await lastSynced(space.id);
      // Stopped while the collection was read: start nothing more.
      if (stopped) return;
      old?.loop?.stop();
      const entry: Running = { signature, busy: false, deviceOnly: isDeviceOnly(space) };
      if (syncedAt !== undefined) entry.syncedAt = syncedAt;
      running.set(space.id, entry);
      if (!entry.deviceOnly) start(space, entry);
    }
    onChange(moved ? 'records' : 'status');
  }

  return {
    refresh() {
      // One look at a time: the app's first read and the page coming to the front both ask at the
      // start, and two looks side by side would each start a loop for the same space. A request
      // during a look runs one more after it.
      if (looking) {
        again = true;
        return looking;
      }
      looking = (async () => {
        do {
          again = false;
          await look();
        } while (again && !stopped);
      })().finally(() => {
        looking = undefined;
      });
      return looking;
    },
    changed: (spaceId) => running.get(spaceId)?.loop?.poke(),
    syncNow() {
      for (const entry of running.values()) entry.loop?.syncNow();
    },
    async syncSpace(spaceId) {
      const entry = running.get(spaceId);
      if (entry === undefined) return 'unknown';
      if (entry.deviceOnly) return 'device-only';
      // No loop: the storage could not be used.
      if (entry.loop === undefined) return 'failed';
      return (await entry.loop.runNow().catch(() => false)) ? 'synced' : 'failed';
    },
    status(spaceId) {
      const entry = running.get(spaceId);
      if (!entry) return undefined;
      if (entry.deviceOnly) return { kind: 'device-only' };
      const at = entry.syncedAt === undefined ? {} : { at: entry.syncedAt };
      if (entry.busy) return { kind: 'syncing', ...at };
      if (entry.failure !== undefined) return { kind: 'failed', failure: entry.failure, ...at };
      return entry.syncedAt === undefined
        ? { kind: 'never' }
        : { kind: 'in-step', at: entry.syncedAt };
    },
    stop() {
      stopped = true;
      for (const entry of running.values()) entry.loop?.stop();
      running.clear();
    },
  };
}
