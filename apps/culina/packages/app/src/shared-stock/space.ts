// The running stock without a screen: which space is used, its records of the collection `stock`,
// the changes a person makes, the one move of Culina's old items, and the loops that keep shared
// spaces in step (the host package's `createCollectionSync`). Making, sharing and removing spaces is
// the Household app's (docs/decisions/stock-in-spaces.md).
import {
  createCollectionSync,
  ensureSpace,
  localChange,
  pickSpace,
  viewOf,
  type CollectionSync,
  type CollectionSyncOptions,
  type SpaceView,
  type Store as SharedStore,
  type SyncStatus,
} from '@nexumia-de/hospes';
import type { ComponentRef } from '@culina/engine';
import { readSpaceChoice, writeSpaceChoice, type KeyValueStore } from '../prefs';
import type { Store as OwnStore } from '../store';
import type { Decision, SyncRecord } from './edits';
import { moveLegacyStock, type MoveResult } from './legacy';
import { STOCK } from './value';

export interface StockSpaceState {
  /** `loading` until the first read; `failed` when the shared database cannot be opened. */
  phase: 'loading' | 'ready' | 'failed';
  spaces: SpaceView[];
  /** The space whose stock is shown and written. */
  space?: SpaceView;
  records: readonly SyncRecord[];
}

export interface StockSpaceOptions {
  shared: SharedStore;
  now: () => string;
  /** Where the choice of space is kept; null when the device keeps nothing. */
  prefs: KeyValueStore | null;
  names: { home: string; unnamed: string };
  /** How many records of a collection Culina shows (the count `pickSpace` weighs). */
  shownCount: (records: readonly SyncRecord[]) => number;
  /** Called after every read of the records (the screens draw again). */
  onRecords: () => void;
  /** Culina's own database and the key of an old item, for the one move (legacy.ts). */
  legacy?: { own: OwnStore; keyOf: (ref: ComponentRef) => string };
  adapter: CollectionSyncOptions['adapter'];
  isVisible?: () => boolean;
  isOnline?: () => boolean;
  setTimer?: CollectionSyncOptions['setTimer'];
  clearTimer?: CollectionSyncOptions['clearTimer'];
}

/** A change that could not be made: no space, the write failed, or the item is gone. */
export type ChangeResult<T> = { ok: true; outcome: T } | { ok: false; why: 'unavailable' | 'gone' };

export interface StockSpace {
  state(): StockSpaceState;
  /** Reads the spaces and the used space's records again. Never rejects. */
  load(): Promise<void>;
  /** Uses another space and remembers the choice on this device. */
  choose(spaceId: string): Promise<void>;
  /** Runs a decision inside one atomic change of the used space, reads again, asks for a cycle. */
  change<T>(decide: (records: readonly SyncRecord[]) => Decision<T>): Promise<ChangeResult<T>>;
  status(): SyncStatus | undefined;
  /** Calls `listener` when a sync status changed; returns the way to stop. */
  onStatus(listener: () => void): () => void;
  /** The page came to the front. */
  wake(): void;
  /** The connection is back. */
  online(): void;
  /** What the move of the old items did at the first read; for tests. */
  moved(): MoveResult | undefined;
  stop(): void;
}

export function createStockSpace(options: StockSpaceOptions): StockSpace {
  const { shared, now, prefs, names } = options;
  const statusListeners = new Set<() => void>();
  let current: StockSpaceState = { phase: 'loading', spaces: [], records: [] };
  let stopped = false;
  let reads = 0;
  let move: MoveResult | undefined;

  const sync: CollectionSync = createCollectionSync({
    store: shared,
    collections: [STOCK],
    adapter: options.adapter,
    now,
    // Records another device changed are read again; a status change only redraws the status.
    onChange: (what) => {
      if (what === 'records') void load();
      for (const listener of [...statusListeners]) listener();
    },
    ...(options.isVisible ? { isVisible: options.isVisible } : {}),
    ...(options.isOnline ? { isOnline: options.isOnline } : {}),
    ...(options.setTimer ? { setTimer: options.setTimer } : {}),
    ...(options.clearTimer ? { clearTimer: options.clearTimer } : {}),
  });

  async function read(): Promise<StockSpaceState> {
    const stored = await ensureSpace(shared, names.home);
    const spaces = stored.map((space) => viewOf(space, names.unnamed));
    const bySpace = new Map<string, readonly SyncRecord[]>();
    for (const space of spaces) {
      bySpace.set(space.id, (await shared.readCollection(space.id, STOCK)).records);
    }
    const counts = new Map(
      [...bySpace].map(([id, records]) => [id, options.shownCount(records)] as const),
    );
    const space = pickSpace(spaces, readSpaceChoice(prefs), counts);
    if (space === undefined) return { phase: 'ready', spaces, records: [] };
    // The old items move once, into the space that is used; a failure tries again next start.
    if (move === undefined && options.legacy) {
      move = await moveLegacyStock({ ...options.legacy, shared, spaceId: space.id, now });
      if (move.ok && move.moved.length > 0) {
        bySpace.set(space.id, (await shared.readCollection(space.id, STOCK)).records);
      }
    }
    return { phase: 'ready', spaces, space, records: bySpace.get(space.id) ?? [] };
  }

  async function load(): Promise<void> {
    if (stopped) return;
    const mine = ++reads;
    let next: StockSpaceState;
    try {
      next = await read();
    } catch {
      // No IndexedDB for the shared database (a private window): the stock screen says so.
      next = { phase: 'failed', spaces: [], records: [] };
    }
    if (stopped || mine !== reads) return;
    current = next;
    options.onRecords();
  }

  return {
    state: () => current,
    async load() {
      await load();
      // After the read, so the first space of a new device exists before the loops look.
      if (current.phase === 'ready') await sync.refresh();
    },
    async choose(spaceId) {
      writeSpaceChoice(prefs, spaceId);
      await load();
    },
    async change(decide) {
      const space = current.space;
      if (space === undefined) return { ok: false, why: 'unavailable' };
      let decided: Decision<unknown> | undefined;
      try {
        await localChange(shared, space.id, STOCK, now, (records) => {
          decided = decide(records);
          return decided.edit;
        });
      } catch {
        await load();
        return { ok: false, why: 'unavailable' };
      }
      await load();
      sync.changed(space.id);
      const done = decided as Decision<never> | undefined;
      if (done === undefined || 'missing' in done) return { ok: false, why: 'gone' };
      return { ok: true, outcome: done.outcome };
    },
    status: () => (current.space ? sync.status(current.space.id) : undefined),
    onStatus(listener) {
      statusListeners.add(listener);
      return () => void statusListeners.delete(listener);
    },
    wake() {
      // A space may have been made, joined or given a storage in the Household app.
      void load().then(() => sync.refresh().then(() => sync.syncNow()));
    },
    online: () => sync.syncNow(),
    moved: () => move,
    stop() {
      stopped = true;
      sync.stop();
    },
  };
}
