// The local store: opens the database, builds the repositories, the
// persistence request and the catalog. Docs: docs/store.md.

import { createBackupTracker, systemClock, type BackupTracker } from './backup';
import { openDatabase, type OpenOptions } from './db';
import { createExchange, type Exchange } from './exchange';
import { createPersistence, type Persistence, type PersistState } from './persist';
import {
  affinitiesRepo,
  ingredientsRepo,
  placesRepo,
  specsRepo,
  stockRepo,
  templatesRepo,
  type SpecsRepo,
} from './repo-entities';
import { bindingsRepo, storagesRepo, type StoragesRepo } from './repo-sync';
import { draftsRepo, type DraftsRepo } from './repo-drafts';
import { withReferenceChecks } from './references';
import { keyValueRepo, settingsRepo, type SettingsRepo } from './repo-settings';
import type { Repo } from './repo';
import { transactPlace, type PlaceContents, type PlaceWrite } from './sync-apply';
import { resolveSelection, type PlaceSelection } from './places';
import type {
  Affinity,
  Backup,
  Binding,
  BindingKey,
  Ingredient,
  Place,
  StockKey,
  StockRecord,
  Template,
} from './types';

export * from './backup';
export * from './catalog';
export * from './errors';
export * from './exchange';
export * from './ids';
export { DEFAULT_PLACE_NAME, resolveSelection, type PlaceSelection } from './places';
export type { PlaceContents, PlaceWrite } from './sync-apply';
export type { Persistence, PersistState } from './persist';
export type { Repo } from './repo';
export * from './seed';
export { ingredientReferrers, specReferrers } from './references';
export { appendVersion, asDiffSpec, restoreVersion, setStatus, statusLogAfter } from './versions';
export type * from './types';

export interface LocalStore {
  ingredients: Repo<Ingredient>;
  templates: Repo<Template>;
  specs: SpecsRepo;
  affinities: Repo<Affinity>;
  places: Repo<Place>;
  stock: Repo<StockRecord, StockKey>;
  settings: SettingsRepo;
  /** The places that exist, the ones that count and the entry place, read now. */
  placeSelection(): Promise<PlaceSelection>;
  /** Reads one place and writes `work`'s answer in one transaction (the sync cycle's result). */
  transactPlace(placeId: string, work: (current: PlaceContents) => PlaceWrite): Promise<void>;
  /** Device-local sync configuration: never exported, never in a sync file (docs/sync-backends.md#stores). */
  storages: StoragesRepo;
  bindings: Repo<Binding, BindingKey>;
  /** Unsaved editor state; not entities, not exported. */
  drafts: DraftsRepo;
  persistence: Persistence;
  backup: BackupTracker;
  exchange: Exchange;
  close(): void;
}

export interface StoreOptions extends OpenOptions {
  storage?: Pick<StorageManager, 'persist' | 'persisted'> | undefined;
  /** Called with the answer when the first entity write triggered the request. */
  onPersist?: (state: PersistState) => void;
  /** Called with the new backup state after every change of it. */
  onBackup?: (backup: Backup) => void;
}

export async function openLocalStore(options: StoreOptions = {}): Promise<LocalStore> {
  const db = await openDatabase(options);
  const storage = 'storage' in options ? options.storage : globalThis.navigator?.storage;
  const persistence = createPersistence(storage, keyValueRepo(db, 'meta'));
  let asked = false;
  const clock = options.clock ?? systemClock;
  const backup = createBackupTracker(db, clock, options.onBackup);
  const afterWrite = (): void => {
    void backup.recordChange();
    if (asked) return;
    asked = true;
    void persistence.requestOnce().then((state) => options.onPersist?.(state));
  };
  const context = { db, afterWrite };
  const places = placesRepo(context);
  const settings = settingsRepo(db);
  const affinities = affinitiesRepo(context);
  const guarded = withReferenceChecks({
    ingredients: ingredientsRepo(context),
    specs: specsRepo(context),
    affinities,
  });
  return {
    ingredients: guarded.ingredients,
    templates: templatesRepo(context),
    specs: guarded.specs,
    affinities,
    places,
    stock: stockRepo(context),
    settings,
    placeSelection: async () =>
      resolveSelection(await places.list(), (await settings.load()).places),
    transactPlace: (placeId, work) => transactPlace(db, placeId, work),
    storages: storagesRepo(context),
    bindings: bindingsRepo(context),
    drafts: draftsRepo(db),
    persistence,
    backup,
    exchange: createExchange(db, backup, clock),
    close: () => db.close(),
  };
}
