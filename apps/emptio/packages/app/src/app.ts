// The running app without a screen: what is on the list of the shown space,
// the actions of a person, and the loops that keep shared spaces in step
// (the host package). The screens read `state()` and are told when it changed.
import {
  createCollectionSync,
  ensureSpace,
  pickSpace,
  viewOf,
  type CollectionSync,
  type CollectionSyncOptions,
  type SpaceView,
  type SyncStatus,
} from '@nexumia-de/hospes';
import type { CategoryChange, Entry } from '@emptio/engine';
import {
  CATEGORIES,
  COLLECTIONS,
  KITCHENOWL,
  LIST,
  categoryChangesOf,
  entriesOf,
} from './list/model';
import type { ListDeps } from './list/actions';
import { bridgeCycle } from './kitchenowl/bridge';
import {
  createKitchenowlClient,
  type Fetch,
  type KitchenowlClient,
  type KitchenowlFailure,
} from './kitchenowl/client';
import { configOf, type KitchenowlConfig } from './kitchenowl/config';
import { KEYS, autoSyncOf, type Prefs } from './prefs';

/** How long after a change the run waits, so several changes make one (docs/behaviour.md#sync). */
export const CHANGE_DELAY_MS = 2_000;

export interface AppState {
  /** `loading` until the first read; `failed` when the shared database cannot be opened. */
  phase: 'loading' | 'ready' | 'failed';
  spaces: SpaceView[];
  /** The space whose list is shown. */
  space?: SpaceView;
  entries: Entry[];
  changes: CategoryChange[];
  /** The KitchenOwl list the shown space is connected to. */
  kitchenowl?: KitchenowlConfig;
}

/**
 * Why a KitchenOwl cycle did not run or failed: one of the server's, or `household` when the
 * space's own sync failed just before, so the cycle would work on an old list
 * (docs/kitchenowl.md#when).
 */
export type KitchenowlStatusFailure = KitchenowlFailure | 'household';

/** How the KitchenOwl list of a space was kept in step (docs/kitchenowl.md). */
export interface KitchenowlStatus {
  /** The last cycle. */
  last:
    | { state: 'synced'; changed: boolean }
    | { state: 'failed'; failure: KitchenowlStatusFailure; changed: boolean };
  /** When a cycle last went through. */
  syncedAt?: string;
}

export interface AppOptions extends ListDeps {
  prefs: Prefs;
  names: { home: string; unnamed: string };
  adapter: CollectionSyncOptions['adapter'];
  /** The requests to a KitchenOwl instance; without it the app sends none. */
  fetch?: Fetch;
  isOnline?: () => boolean;
  /** For tests: the loops' timers. */
  setTimer?: CollectionSyncOptions['setTimer'];
  clearTimer?: CollectionSyncOptions['clearTimer'];
}

export interface App {
  state(): AppState;
  /** Calls `listener` after every change of the state or of a sync status; returns the way to stop. */
  subscribe(listener: () => void): () => void;
  /** Reads the spaces and the shown list again. Never rejects. */
  load(): Promise<void>;
  /** Shows the list of another space and remembers the choice. */
  choose(spaceId: string): Promise<void>;
  /**
   * Runs an action on the shown space, reads the list again and asks for a sync cycle.
   * @returns What the action returned, or undefined when there is no space or the write failed
   * (the state then says nothing; the caller shows the failure).
   */
  act<T>(action: (deps: ListDeps, spaceId: string) => Promise<T>): Promise<T | undefined>;
  status(spaceId: string): SyncStatus | undefined;
  /** The KitchenOwl status of a connected space; undefined when it is not connected or not run yet. */
  kitchenowl(spaceId: string): KitchenowlStatus | undefined;
  /**
   * Syncs every space now, whatever the switch says: the space with its storage, then KitchenOwl,
   * then the space again (docs/behaviour.md#sync). Resolves when done. Never rejects.
   */
  syncNow(): Promise<void>;
  /** Whether the app syncs by itself: at the start, at the front and after a change. */
  autoSync(): boolean;
  /** Turns syncing by itself on or off; false when the choice could not be kept. */
  setAutoSync(on: boolean): boolean;
  /** A client for a KitchenOwl server, to check an address and a token; null without `fetch`. */
  kitchenowlClient(url: string, token: string): KitchenowlClient | null;
  /** The page came to the front or the connection is back: a run, if the app syncs by itself. */
  wake(): void;
  stop(): void;
}

export function createApp(options: AppOptions): App {
  const { store, now, newId, prefs, names } = options;
  const deps: ListDeps = { store, now, newId };
  const listeners = new Set<() => void>();
  let current: AppState = { phase: 'loading', spaces: [], entries: [], changes: [] };
  let stopped = false;
  /** Reads are numbered so that a slow one never overwrites a later one. */
  let reads = 0;

  const tell = (): void => {
    for (const listener of [...listeners]) listener();
  };

  const sync: CollectionSync = createCollectionSync({
    store,
    collections: COLLECTIONS,
    adapter: options.adapter,
    now,
    // The app decides when to sync: the run below, never on an interval.
    manual: true,
    // Records another device changed are read again; a status change only redraws.
    onChange: (what) => (what === 'records' ? void load() : tell()),
    ...(options.isOnline ? { isOnline: options.isOnline } : {}),
    ...(options.setTimer ? { setTimer: options.setTimer } : {}),
    ...(options.clearTimer ? { clearTimer: options.clearTimer } : {}),
  });

  const setTimer = options.setTimer ?? ((fn: () => void, ms: number) => setTimeout(fn, ms));
  const clearTimer =
    options.clearTimer ??
    ((handle: unknown) => clearTimeout(handle as ReturnType<typeof setTimeout>));
  const bridges = new Map<string, KitchenowlStatus>();
  let changeTimer: unknown;
  /** The run in flight; a request during it runs one more after it. */
  let running: Promise<void> | undefined;
  let again = false;

  const autoSync = (): boolean => autoSyncOf(prefs.get(KEYS.autoSync));

  function setBridge(spaceId: string, last: KitchenowlStatus['last']): void {
    const before = bridges.get(spaceId);
    const syncedAt = last.state === 'synced' ? now() : before?.syncedAt;
    bridges.set(spaceId, { last, ...(syncedAt === undefined ? {} : { syncedAt }) });
  }

  /**
   * One space: its storage first, so the KitchenOwl cycle works on what the other devices wrote;
   * then KitchenOwl; then the storage again if the cycle changed the space
   * (docs/kitchenowl.md#when).
   */
  async function runSpace(spaceId: string): Promise<void> {
    const pulled = await sync.syncSpace(spaceId);
    const fetch = options.fetch;
    if (fetch === undefined || stopped) return;
    const config = configOf((await store.readCollection(spaceId, KITCHENOWL)).records);
    if (config === undefined) {
      if (bridges.delete(spaceId)) tell();
      return;
    }
    if (pulled === 'failed') {
      // An old list would undo what another device did (a rename, an edit): wait for the storage.
      setBridge(spaceId, { state: 'failed', failure: 'household', changed: false });
      tell();
      return;
    }
    const result = await bridgeCycle({ ...deps, fetch }, spaceId);
    if (result.state === 'off') {
      bridges.delete(spaceId);
      tell();
      return;
    }
    setBridge(spaceId, result);
    if (result.changed) {
      await load();
      if (pulled === 'synced') await sync.syncSpace(spaceId);
    } else tell();
  }

  async function runAll(): Promise<void> {
    if (stopped || current.phase !== 'ready') return;
    if (options.isOnline && !options.isOnline()) return;
    await sync.refresh();
    for (const space of current.spaces) {
      if (stopped) return;
      try {
        await runSpace(space.id);
      } catch {
        // The shared database failed; the next run tries again.
      }
    }
  }

  /** A run of every space; one at a time, and a request during one runs one more after it. */
  function run(): Promise<void> {
    if (running) {
      again = true;
      return running;
    }
    running = (async () => {
      do {
        again = false;
        await runAll();
      } while (again && !stopped);
    })().finally(() => {
      running = undefined;
    });
    return running;
  }

  /** A run soon after a change, so several changes make one. */
  function runAfterChange(): void {
    if (stopped || !autoSync()) return;
    clearTimer(changeTimer);
    changeTimer = setTimer(() => void run(), CHANGE_DELAY_MS);
  }

  async function read(): Promise<AppState> {
    const stored = await ensureSpace(store, names.home);
    const spaces = stored.map((space) => viewOf(space, names.unnamed));
    const lists = new Map<string, Entry[]>();
    for (const space of spaces) {
      lists.set(space.id, entriesOf((await store.readCollection(space.id, LIST)).records));
    }
    const counts = new Map([...lists].map(([id, entries]) => [id, entries.length]));
    const space = pickSpace(spaces, prefs.get(KEYS.space), counts);
    if (space === undefined) return { phase: 'ready', spaces, entries: [], changes: [] };
    const changes = categoryChangesOf((await store.readCollection(space.id, CATEGORIES)).records);
    const kitchenowl = configOf((await store.readCollection(space.id, KITCHENOWL)).records);
    return {
      phase: 'ready',
      spaces,
      space,
      entries: lists.get(space.id) ?? [],
      changes,
      ...(kitchenowl === undefined ? {} : { kitchenowl }),
    };
  }

  async function load(): Promise<void> {
    if (stopped) return;
    const mine = ++reads;
    let next: AppState;
    try {
      next = await read();
    } catch {
      // No IndexedDB (a private window): the app says so and offers to try again.
      next = { phase: 'failed', spaces: [], entries: [], changes: [] };
    }
    if (stopped || mine !== reads) return;
    current = next;
    tell();
  }

  return {
    state: () => current,
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    async load() {
      await load();
      // After the read, so the first space of a new device exists before the loops look.
      if (current.phase === 'ready') {
        await sync.refresh();
        if (autoSync()) await run();
      }
    },
    async choose(spaceId) {
      prefs.set(KEYS.space, spaceId);
      await load();
    },
    async act(action) {
      const space = current.space;
      if (space === undefined) return undefined;
      let result;
      try {
        result = await action(deps, space.id);
      } catch {
        await load();
        return undefined;
      }
      await load();
      runAfterChange();
      return result;
    },
    status: (spaceId) => sync.status(spaceId),
    kitchenowl: (spaceId) => bridges.get(spaceId),
    syncNow: () => run(),
    autoSync,
    setAutoSync(on) {
      const kept = prefs.set(KEYS.autoSync, on ? 'on' : 'off');
      tell();
      if (on) void run();
      return kept;
    },
    kitchenowlClient: (url, token) =>
      options.fetch === undefined
        ? null
        : createKitchenowlClient({ url, token, fetch: options.fetch }),
    wake() {
      // A space may have been made, joined or given a storage in the Household app, and
      // another tab may have changed the list.
      void load()
        .then(() => sync.refresh())
        .then(() => (autoSync() ? run() : undefined));
    },
    stop() {
      stopped = true;
      sync.stop();
      clearTimer(changeTimer);
      listeners.clear();
    },
  };
}
