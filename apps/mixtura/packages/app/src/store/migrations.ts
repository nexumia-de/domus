// Ordered schema migrations. Each runs inside the versionchange
// transaction, gets everything it needs as arguments (no globals), and has
// a test that opens a database of the previous version. A migration is
// never edited after release: a new change is a new migration.
//
// The layouts below are snapshots, not references to schema.ts, which only
// ever describes the newest version.

import { parsePrefs } from '../prefs';
import type { Clock } from './clock';

export interface MigrationContext {
  db: IDBDatabase;
  tx: IDBTransaction;
  /** Raw text of the interim `localStorage` preferences, or null. */
  legacyPrefs: string | null;
  /** The instant for records a migration makes; never read from inside a migration. */
  clock: Clock;
  /** Makes the id of a record a migration creates (a user id). */
  newId: () => string;
  /** Name of the place made for existing stock. */
  placeName: string;
}

export interface Migration {
  version: number;
  describe: string;
  up(context: MigrationContext): void;
}

/** Version 1: the stores of the first layout, all empty. */
function createStores({ db }: MigrationContext): void {
  const make = (
    name: string,
    keyPath: string,
    indexes: [string, string | string[], boolean?][] = [],
  ): void => {
    const store = db.createObjectStore(name, { keyPath });
    for (const [index, path, unique] of indexes) {
      store.createIndex(index, path, { unique: unique === true });
    }
  };
  make('specs', 'id', [
    ['lineageId', 'lineageId'],
    ['lineage-version', ['lineageId', 'version'], true],
    ['templateId', 'templateId'],
    ['status', 'status'],
  ]);
  make('ingredients', 'id', [
    ['parentId', 'parentId'],
    ['level', 'level'],
  ]);
  make('templates', 'id', [['parentId', 'parentId']]);
  make('affinities', 'id');
  make('stock', 'ingredientId');
  make('settings', 'key');
  make('meta', 'key');
}

/** Version 2: the shell's interim `localStorage` preferences become settings records. */
function importLegacyPrefs({ tx, legacyPrefs }: MigrationContext): void {
  if (legacyPrefs === null) return;
  const prefs = parsePrefs(legacyPrefs);
  const settings = tx.objectStore('settings');
  settings.put({ key: 'theme', value: prefs.theme });
  settings.put({ key: 'units', value: prefs.units });
}

/** Version 3: editor drafts (docs/store.md). */
function createDrafts({ db }: MigrationContext): void {
  db.createObjectStore('drafts', { keyPath: 'key' });
}

/** The old stock rows as records of one place, all stamped with the migration's instant. */
export function rowsInPlace(rows: readonly object[], placeId: string, at: string): object[] {
  return rows.map((row) => ({ ...row, placeId, updatedAt: at }));
}

/**
 * Version 4: stock per place. IndexedDB cannot change a key path in place, so
 * the rows are read, the store is deleted and made again with the key
 * `[placeId, ingredientId]`, and the rows go back into the default place.
 * Everything happens in the one upgrade transaction: the read completes before
 * the delete, and a failure anywhere aborts the whole upgrade, leaving version 3.
 * A migration after this one must not touch `stock` before this one's read
 * callback has run (later ones queue their work the same way).
 */
function stockPerPlace({ db, tx, clock, newId, placeName }: MigrationContext): void {
  const at = clock();
  const place = { id: newId(), name: placeName, updatedAt: at };
  const read = tx.objectStore('stock').getAll();
  read.onsuccess = () => {
    try {
      const rows = read.result as object[];
      db.deleteObjectStore('stock');
      const places = db.createObjectStore('places', { keyPath: 'id' });
      const stock = db.createObjectStore('stock', { keyPath: ['placeId', 'ingredientId'] });
      stock.createIndex('placeId', 'placeId');
      places.put(place);
      for (const record of rowsInPlace(rows, place.id, at)) stock.put(record);
      tx.objectStore('settings').put({
        key: 'places',
        value: { ticked: [place.id], entry: place.id },
      });
    } catch {
      // A thrown error here would not reach `migrate`: abort so the open fails and version 3 stays.
      tx.abort();
    }
  };
}

/** Version 5: the device-local stores for sync storages and the bindings of synced units. */
function createSyncStores({ db }: MigrationContext): void {
  db.createObjectStore('storages', { keyPath: 'id' });
  const bindings = db.createObjectStore('bindings', { keyPath: ['unitKind', 'unitId'] });
  bindings.createIndex('storageId', 'storageId');
}

export const migrations: readonly Migration[] = [
  { version: 1, describe: 'Create the object stores', up: createStores },
  { version: 2, describe: 'Move the shell preferences into settings', up: importLegacyPrefs },
  { version: 3, describe: 'Add the store for editor drafts', up: createDrafts },
  {
    version: 4,
    describe: 'Keep stock per place and make the default place',
    up: stockPerPlace,
  },
  {
    version: 5,
    describe: 'Add the device-local stores for storages and bindings',
    up: createSyncStores,
  },
];

/** Runs every migration above `oldVersion` up to `newVersion`, in order. */
export function migrate(
  context: MigrationContext,
  oldVersion: number,
  newVersion: number,
  list: readonly Migration[] = migrations,
): void {
  for (const migration of list) {
    if (migration.version > oldVersion && migration.version <= newVersion) migration.up(context);
  }
}
