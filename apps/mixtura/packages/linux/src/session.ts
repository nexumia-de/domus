// The running app without a screen: the drinks (the built-in data and the engine), the
// stock of the shown space and what it allows, the actions of a person, and the loop that
// keeps a shared space in step (the host package). The screens read `state()` and are
// told when it changed. No `gi://` here, so Node tests run it.
import {
  createCollectionSync,
  ensureSpace,
  pickSpace,
  viewOf,
  type CollectionSync,
  type CollectionSyncOptions,
  type SpaceView,
  type Store,
  type SyncStatus,
} from '@nexumia-de/hospes';
import {
  STOCK_COLLECTION,
  buildModel,
  combineSpaces,
  deriveStock,
  parseSeed,
  rowsOf,
  withPresent,
  writeStock,
  type BrowseModel,
  type Derived,
  type ModelInput,
  type StockRecords,
} from '@mixtura/app/core';

/** How often a shared space is read again while the app is in front. */
export const STOCK_INTERVAL_MS = 15_000;

export const PREFS = { space: 'space', style: 'style', units: 'units' } as const;

export interface SessionState {
  /** `loading` until the first read; `failed` when the files cannot be read; `no-seed` when the built-in data is damaged. */
  phase: 'loading' | 'ready' | 'failed' | 'no-seed';
  spaces: SpaceView[];
  /** The space whose bottles are shown. */
  space?: SpaceView;
  /** The live stock records of the shown space, one per ingredient. */
  records: StockRecords;
  /** What the stock allows; the same object until the records are read again. */
  derived?: Derived;
}

export interface SessionOptions {
  store: Store;
  /** The built-in drink data as the web app loads it (`seed.json`). */
  seed: unknown;
  now: () => string;
  prefs: { get(key: string): string | null; set(key: string, value: string): boolean };
  names: { home: string; unnamed: string };
  adapter: CollectionSyncOptions['adapter'];
  isVisible?: () => boolean;
  isOnline?: () => boolean;
  /** For tests: the loop's timers. */
  setTimer?: CollectionSyncOptions['setTimer'];
  clearTimer?: CollectionSyncOptions['clearTimer'];
}

export interface Session {
  /** The drinks; null when the built-in data is damaged. */
  model(): BrowseModel | null;
  state(): SessionState;
  /** Calls `listener` after every change of the state or of a sync status; returns the way to stop. */
  subscribe(listener: () => void): () => void;
  /** Reads the spaces and the stock again. Never rejects. */
  load(): Promise<void>;
  /** Shows the bottles of another space and remembers the choice. */
  choose(spaceId: string): Promise<void>;
  /**
   * Marks ingredients in stock or out in the shown space.
   * @returns The ids whose mark changed, or undefined when there is no space or the write failed.
   */
  mark(ids: readonly string[], present: boolean): Promise<string[] | undefined>;
  status(spaceId: string): SyncStatus | undefined;
  /** The window came to the front or the connection is back. */
  wake(): void;
  stop(): void;
}

export function createSession(options: SessionOptions): Session {
  const { store, now, prefs, names } = options;
  const listeners = new Set<() => void>();
  let model: BrowseModel | null = null;
  let current: SessionState = { phase: 'loading', spaces: [], records: new Map() };
  let stopped = false;
  /** Reads are numbered so that a slow one never overwrites a later one. */
  let reads = 0;

  try {
    const seed = parseSeed(options.seed);
    // The built-in data alone: the native app has no entities of the user's own.
    const built = buildModel({
      ingredients: seed.ingredients as ModelInput['ingredients'],
      templates: seed.templates.map((value) => ({
        value,
        origin: 'seed' as const,
      })) as unknown as ModelInput['templates'],
      specs: seed.specs.map((value) => ({
        value,
        origin: 'seed' as const,
      })) as unknown as ModelInput['specs'],
      vocabulary: seed.vocabulary,
      ...(seed.attribution ? { attribution: seed.attribution } : {}),
      seedVersion: seed.seedVersion,
    });
    if (built.ok) model = built.model;
  } catch {
    model = null;
  }

  const tell = (): void => {
    for (const listener of [...listeners]) listener();
  };

  const sync: CollectionSync = createCollectionSync({
    store,
    collections: [STOCK_COLLECTION],
    adapter: options.adapter,
    now,
    intervalMs: STOCK_INTERVAL_MS,
    // Records another device changed are read again; a status change only redraws.
    onChange: (what) => (what === 'records' ? void load() : tell()),
    ...(options.isVisible ? { isVisible: options.isVisible } : {}),
    ...(options.isOnline ? { isOnline: options.isOnline } : {}),
    ...(options.setTimer ? { setTimer: options.setTimer } : {}),
    ...(options.clearTimer ? { clearTimer: options.clearTimer } : {}),
  });

  async function read(): Promise<SessionState> {
    const stored = await ensureSpace(store, names.home);
    const spaces = stored.map((space) => viewOf(space, names.unnamed));
    const bySpace = new Map<string, Map<string, ReturnType<typeof rowsOf>[number]>>();
    for (const space of spaces) {
      const rows = rowsOf(
        space.id,
        (await store.readCollection(space.id, STOCK_COLLECTION)).records,
      );
      bySpace.set(space.id, new Map(rows.map((row) => [row.ingredientId, row])));
    }
    const counts = new Map(
      [...bySpace].map(([id]) => [
        id,
        [...combineSpaces(bySpace, [id]).values()].filter((r) => r.present).length,
      ]),
    );
    const space = pickSpace(spaces, prefs.get(PREFS.space), counts);
    if (space === undefined) return { phase: 'ready', spaces, records: new Map() };
    const records = combineSpaces(bySpace, [space.id]);
    return {
      phase: 'ready',
      spaces,
      space,
      records,
      ...(model ? { derived: deriveStock(model, records) } : {}),
    };
  }

  async function load(): Promise<void> {
    if (stopped) return;
    const mine = ++reads;
    let next: SessionState;
    try {
      next = await read();
    } catch {
      next = { phase: 'failed', spaces: [], records: new Map() };
    }
    if (model === null) next = { ...next, phase: 'no-seed' };
    if (stopped || mine !== reads) return;
    current = next;
    tell();
  }

  return {
    model: () => model,
    state: () => current,
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    async load() {
      await load();
      // After the read, so the first space of a new device exists before the loop looks.
      if (current.phase === 'ready') await sync.refresh();
    },
    async choose(spaceId) {
      prefs.set(PREFS.space, spaceId);
      await load();
    },
    async mark(ids, present) {
      const space = current.space;
      if (space === undefined) return undefined;
      const changed = ids.filter((id) => (current.records.get(id)?.present ?? false) !== present);
      if (changed.length === 0) return [];
      try {
        await writeStock(
          store,
          changed.map((id) => ({
            ...withPresent(current.records, id, present),
            spaceId: space.id,
            updatedAt: now(),
          })),
          now,
        );
      } catch {
        await load();
        return undefined;
      }
      await load();
      sync.changed(space.id);
      return changed;
    },
    status: (spaceId) => sync.status(spaceId),
    wake() {
      // A space may have been joined here, and another window may have changed the stock.
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
