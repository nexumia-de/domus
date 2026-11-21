// The running app without a screen: the shipped content (the classics, the techniques and the
// ingredient catalogue, read through the web app's own readers), the stock of the shown space
// (the web app's stock space on the host package's loop), what the stock allows, the ticks of a
// person, the one filter over the dishes (the web app's `DishFilter` on the web app's entries) and
// the finder's filters. The screens read `state()` and are told when it changed.
// No `gi://` here, so Node tests run it.
import type { Lang } from '@culina/engine';
import type { SpaceView, Store, SyncStatus } from '@nexumia-de/hospes';
import {
  CHARACTER_TABLE,
  COOK_KEY,
  COUNTRIES,
  COURSE_ORDER,
  DISH_FILTER_KEY,
  SPACE_KEY,
  classicLookup,
  classicRow,
  classics,
  createStockSpace,
  entryOfClassic,
  findClassics,
  itemsFromRecords,
  loadCatalogue,
  loadContent,
  lookupOf,
  matchesFilter,
  offeredBy,
  parseCookFilters,
  parseDishFilter,
  restoreEdit,
  tickEdit,
  untickEdit,
  type ClassicRow,
  type CookFilters,
  type CookSource,
  type DishEntry,
  type DishFilter,
  type IngredientRecord,
  type KeyValueStore,
  type Offered,
  type StockRecord,
  type StockSpace,
  type StockSpaceOptions,
  type StockUndo,
} from '@culina/app/core';

/** The keys of the preferences file; the style is the app's, the others are the web app's. */
export const PREFS = {
  style: 'style',
  cook: COOK_KEY,
  space: SPACE_KEY,
  dishes: DISH_FILTER_KEY,
} as const;

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
  /** Every dish as the web app's entry, in the order of the content (empty until `open`). */
  entries(): readonly DishEntry[];
  /** The choices the filter offers: the characters, courses and cuisines the dishes have. */
  offered(): Offered;
  /** The dishes that pass the filter, in the order of the content. */
  dishes(filter: DishFilter): DishEntry[];
  /** The kept filter over the dishes (the web app's key, shared by the list and the finder). */
  dishFilter(): DishFilter;
  /** Keeps the filter and tells the listeners, so that every page shows it. */
  setDishFilter(filter: DishFilter): void;
  /** The kept filters of the finder; only `lacking` is used here, the rest is the dish filter. */
  filters(): CookFilters;
  setFilters(filters: CookFilters): void;
  /** What the stock allows among the classics that pass the dish filter. */
  cookable(filters: CookFilters, dish?: DishFilter): Cookable;
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
  let made: DishEntry[] | undefined;
  /** The entries, made once the catalogue is read (the characters need it). */
  const allEntries = (): DishEntry[] => {
    if (made === undefined) {
      const lookup = (id: string): IngredientRecord | undefined => names.get(id);
      made = classics().map((classic) => entryOfClassic(classic, lookup, lang));
    }
    return made;
  };

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
      made = undefined;
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
    entries: () => allEntries(),
    offered: () =>
      offeredBy(allEntries(), {
        characters: CHARACTER_TABLE.map((entry) => entry.id),
        courses: COURSE_ORDER,
        cuisines: COUNTRIES,
      }),
    dishes: (filter) => allEntries().filter((entry) => matchesFilter(entry, filter)),
    dishFilter: () => parseDishFilter(prefs.get(PREFS.dishes)),
    setDishFilter(filter) {
      prefs.set(PREFS.dishes, JSON.stringify(filter));
      // Every page that shows the filter or what it narrows draws again.
      tell();
    },
    filters: () => parseCookFilters(prefs.get(PREFS.cook)),
    setFilters(filters) {
      prefs.set(PREFS.cook, JSON.stringify(filters));
    },
    cookable(filters, dish = {}) {
      const source: CookSource = {
        ingredients: [],
        components: [],
        dishes: [],
        stock: current.stock,
      };
      // The dish filter chooses the classics; of the finder's own filters only how much may lack
      // is used, so an older kept country or meat choice does not narrow behind the user's back.
      const kept = new Set(
        allEntries()
          .filter((entry) => matchesFilter(entry, dish))
          .map((entry) => entry.id),
      );
      const chosen = classics().filter((classic) => kept.has(classic.id));
      const found = findClassics(
        chosen,
        source,
        names,
        options.today(),
        { lacking: filters.lacking },
        lang,
      );
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
