// Ordered schema migrations. Each runs inside the versionchange
// transaction, gets everything it needs as arguments (no globals), and has
// a test that opens a database of the previous version. A migration is
// never edited after release: a new change is a new migration.
//
// The layouts below are snapshots, not references to schema.ts, which only
// ever describes the newest version.

import { parsePrefs } from '../prefs';

export interface MigrationContext {
  db: IDBDatabase;
  tx: IDBTransaction;
  /** Raw text of the interim `localStorage` preferences, or null. */
  legacyPrefs: string | null;
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

export const migrations: readonly Migration[] = [
  { version: 1, describe: 'Create the object stores', up: createStores },
  { version: 2, describe: 'Move the shell preferences into settings', up: importLegacyPrefs },
  { version: 3, describe: 'Add the store for editor drafts', up: createDrafts },
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
