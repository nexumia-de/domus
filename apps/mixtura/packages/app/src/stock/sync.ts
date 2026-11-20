// Keeps the stock of every shared space in step with its storage. All of the
// work is the host package's: one sync loop per space runs cycles on the
// collection `stock` (docs/store.md#sync). Mixtura adds nothing of its own: no
// storage, no secret and no invite are handled here; they are set up in the
// Household app. A space that is on this device only causes no request.

import {
  createSyncLoop,
  deriveSpace,
  isDeviceOnly,
  syncCollection,
  type adapterFor,
  type CycleResult,
  type Store as SharedStore,
  type StoredSpace,
  type StoredStorage,
  type SyncLoop,
} from '@nexumia-de/hospes';
import { STOCK_COLLECTION } from './source';

type StorageAdapter = ReturnType<typeof adapterFor>;

/** What is known of the sync of one space's stock, for the Spaces sheet. */
export type SyncStatus =
  | { kind: 'device-only' }
  | { kind: 'never' }
  | { kind: 'syncing'; at?: string }
  | { kind: 'in-step'; at: string }
  /** The last cycle failed; `at` is the last good one, if any. */
  | { kind: 'failed'; failure: string; at?: string };

export interface StockSyncOptions {
  shared: SharedStore;
  /** May throw for a storage it cannot use; the space then shows the failure `storage`. */
  adapter: (storage: StoredStorage) => StorageAdapter;
  now: () => string;
  /** Called when a cycle changed local records, or a status changed: the screens read again. */
  onChange: (what: 'records' | 'status') => void;
  isVisible?: () => boolean;
  isOnline?: () => boolean;
  /** For tests: the loop's timers. */
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

export interface StockSync {
  /** Reads the spaces of the device and starts a loop for every shared one; safe to call again. */
  refresh(): Promise<void>;
  /** The user changed stock of this space: a cycle follows after a short pause. */
  changed(spaceId: string): void;
  /** A cycle now for every shared space (the page came to the front, the connection is back). */
  syncNow(): void;
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

export function createStockSync(options: StockSyncOptions): StockSync {
  const { shared, now, onChange } = options;
  const running = new Map<string, Running>();
  let stopped = false;

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
      let result: CycleResult;
      try {
        result = await syncCollection({
          space: await derived,
          collection: STOCK_COLLECTION,
          adapter,
          store: shared,
          now,
        });
      } catch {
        result = { ok: false, failure: 'server', detail: 'unexpected' };
      }
      entry.busy = false;
      if (result.ok) {
        delete entry.failure;
        entry.syncedAt = now();
      } else entry.failure = result.failure;
      onChange(result.ok && result.changed ? 'records' : 'status');
      return result;
    };
    entry.loop = createSyncLoop({
      run,
      ...(options.isVisible ? { isVisible: options.isVisible } : {}),
      ...(options.isOnline ? { isOnline: options.isOnline } : {}),
      ...(options.setTimer ? { setTimer: options.setTimer } : {}),
      ...(options.clearTimer ? { clearTimer: options.clearTimer } : {}),
    });
    entry.loop.start();
  }

  return {
    async refresh() {
      if (stopped) return;
      const spaces = await shared.listSpaces();
      if (stopped) return;
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
        old?.loop?.stop();
        const entry: Running = { signature, busy: false, deviceOnly: isDeviceOnly(space) };
        const { syncedAt } = await shared.readCollection(space.id, STOCK_COLLECTION);
        if (syncedAt !== undefined) entry.syncedAt = syncedAt;
        running.set(space.id, entry);
        if (!entry.deviceOnly) start(space, entry);
      }
      onChange('status');
    },
    changed: (spaceId) => running.get(spaceId)?.loop?.poke(),
    syncNow() {
      for (const entry of running.values()) entry.loop?.syncNow();
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
