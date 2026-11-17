// The local store: opens the database, builds the repositories, the
// persistence request and the catalog. Docs: docs/store.md.

import { openDatabase, type OpenOptions } from './db';
import { createPersistence, type Persistence, type PersistState } from './persist';
import {
  affinitiesRepo,
  ingredientsRepo,
  specsRepo,
  stockRepo,
  templatesRepo,
  type SpecsRepo,
} from './repo-entities';
import { keyValueRepo, settingsRepo, type SettingsRepo } from './repo-settings';
import type { Repo } from './repo';
import type { Affinity, Ingredient, Stock, Template } from './types';

export * from './catalog';
export * from './errors';
export * from './ids';
export type { Persistence, PersistState } from './persist';
export type { Repo } from './repo';
export * from './seed';
export type * from './types';

export interface LocalStore {
  ingredients: Repo<Ingredient>;
  templates: Repo<Template>;
  specs: SpecsRepo;
  affinities: Repo<Affinity>;
  stock: Repo<Stock>;
  settings: SettingsRepo;
  persistence: Persistence;
  close(): void;
}

export interface StoreOptions extends OpenOptions {
  storage?: Pick<StorageManager, 'persist' | 'persisted'> | undefined;
  /** Called with the answer when the first entity write triggered the request. */
  onPersist?: (state: PersistState) => void;
}

export async function openLocalStore(options: StoreOptions = {}): Promise<LocalStore> {
  const db = await openDatabase(options);
  const storage = 'storage' in options ? options.storage : globalThis.navigator?.storage;
  const persistence = createPersistence(storage, keyValueRepo(db, 'meta'));
  let asked = false;
  const afterWrite = (): void => {
    if (asked) return;
    asked = true;
    void persistence.requestOnce().then((state) => options.onPersist?.(state));
  };
  const context = { db, afterWrite };
  return {
    ingredients: ingredientsRepo(context),
    templates: templatesRepo(context),
    specs: specsRepo(context),
    affinities: affinitiesRepo(context),
    stock: stockRepo(context),
    settings: settingsRepo(db),
    persistence,
    close: () => db.close(),
  };
}
