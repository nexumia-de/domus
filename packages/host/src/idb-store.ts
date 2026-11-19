// The Store on IndexedDB: one database `domus` on the address, shared by all
// apps (their own data lives in databases of their own). Every operation is
// one transaction; there is no fallback to memory when the database cannot
// be opened. See docs/spaces.md.
import { copyState, emptyState, type CollectionState, type Store, type StoredSpace } from './store';

/** The shared database's name. */
export const DB_NAME = 'domus';
export const DB_VERSION = 1;

/** The database could not be opened (private mode, quota, a broken profile). */
export class StoreOpenError extends Error {
  constructor(cause?: unknown) {
    super('The local database could not be opened');
    this.name = 'StoreOpenError';
    this.cause = cause;
  }
}

/** Another tab holds an older version of the database open and does not let go. */
export class StoreBlocked extends Error {
  constructor() {
    super('The local database is blocked by another open tab');
    this.name = 'StoreBlocked';
  }
}

export interface IdbStoreOptions {
  /** The factory; defaults to `indexedDB`. Tests pass `fake-indexeddb`. */
  factory?: IDBFactory;
  /** Database name; defaults to `domus`. Tests only. */
  name?: string;
}

interface CollectionRow extends CollectionState {
  space: string;
  name: string;
}

const request = <T>(r: IDBRequest<T>, onDone: (value: T) => void): void => {
  r.onsuccess = () => onDone(r.result);
};

/**
 * A Store on IndexedDB. The database opens on first use and again after a
 * newer version elsewhere closed it.
 */
export function createIdbStore(options: IdbStoreOptions = {}): Store & { close(): void } {
  const factory = options.factory ?? indexedDB;
  const name = options.name ?? DB_NAME;
  let opening: Promise<IDBDatabase> | undefined;

  const open = (): Promise<IDBDatabase> => {
    opening ??= new Promise<IDBDatabase>((resolve, reject) => {
      let req: IDBOpenDBRequest;
      try {
        req = factory.open(name, DB_VERSION);
      } catch (e) {
        reject(new StoreOpenError(e));
        return;
      }
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('spaces'))
          db.createObjectStore('spaces', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('collections')) {
          db.createObjectStore('collections', { keyPath: ['space', 'name'] });
        }
      };
      req.onblocked = () => reject(new StoreBlocked());
      req.onerror = () => reject(new StoreOpenError(req.error));
      req.onsuccess = () => {
        const db = req.result;
        // A newer version elsewhere must not wait for us: let go, reopen on next use.
        db.onversionchange = () => {
          db.close();
          opening = undefined;
        };
        resolve(db);
      };
    });
    // A failed open is not cached: the next call tries again.
    opening.catch(() => (opening = undefined));
    return opening;
  };

  /** Runs `body` in one transaction; resolves with its value when the transaction completes. */
  const run = async <T>(
    stores: string[],
    mode: IDBTransactionMode,
    body: (tx: IDBTransaction, done: (value: T) => void, fail: (e: unknown) => void) => void,
  ): Promise<T> => {
    const db = await open();
    return new Promise<T>((resolve, reject) => {
      let value: T;
      let failure: unknown;
      const tx = db.transaction(stores, mode);
      tx.oncomplete = () => resolve(value);
      tx.onabort = () => reject(failure ?? tx.error ?? new Error('Transaction aborted'));
      // A throw inside a request callback aborts the transaction (nothing is
      // written) and reaches the caller as it was thrown.
      const fail = (e: unknown): void => {
        failure = e;
        try {
          tx.abort();
        } catch {
          /* already finished */
        }
      };
      try {
        body(tx, (v) => (value = v), fail);
      } catch (e) {
        fail(e);
      }
    });
  };

  const strip = (row: CollectionRow | undefined): CollectionState => {
    if (!row) return emptyState();
    const state: CollectionState = { records: row.records };
    if (row.syncedAt !== undefined) state.syncedAt = row.syncedAt;
    if (row.etag !== undefined) state.etag = row.etag;
    return state;
  };
  const row = (space: string, n: string, s: CollectionState): CollectionRow => ({
    ...copyState(s),
    space,
    name: n,
  });

  return {
    listSpaces: () =>
      run<StoredSpace[]>(['spaces'], 'readonly', (tx, done) =>
        request(tx.objectStore('spaces').getAll(), done),
      ),
    getSpace: (id) =>
      run<StoredSpace | undefined>(['spaces'], 'readonly', (tx, done) =>
        request(tx.objectStore('spaces').get(id), done),
      ),
    putSpace: (space) =>
      run<undefined>(['spaces'], 'readwrite', (tx) => {
        tx.objectStore('spaces').put(structuredClone(space));
      }),
    removeSpace: (id) =>
      run<undefined>(['spaces', 'collections'], 'readwrite', (tx) => {
        tx.objectStore('spaces').delete(id);
        const collections = tx.objectStore('collections');
        const cursor = collections.openKeyCursor();
        cursor.onsuccess = () => {
          const c = cursor.result;
          if (!c) return;
          if ((c.key as [string, string])[0] === id) collections.delete(c.primaryKey);
          c.continue();
        };
      }),
    readCollection: (space, n) =>
      run<CollectionState>(['collections'], 'readonly', (tx, done) =>
        request(tx.objectStore('collections').get([space, n]), (r) =>
          done(strip(r as CollectionRow | undefined)),
        ),
      ),
    writeCollection: (space, n, state) =>
      run<undefined>(['collections'], 'readwrite', (tx) => {
        tx.objectStore('collections').put(row(space, n, state));
      }),
    changeRecords: (space, n, fn) =>
      run<CollectionState>(['collections'], 'readwrite', (tx, done, fail) => {
        const store = tx.objectStore('collections');
        request(store.get([space, n]), (r) => {
          try {
            const next = fn(strip(r as CollectionRow | undefined));
            store.put(row(space, n, next));
            done(copyState(next));
          } catch (e) {
            fail(e);
          }
        });
      }),
    close: () => {
      void opening?.then(
        (db) => db.close(),
        () => undefined,
      );
      opening = undefined;
    },
  };
}
