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
import { CATEGORIES, COLLECTIONS, LIST, categoryChangesOf, entriesOf } from './list/model';
import type { ListDeps } from './list/actions';
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
}

export interface AppOptions extends ListDeps {
  prefs: Prefs;
  names: { home: string; unnamed: string };
  adapter: CollectionSyncOptions['adapter'];
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
    return { phase: 'ready', spaces, space, entries: lists.get(space.id) ?? [], changes };
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
      if (current.phase === 'ready') await sync.refresh();
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
      return result;
    },
    status: (spaceId) => sync.status(spaceId),
    wake() {
      // A space may have been made, joined or given a storage in the Household app, and
      // another tab may have changed the list.
      void load()
        .then(() => sync.refresh())
        .then(() => sync.syncNow());
    },
    stop() {
      stopped = true;
      sync.stop();
      listeners.clear();
    },
  };
}
