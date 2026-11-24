// The running app without a screen: the shipped content (the classics, the techniques and the
// ingredient catalogue, read through the web app's own readers), the stock of the shown space
// (the web app's stock space on the host package's loop), the ticks of a person, the one filter
// over the dishes (the web app's `DishFilter` on the web app's entries) and Cook's one list with
// "Only with what I have" and the order "Use up first" (the web app's `dishListView`, asked of the
// finder with `readyKeysOf` and `useUpFrom`, kept under the web app's `culina.cookList`), in the
// web app's groups (`groupRows`), and a shipped dish as it is cooked with the cook's choice of
// filling (the web app's `classics/choices.ts`). The screens read `state()` and are told when it
// changed.
// No `gi://` here, so Node tests run it.
import type { Classic, Lang } from '@culina/engine';
import type { SpaceView, Store, SyncStatus } from '@nexumia-de/hospes';
import {
  CHARACTER_TABLE,
  COOK_LIST_KEY,
  COUNTRIES,
  COURSE_ORDER,
  DISH_FILTER_KEY,
  SPACE_KEY,
  asChosen,
  chooseFilling,
  classics,
  dishClassics,
  fillingChoices,
  groupRows,
  createStockSpace,
  dishListView,
  entryOfClassic,
  itemsFromRecords,
  loadCatalogue,
  loadContent,
  matchesFilter,
  offeredBy,
  parseCookList,
  parseDishFilter,
  readyKeysOf,
  restoreEdit,
  tickEdit,
  untickEdit,
  useUpFrom,
  type CookList,
  type CookSource,
  type DishEntry,
  type DishFilter,
  type FillingChoice,
  type IngredientRecord,
  type ListRow,
  type KeyValueStore,
  type Offered,
  type RowGroup,
  type StockRecord,
  type StockSpace,
  type StockSpaceOptions,
  type StockUndo,
  type UseUpNow,
} from '@culina/app/core';

/** The keys of the preferences file; the style is the app's, the others are the web app's. */
export const PREFS = {
  style: 'style',
  cookList: COOK_LIST_KEY,
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

/** Cook's one list for a filter and the kept choices, as the web app's `dishListView` gives it. */
export interface CookView {
  /** The dishes that pass, by name, or in the order "Use up first". */
  rows: ListRow[];
  /**
   * By name, the same rows in the web app's groups (the frames, then by course); undefined where
   * the list stays flat: the order "Use up first", or fewer than two groups left.
   */
  groups?: RowGroup[];
  /** How many dishes there are before any choice. */
  total: number;
  /** In the order "Use up first": the finder's answer (the marks, whether any item is dated, names). */
  useUp?: UseUpNow;
  /** "Only with what I have" is on and nothing is ticked: the list gives way to the way to tick. */
  noStock: boolean;
}

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
  /** Cook's kept choices, "Only with what I have" and the order (the web app's key). */
  cookList(): CookList;
  /** Keeps them and tells the listeners. */
  setCookList(list: CookList): void;
  /** Cook's one list: the dishes that pass the filter and the choices, in the chosen order. */
  cookView(filter: DishFilter, list: CookList): CookView;
  /**
   * A shipped dish as it is cooked: without the alternatives of its slots, each slot filled as the
   * cook chose (the web app's `asChosen`); what the dish page and the cook page show. Undefined
   * for an id the content lacks.
   */
  dish(id: string): Classic | undefined;
  /** The slots of a dish that have a choice of filling, the one in the dish first (`fillingChoices`). */
  fillings(id: string): FillingChoice[];
  /** Fills a slot with another of its recipes, for as long as the app runs (the web app's `chooseFilling`). */
  chooseFilling(id: string, slotIndex: number, componentId: string): void;
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
  let byKey: ReadonlyMap<string, DishEntry> | undefined;
  /**
   * The finder's answers for one stock on one day, asked once: the stock list is replaced, never
   * changed, when the records change, so its identity says whether to ask again.
   */
  let asked:
    | { stock: readonly StockRecord[]; today: string; ready?: Set<string>; useUp?: UseUpNow }
    | undefined;
  /** The entries, made once the catalogue is read (the characters need it). */
  const allEntries = (): DishEntry[] => {
    if (made === undefined) {
      const lookup = (id: string): IngredientRecord | undefined => names.get(id);
      made = dishClassics().map((classic) => entryOfClassic(classic, lookup, lang));
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
      byKey = undefined;
      asked = undefined;
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
    cookList: () => parseCookList(prefs.get(PREFS.cookList)),
    setCookList(list) {
      prefs.set(PREFS.cookList, JSON.stringify(list));
      tell();
    },
    cookView(filter, list) {
      const entries = allEntries();
      const today = options.today();
      if (asked === undefined || asked.stock !== current.stock || asked.today !== today) {
        asked = { stock: current.stock, today };
      }
      // The native app has no notebook: the source is the stock alone, the dishes the shipped ones.
      const source: CookSource = {
        ingredients: [],
        components: [],
        dishes: [],
        stock: current.stock,
      };
      const shipped = { classics: dishClassics(), catalogue: names, lang };
      if (list.have && asked.ready === undefined) asked.ready = readyKeysOf(source, today, shipped);
      if (list.order === 'use-up' && asked.useUp === undefined) {
        byKey ??= new Map(entries.map((entry) => [entry.key, entry]));
        asked.useUp = useUpFrom(source, today, byKey, shipped);
      }
      const useUp = list.order === 'use-up' ? asked.useUp : undefined;
      const view = dishListView(entries, filter, '', lang, {
        ...(list.have && asked.ready !== undefined ? { ready: asked.ready } : {}),
        ...(useUp === undefined ? {} : { useUp: useUp.marks }),
      });
      // By name the list stands in the web app's groups; "Use up first" is one list in its order.
      const groups = list.order === 'name' ? groupRows(view.rows) : undefined;
      return {
        rows: view.rows,
        ...(groups === undefined ? {} : { groups }),
        total: view.total,
        ...(useUp === undefined ? {} : { useUp }),
        noStock: list.have && current.stock.length === 0,
      };
    },
    dish(id) {
      const classic = classics().find((c) => c.id === id);
      return classic === undefined ? undefined : asChosen(classic);
    },
    fillings(id) {
      const classic = classics().find((c) => c.id === id);
      return classic === undefined ? [] : fillingChoices(classic, lang);
    },
    chooseFilling: (id, slotIndex, componentId) => chooseFilling(id, slotIndex, componentId),
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
