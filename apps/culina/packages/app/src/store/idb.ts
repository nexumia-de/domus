// The thin IndexedDB layer: opening, transactions as promises, error mapping. No data rules.
import { fail, KINDS, type Kind, type Row, type Rows, type StoreError, emptyRows } from './types';

export const DB_NAME = 'culina';
/**
 * IndexedDB's own version only creates object stores. The data schema version lives in `meta`:
 * IndexedDB cannot roll its version back when a data migration fails. Raise it whenever an
 * object store is added; the upgrade creates the missing stores and keeps the rows.
 * 1: the first six kinds, `meta`, `backup`. 2: adds `tastings`.
 */
const LAYOUT_VERSION = 2;
export const ALL_STORES = [...KINDS, 'meta', 'backup'] as const;
export type StoreName = (typeof ALL_STORES)[number];

export const openDb = (factory: IDBFactory): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest;
    try {
      request = factory.open(DB_NAME, LAYOUT_VERSION);
    } catch (error) {
      reject(error);
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of ALL_STORES) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new DOMException('open is blocked', 'InvalidStateError'));
  });

/**
 * Runs `work` in one transaction and resolves with what the returned function gives once the
 * transaction has committed. A throw in `work` or an abort rejects, and nothing is written.
 */
export const run = <T>(
  db: IDBDatabase,
  names: readonly StoreName[],
  mode: IDBTransactionMode,
  work: (tx: IDBTransaction, abort: (reason: unknown) => void) => () => T,
): Promise<T> =>
  new Promise((resolve, reject) => {
    let tx: IDBTransaction | undefined;
    let read: () => T;
    let reason: unknown;
    // For callbacks (request handlers) that throw: abort and report that error.
    const abort = (why: unknown) => {
      reason = why;
      try {
        tx?.abort();
      } catch {
        /* already finished */
      }
    };
    try {
      const open = db.transaction([...names], mode);
      tx = open;
      open.oncomplete = () => resolve(read());
      open.onabort = () =>
        reject(reason ?? open.error ?? new DOMException('aborted', 'AbortError'));
      read = work(open, abort);
    } catch (error) {
      try {
        tx?.abort();
      } catch {
        /* already finished */
      }
      reject(error);
    }
  });

export const mapError = (error: unknown): StoreError => {
  const name = error instanceof Error ? error.name : 'Error';
  return name === 'QuotaExceededError'
    ? { code: 'quota-exceeded' }
    : { code: 'unavailable', reason: name };
};

export const failed = (error: unknown): ReturnType<typeof fail> => fail(mapError(error));

export const readKind = (db: IDBDatabase, kind: Kind): Promise<Row[]> =>
  run(db, [kind], 'readonly', (tx) => {
    const request = tx.objectStore(kind).getAll();
    return () => request.result as Row[];
  });

export const readAllRows = async (db: IDBDatabase): Promise<Rows> => {
  const rows = emptyRows();
  for (const kind of KINDS) rows[kind] = await readKind(db, kind);
  return rows;
};

export const readVersion = (db: IDBDatabase): Promise<number | undefined> =>
  run(db, ['meta'], 'readonly', (tx) => {
    const request = tx.objectStore('meta').get('schemaVersion');
    return () => (request.result as { value?: number } | undefined)?.value;
  });
