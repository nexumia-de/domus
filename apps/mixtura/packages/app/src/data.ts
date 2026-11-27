// Connects the app state to the local store and the seed data: opens the
// database (migrating it), loads the seed, takes the settings from the
// store, saves a changed setting, reports the persistence answer. When the
// store cannot be used the app stays read-only with the seed data
// (docs/store.md#failure).

import { type AppState } from './app-state';
import { createExchangeActions, saveAsFile, type ExchangeActions } from './exchange-actions';
import { LEGACY_KEY, savePrefs } from './prefs';
import {
  adapterFor,
  SPACE_COLLECTION,
  createCollectionSync,
  createIdbStore,
  type CollectionSync,
  type Store as SharedStore,
} from '@nexumia-de/hospes';
import { RATINGS_COLLECTION } from './ratings/source';
import { invalidateRatings } from './ratings/state';
import { STOCK_COLLECTION } from './stock/source';
import { invalidateStock } from './stock/state';
import { GITHUB_API } from './env';
import { type Store } from './state';
import { strings } from './strings';
import { nowInstant } from './today';
import {
  createCatalog,
  emptySeed,
  loadSeed,
  openLocalStore,
  StoreError,
  toStoreError,
  type Catalog,
  type LocalStore,
  type Seed,
} from './store';

export interface AppData {
  /** Seed data with the user's own entities on top; the seed alone in read-only mode. */
  catalog(): Catalog;
  /** The writable store, or null while it opens and after it failed. */
  local(): LocalStore | null;
  /** Export, import, undo and the backup reminder (Settings, Data). */
  exchange: ExchangeActions;
  /**
   * The database the apps on the address share (host package): the spaces and their collections.
   * Stock is the collection `stock` of a space (docs/store.md#stock-in-a-space).
   */
  shared: SharedStore;
  /** Keeps the stock of every shared space in step with its storage (the host package's loops). */
  sync: CollectionSync;
}

export interface Connection {
  data: AppData;
  /** Opens the store and loads the seed again (the Try Again button). */
  retry(): void;
  /** Resolves when the first attempt finished; for tests. */
  ready: Promise<void>;
}

function readLegacyPrefs(): string | null {
  try {
    return localStorage.getItem(LEGACY_KEY);
  } catch {
    return null;
  }
}

export function connect(app: Store<AppState>): Connection {
  let local: LocalStore | null = null;
  let seed: Seed = emptySeed;
  let catalog = createCatalog(emptySeed, null);
  // Set while the state is changed from the store's values or a rollback,
  // so that change is not written back.
  let quiet = false;
  // Counts opens, so a late event of a replaced connection is ignored.
  let attempts = 0;
  const patch = (change: Partial<AppState>): void => {
    quiet = true;
    app.set(change);
    quiet = false;
  };

  app.subscribe((state, previous) => {
    if (state.theme !== previous.theme || state.units !== previous.units) savePrefs(state);
    if (quiet || !local) return;
    const store = local;
    for (const key of [
      'theme',
      'units',
      'alcoholWithout',
      'alcoholLow',
      'buyNextMode',
      'buyNextDrafts',
      'buyNextRetired',
    ] as const) {
      if (state[key] === previous[key]) continue;
      store.settings.set(key, state[key]).then(
        () => {
          if (app.get().saveError) patch({ saveError: null });
        },
        (error: unknown) =>
          patch({
            [key]: previous[key],
            saveError: toStoreError(error).message,
          } as Partial<AppState>),
      );
    }
  });

  async function open(): Promise<void> {
    patch({ storage: { kind: 'opening' }, seed: { kind: 'loading' }, saveError: null });
    local?.close();
    local = null;

    try {
      seed = await loadSeed();
      patch({ seed: { kind: 'ready' } });
    } catch (error) {
      seed = emptySeed;
      patch({ seed: { kind: 'failed', reason: toStoreError(error).message } });
    }

    const attempt = ++attempts;
    try {
      const opened = await openLocalStore({
        // Another window upgraded the database and this connection is closed:
        // read-only, with a banner that offers a reload (docs/store.md).
        onVersionChange: () => {
          if (attempt !== attempts) return;
          local = null;
          catalog = createCatalog(seed, null);
          patch({
            storage: { kind: 'error', error: 'stale', reason: strings.storage.reasons.stale },
          });
        },
        legacyPrefs: readLegacyPrefs,
        onPersist: (persistence) => patch({ persistence }),
        onBackup: (backup) => {
          patch({ backup });
          void exchange.refresh();
        },
      });
      const settings = await opened.settings.load();
      local = opened;
      catalog = createCatalog(seed, opened);
      patch({
        theme: settings.theme,
        units: settings.units,
        alcoholWithout: settings.alcoholWithout,
        alcoholLow: settings.alcoholLow,
        buyNextMode: settings.buyNextMode,
        buyNextDrafts: settings.buyNextDrafts,
        buyNextRetired: settings.buyNextRetired,
        storage: { kind: 'ready' },
        persistence: await opened.persistence.status(),
      });
      void exchange.refresh();
      // The migration has copied the old preferences; the old key is not needed again.
      try {
        localStorage.removeItem(LEGACY_KEY);
      } catch {
        // Blocked: harmless, the migration does not run twice.
      }
    } catch (error) {
      const failure = error instanceof StoreError ? error : toStoreError(error);
      catalog = createCatalog(seed, null);
      patch({
        storage: { kind: 'error', error: failure.kind, reason: failure.message },
        persistence: 'unknown',
      });
    }
  }

  const exchange = createExchangeActions({
    app,
    local: () => local,
    seedVersion: () => seed.seedVersion,
    now: () => new Date(),
    download: saveAsFile,
  });

  const shared = createIdbStore();
  const sync = createCollectionSync({
    store: shared,
    // `space` brings the persons the Household app adds (docs/ratings.md).
    collections: [STOCK_COLLECTION, RATINGS_COLLECTION, SPACE_COLLECTION],
    adapter: (storage) => adapterFor(storage, { apiBase: GITHUB_API }),
    now: nowInstant,
    // Records another device changed are read again; a status change only redraws.
    onChange: (what) =>
      what === 'records'
        ? (invalidateStock(app), invalidateRatings(app))
        : app.set({ stockRev: app.get().stockRev + 1 }),
    isVisible: () => globalThis.document?.visibilityState !== 'hidden',
    isOnline: () => globalThis.navigator?.onLine !== false,
  });

  const ready = open();
  return {
    data: { catalog: () => catalog, local: () => local, exchange, shared, sync },
    retry: () => void open(),
    ready,
  };
}
