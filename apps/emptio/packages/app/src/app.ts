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
import { bridgeCycle, type BridgeResult } from './kitchenowl/bridge';
import { createKitchenowlClient, type Fetch, type KitchenowlClient } from './kitchenowl/client';
import { configOf, type KitchenowlConfig } from './kitchenowl/config';
import { KEYS, type Prefs } from './prefs';

/** How often a shared list is read again while the app is in front (docs/behaviour.md#sync). */
export const LIST_INTERVAL_MS = 15_000;

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

/** How the KitchenOwl list of a space was kept in step (docs/kitchenowl.md). */
export interface KitchenowlStatus {
  /** The last cycle. */
  last: Exclude<BridgeResult, { state: 'off' }>;
  /** When a cycle last went through. */
  syncedAt?: string;
}

export interface AppOptions extends ListDeps {
  prefs: Prefs;
  names: { home: string; unnamed: string };
  adapter: CollectionSyncOptions['adapter'];
  /** The requests to a KitchenOwl instance; without it the app sends none. */
  fetch?: Fetch;
  isVisible?: () => boolean;
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
  /** Runs a KitchenOwl cycle for every connected space now. Never rejects. */
  syncKitchenowl(): Promise<void>;
  /** A client for a KitchenOwl server, to check an address and a token; null without `fetch`. */
  kitchenowlClient(url: string, token: string): KitchenowlClient | null;
  /** The page came to the front or the connection is back. */
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
    intervalMs: LIST_INTERVAL_MS,
    // Records another device changed are read again; a status change only redraws.
    onChange: (what) => (what === 'records' ? void load() : tell()),
    ...(options.isVisible ? { isVisible: options.isVisible } : {}),
    ...(options.isOnline ? { isOnline: options.isOnline } : {}),
    ...(options.setTimer ? { setTimer: options.setTimer } : {}),
    ...(options.clearTimer ? { clearTimer: options.clearTimer } : {}),
  });

  const setTimer = options.setTimer ?? ((fn: () => void, ms: number) => setTimeout(fn, ms));
  const clearTimer =
    options.clearTimer ??
    ((handle: unknown) => clearTimeout(handle as ReturnType<typeof setTimeout>));
  const bridges = new Map<string, { busy: boolean; status?: KitchenowlStatus }>();
  let bridgeTimer: unknown;

  /** One KitchenOwl cycle for every space that is connected (docs/kitchenowl.md#when). */
  async function bridge(): Promise<void> {
    const fetch = options.fetch;
    if (fetch === undefined || stopped || current.phase !== 'ready') return;
    if (options.isOnline && !options.isOnline()) return;
    for (const space of current.spaces) {
      const running = bridges.get(space.id) ?? { busy: false };
      bridges.set(space.id, running);
      if (running.busy) continue;
      running.busy = true;
      try {
        const result = await bridgeCycle({ ...deps, fetch }, space.id);
        const before = running.status;
        if (result.state === 'off') {
          delete running.status;
        } else {
          running.status = {
            last: result,
            ...(result.state === 'synced'
              ? { syncedAt: now() }
              : before?.syncedAt === undefined
                ? {}
                : { syncedAt: before.syncedAt }),
          };
        }
        if (result.state !== 'off' && result.changed) {
          await load();
          sync.changed(space.id);
        } else if (result.state !== 'off' || before !== undefined) {
          tell();
        }
      } catch {
        // The shared database failed; the next cycle tries again.
      } finally {
        running.busy = false;
      }
    }
  }

  /** The next KitchenOwl cycle in `ms`, then one every interval while the page is in front. */
  function scheduleBridge(ms: number): void {
    if (options.fetch === undefined || stopped) return;
    clearTimer(bridgeTimer);
    bridgeTimer = setTimer(() => {
      const visible = options.isVisible ? options.isVisible() : true;
      void (visible ? bridge() : Promise.resolve()).finally(() => scheduleBridge(LIST_INTERVAL_MS));
    }, ms);
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
        scheduleBridge(0);
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
      sync.changed(space.id);
      scheduleBridge(2_000);
      return result;
    },
    status: (spaceId) => sync.status(spaceId),
    kitchenowl: (spaceId) => bridges.get(spaceId)?.status,
    syncKitchenowl: () => bridge(),
    kitchenowlClient: (url, token) =>
      options.fetch === undefined
        ? null
        : createKitchenowlClient({ url, token, fetch: options.fetch }),
    wake() {
      // A space may have been made, joined or given a storage in the Household app, and
      // another tab may have changed the list.
      void load()
        .then(() => sync.refresh())
        .then(() => sync.syncNow())
        .then(() => scheduleBridge(0));
    },
    stop() {
      stopped = true;
      sync.stop();
      clearTimer(bridgeTimer);
      listeners.clear();
    },
  };
}
