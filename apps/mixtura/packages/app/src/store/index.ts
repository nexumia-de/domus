// The local store: opens the database, builds the repositories, the
// persistence request and the catalog. Docs: docs/store.md.

import { createBackupTracker, systemClock, type BackupTracker } from './backup';
import { openDatabase, type OpenOptions } from './db';
import { createExchange, type Exchange } from './exchange';
import { createPersistence, type Persistence, type PersistState } from './persist';
import {
  affinitiesRepo,
  ingredientsRepo,
  specsRepo,
  templatesRepo,
  type SpecsRepo,
} from './repo-entities';
import { draftsRepo, type DraftsRepo } from './repo-drafts';
import { withReferenceChecks } from './references';
import { keyValueRepo, settingsRepo, type SettingsRepo } from './repo-settings';
import type { Repo } from './repo';
import type { Affinity, Backup, Ingredient, Template } from './types';

export * from './backup';
export * from './catalog';
export * from './errors';
export * from './exchange';
export * from './ids';
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
  settings: SettingsRepo;
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
    settings,
    drafts: draftsRepo(db),
    persistence,
    backup,
    exchange: createExchange(db, backup, clock),
    close: () => db.close(),
  };
}
