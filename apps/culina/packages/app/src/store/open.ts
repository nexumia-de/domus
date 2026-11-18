// openStore: opens the database, refuses a newer schema, migrates an older one.
import { failed, openDb, readVersion, run } from './idb';
import { storeLog } from './log';
import { clearBackup, migrate } from './migrations/run';
import { MIGRATIONS, schemaVersionOf } from './migrations';
import { readOnlyStore, readWriteStore, type ReadStore, type Store } from './repository';
import { fail, type Migration, type StoreError } from './types';

export interface OpenOptions {
  /** The clock: an ISO 8601 UTC instant. Production passes `() => new Date().toISOString()`. */
  now: () => string;
  indexedDB?: IDBFactory;
  /** Test hook: replaces the real migration list. */
  migrations?: readonly Migration[];
}

export type OpenResult =
  | { ok: true; store: Store }
  | {
      ok: false;
      error: StoreError;
      /** After `migration-failed`: the old data, still readable. */
      readOnly?: ReadStore;
    };

export const openStore = async (options: OpenOptions): Promise<OpenResult> => {
  const factory = options.indexedDB ?? globalThis.indexedDB;
  if (!factory) return fail({ code: 'unavailable', reason: 'no IndexedDB' });
  const migrations = options.migrations ?? MIGRATIONS;
  const target = schemaVersionOf(migrations);

  let db: IDBDatabase;
  try {
    db = await openDb(factory);
  } catch (error) {
    return failed(error);
  }

  try {
    const found = await readVersion(db);
    if (found !== undefined && found > target) {
      db.close();
      storeLog('refused', { from: found, to: target });
      return fail({ code: 'newer-schema', found, supported: target });
    }
    if (found === undefined) {
      await run(db, ['meta'], 'readwrite', (tx) => {
        tx.objectStore('meta').put({ key: 'schemaVersion', value: target });
        return () => undefined;
      });
    } else if (found < target) {
      const done = await migrate(db, found, migrations);
      if (!done.ok) return { ok: false, error: done.error, readOnly: readOnlyStore(db) };
    } else {
      await clearBackup(db).catch(() => undefined);
    }
    storeLog('open', { from: found ?? target, to: target });
    return { ok: true, store: readWriteStore(db, options.now, target) };
  } catch (error) {
    db.close();
    return failed(error);
  }
};
