// Opens the database and wraps IndexedDB's request objects in promises.
// Everything that can go wrong comes out as a StoreError.

import { StoreError, toStoreError } from './errors';
import { migrate, type Migration, migrations } from './migrations';
import { DB_NAME, SCHEMA_VERSION } from './schema';

export interface OpenOptions {
  factory?: IDBFactory | undefined;
  name?: string;
  version?: number;
  migrations?: readonly Migration[];
  /** Raw interim preferences for migration 2; read inside the upgrade. */
  legacyPrefs?: () => string | null;
  /**
   * Called after another tab upgraded or deleted the database and this
   * connection was closed so it could proceed: the store is unusable from
   * then on, and the app asks for a reload.
   */
  onVersionChange?: () => void;
}

export function request<T>(source: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    source.onsuccess = () => resolve(source.result);
    source.onerror = () => reject(toStoreError(source.error));
  });
}

/** Resolves when the transaction committed; a quota error or abort rejects. */
export function committed(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(toStoreError(tx.error));
    tx.onabort = () => reject(toStoreError(tx.error ?? new Error('The transaction was aborted')));
  });
}

async function storedVersion(factory: IDBFactory, name: string): Promise<number | null> {
  try {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const open = factory.open(name);
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    const { version } = db;
    db.close();
    return version;
  } catch {
    return null;
  }
}

export async function openDatabase(options: OpenOptions = {}): Promise<IDBDatabase> {
  const factory = 'factory' in options ? options.factory : globalThis.indexedDB;
  if (!factory) {
    throw new StoreError('unavailable', 'This browser has no local database');
  }
  const name = options.name ?? DB_NAME;
  const version = options.version ?? SCHEMA_VERSION;
  const list = options.migrations ?? migrations;

  return new Promise<IDBDatabase>((resolve, reject) => {
    let settled = false;
    const fail = (error: StoreError): void => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    let opening: IDBOpenDBRequest;
    try {
      opening = factory.open(name, version);
    } catch (error) {
      fail(toStoreError(error));
      return;
    }
    let upgradeError: StoreError | null = null;
    opening.onupgradeneeded = (event) => {
      const tx = opening.transaction;
      if (!tx) return;
      try {
        const legacyPrefs = options.legacyPrefs?.() ?? null;
        migrate({ db: opening.result, tx, legacyPrefs }, event.oldVersion, version, list);
      } catch (error) {
        upgradeError = new StoreError('migration', toStoreError(error).message);
        tx.abort();
      }
    };
    opening.onblocked = () =>
      fail(new StoreError('blocked', 'Another window still uses an older version'));
    opening.onerror = () => {
      const error = upgradeError ?? toStoreError(opening.error);
      if (error.kind === 'too-new') {
        void storedVersion(factory, name).then((found) =>
          fail(
            new StoreError(
              'too-new',
              `The data is version ${found ?? 'newer'}; this app reads up to ${version}`,
            ),
          ),
        );
      } else fail(error);
      // The failed open is not retried; the browser may still deliver it later.
      opening.onerror = null;
    };
    opening.onsuccess = () => {
      const db = opening.result;
      // A newer tab may upgrade: let it, and stop using this connection.
      db.onversionchange = () => {
        db.close();
        options.onVersionChange?.();
      };
      if (settled) db.close();
      else {
        settled = true;
        resolve(db);
      }
    };
  });
}
