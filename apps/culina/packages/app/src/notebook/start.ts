// Opens the store once at startup and loads every record into the cache, then the stock: the
// shared collection of a space in the database all apps share. Never throws: a store that cannot
// open leaves the empty, read-only notebook and the reason for the screens to say.
import { adapterFor, createIdbStore, type Store as SharedStore } from '@nexumia-de/hospes';
import { GITHUB_API } from '../env';
import { browserStore, type KeyValueStore } from '../prefs';
import { createStockSpace, type StockSpaceOptions } from '../shared-stock/space';
import { openStore, type OpenOptions } from '../store';
import { strings } from '../strings';
import { load } from './load';
import { emit, reset, state } from './state';
import { shownCount, stockKeyOf } from './stock';

type Options = Partial<Pick<OpenOptions, 'indexedDB'>> & {
  now?: () => string;
  newId?: () => string;
  /** The database all apps share; by default IndexedDB `domus` on the same factory. */
  shared?: SharedStore;
  /** Where the choice of space is kept; by default localStorage. */
  prefs?: KeyValueStore | null;
  /** For tests: the storage adapter and the loops' timers. */
  sync?: Partial<
    Pick<StockSpaceOptions, 'adapter' | 'isVisible' | 'isOnline' | 'setTimer' | 'clearTimer'>
  >;
};

export const startNotebook = async (options: Options = {}): Promise<void> => {
  reset();
  if (options.now) state.now = options.now;
  if (options.newId) state.newId = options.newId;
  const opened = await openStore({
    now: state.now,
    ...(options.indexedDB === undefined ? {} : { indexedDB: options.indexedDB }),
  });
  if (!opened.ok) state.problem = opened.error.code;
  else if (await load(opened.store)) state.store = opened.store;
  else {
    opened.store.close();
    state.problem = 'unavailable';
  }
  await startStock(options);
  emit();
};

const startStock = async (options: Options): Promise<void> => {
  let shared = options.shared;
  if (shared === undefined) {
    try {
      shared = createIdbStore(
        options.indexedDB === undefined ? {} : { factory: options.indexedDB },
      );
    } catch {
      return;
    }
  }
  const space = createStockSpace({
    shared,
    now: () => state.now(),
    prefs: options.prefs === undefined ? browserStore() : options.prefs,
    names: { home: strings.stock.space.home, unnamed: strings.stock.space.unnamed },
    shownCount,
    onRecords: emit,
    // The old items move only when Culina's own database is open.
    ...(state.store === undefined ? {} : { legacy: { own: state.store, keyOf: stockKeyOf } }),
    adapter: options.sync?.adapter ?? ((storage) => adapterFor(storage, { apiBase: GITHUB_API })),
    ...(options.sync?.isVisible ? { isVisible: options.sync.isVisible } : {}),
    ...(options.sync?.isOnline ? { isOnline: options.sync.isOnline } : {}),
    ...(options.sync?.setTimer ? { setTimer: options.sync.setTimer } : {}),
    ...(options.sync?.clearTimer ? { clearTimer: options.sync.clearTimer } : {}),
  });
  state.stockSpace = space;
  await space.load();
};
