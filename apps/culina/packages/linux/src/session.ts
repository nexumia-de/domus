// The running app without a screen: the shipped content (the classics, the techniques and the
// ingredient catalogue, read through the web app's own readers), the stock of the shown space
// (the web app's stock space on the host package's loop), what the stock allows, the ticks of a
// person, and the cooking filters. The screens read `state()` and are told when it changed.
// No `gi://` here, so Node tests run it.
import type { Lang } from '@culina/engine';
import type { SpaceView, Store, SyncStatus } from '@nexumia-de/hospes';
import {
  COOK_KEY,
  SPACE_KEY,
  classicLookup,
  classicRow,
  classics,
  createStockSpace,
  findClassics,
  itemsFromRecords,
  loadCatalogue,
  loadContent,
  lookupOf,
  parseCookFilters,
  restoreEdit,
  tickEdit,
  untickEdit,
  type ClassicRow,
  type CookFilters,
  type CookSource,
  type IngredientRecord,
  type KeyValueStore,
  type StockRecord,
  type StockSpace,
  type StockSpaceOptions,
  type StockUndo,
} from '@culina/app/core';

/** The keys of the preferences file; the style is the app's, the others are the web app's. */
export const PREFS = { style: 'style', cook: COOK_KEY, space: SPACE_KEY } as const;

export interface SessionState {
  /** `loading` until the first read; `failed` when the files cannot be read; `no-content` when the built-in data is damaged. */
  phase: 'loading' | 'ready' | 'failed' | 'no-content';
  spaces: SpaceView[];
  /** The space whose stock is used. */
  space?: SpaceView;
  /** The items of the used space that the catalogue knows, in record order. */
  stock: readonly StockRecord[];
}

/** What the finder shows for the filters; the rows carry the dish's id. */
export type Cookable =
  | { ok: false }
  | {
      ok: true;
      shown: ClassicRow[];
      /** When `shown` is empty: the nearest classics, fewest lacking first. */
      nearest: ClassicRow[];
      hasStock: boolean;
    };

export interface SessionOptions {
  store: Store;
  /** The web app's `classics.json` as one value. */
  content: unknown;
  /** The web app's `ingredient-catalogue.json` as one value. */
  catalogue: unknown;
  lang: Lang;
  /** The day the finder ranks for, `YYYY-MM-DD`. */
  today: () => string;
  now: () => string;
  prefs: { get(key: string): string | null; set(key: string, value: string): boolean };
  names: { home: string; unnamed: string };
  adapter: StockSpaceOptions['adapter'];
  isVisible?: () => boolean;
  isOnline?: () => boolean;
  /** For tests: the loop's timers. */
  setTimer?: StockSpaceOptions['setTimer'];
  clearTimer?: StockSpaceOptions['clearTimer'];
}

export interface Session {
  /** Reads the content once; false when the built-in data is damaged. Call before `load`. */
  open(): Promise<boolean>;
  /** The ingredients of the catalogue by id (empty until `open`). */
  catalogue(): ReadonlyMap<string, IngredientRecord>;
  state(): SessionState;
  /** Calls `listener` after every change of the state or of a sync status; returns the way to stop. */
  subscribe(listener: () => void): () => void;
  /** Reads the spaces and the stock again. Never rejects. */
  load(): Promise<void>;
  /** Uses the stock of another space and remembers the choice. */
  choose(spaceId: string): Promise<void>;
  /** The kept filters of the finder. */
  filters(): CookFilters;
  setFilters(filters: CookFilters): void;
  /** What the stock allows among the classics. */
  cookable(filters: CookFilters): Cookable;
  /** Marks an ingredient as there. @returns false when nothing could be written. */
  tick(ingredientId: string): Promise<boolean>;
  /** Marks it as not there. @returns what Undo needs, or undefined when it was not there or nothing could be written. */
  untick(ingredientId: string): Promise<StockUndo | undefined>;
  /** Takes an untick back. */
  restore(undo: StockUndo): Promise<boolean>;
  status(): SyncStatus | undefined;
  /** The window came to the front or the connection is back. */
  wake(): void;
  stop(): void;
}

export function createSession(options: SessionOptions): Session {
  const { prefs, lang } = options;
  const listeners = new Set<() => void>();
  let names: ReadonlyMap<string, IngredientRecord> = new Map();
  let current: SessionState = { phase: 'loading', spaces: [], stock: [] };
  let content = true;
  let stopped = false;

  const tell = (): void => {
    for (const listener of [...listeners]) listener();
  };
  /** A key of the collection stands for a catalogue ingredient, or the record is not shown. */
  const resolve = (key: string) =>
    names.has(key) ? { kind: 'ingredient' as const, id: key } : undefined;

  const keyValue: KeyValueStore = {
    getItem: (key) => prefs.get(key),
    setItem: (key, value) => void prefs.set(key, value),
  };

  const space: StockSpace = createStockSpace({
    shared: options.store,
    now: options.now,
    prefs: keyValue,
    names: options.names,
    shownCount: (records) =>
      new Set(itemsFromRecords(records, resolve).map((item) => item.ref.id)).size,
    onRecords: () => {
      const read = space.state();
      current = {
        phase: content ? read.phase : 'no-content',
        spaces: read.spaces,
        ...(read.space ? { space: read.space } : {}),
        stock: itemsFromRecords(read.records, resolve),
      };
      tell();
    },
    adapter: options.adapter,
    ...(options.isVisible ? { isVisible: options.isVisible } : {}),
    ...(options.isOnline ? { isOnline: options.isOnline } : {}),
    ...(options.setTimer ? { setTimer: options.setTimer } : {}),
    ...(options.clearTimer ? { clearTimer: options.clearTimer } : {}),
  });

  const asFetch = (value: unknown) => () =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(value) });

  const change = async <T>(
    decide: Parameters<StockSpace['change']>[0],
  ): Promise<{ ok: true; outcome: T } | { ok: false }> => {
    const done = await space.change(decide);
    return done.ok ? { ok: true, outcome: done.outcome as T } : { ok: false };
  };

  return {
    async open() {
      const shipped = await loadContent(asFetch(options.content));
      const entries = await loadCatalogue(asFetch(options.catalogue));
      names = new Map((entries ?? []).map((entry) => [entry.id, entry]));
      content = shipped.classics.length > 0 && names.size > 0;
      return content;
    },
    catalogue: () => names,
    state: () => current,
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    async load() {
      if (stopped) return;
      await space.load();
    },
    choose: (spaceId) => space.choose(spaceId),
    filters: () => parseCookFilters(prefs.get(PREFS.cook)),
    setFilters(filters) {
      prefs.set(PREFS.cook, JSON.stringify(filters));
    },
    cookable(filters) {
      const source: CookSource = {
        ingredients: [],
        components: [],
        dishes: [],
        stock: current.stock,
      };
      const found = findClassics(classics(), source, names, options.today(), filters, lang);
      if (!found.ok) return { ok: false };
      const look = classicLookup(found.ingredients, lookupOf(source), lang);
      return {
        ok: true,
        shown: found.shown.map((candidate) => classicRow(candidate, look)),
        nearest: found.nearest.map((candidate) => classicRow(candidate, look)),
        hasStock: current.stock.length > 0,
      };
    },
    async tick(ingredientId) {
      if (!names.has(ingredientId)) return false;
      return (await change((records) => tickEdit(records, ingredientId, false))).ok;
    },
    async untick(ingredientId) {
      const done = await change<StockUndo>((records) => untickEdit(records, ingredientId));
      return done.ok ? done.outcome : undefined;
    },
    async restore(undo) {
      return (await change((records) => restoreEdit(records, undo))).ok;
    },
    status: () => space.status(),
    wake: () => space.wake(),
    stop() {
      stopped = true;
      space.stop();
      listeners.clear();
    },
  };
}
