// A repository: get, list, put and delete for one object store. Writes
// validate first and report to `afterWrite`, which asks for persistent
// storage after the first one. Reads and writes never touch seed data.

import { committed, request } from './db';
import { StoreError, toStoreError } from './errors';
import { isUserId } from './ids';
import type { EntityKind } from './types';
import { validateEntity } from './validate';

export interface RepoContext {
  db: IDBDatabase;
  /** Called after a committed entity write. */
  afterWrite: () => void;
}

export interface Repo<T, K extends IDBValidKey = string> {
  get(key: K): Promise<T | undefined>;
  list(): Promise<T[]>;
  /** All records whose index key equals `key`, in index order. */
  listBy(index: string, key: IDBValidKey): Promise<T[]>;
  put(value: T): Promise<void>;
  delete(key: K): Promise<void>;
}

export interface RepoOptions<T> {
  store: string;
  kind: EntityKind;
  /** Fields of a record that must be user ids; stock checks only `placeId` (its ingredient may be a seed id). */
  userIdFields?: (keyof T & string)[];
}

async function run<R>(
  db: IDBDatabase,
  store: string,
  mode: IDBTransactionMode,
  work: (s: IDBObjectStore) => IDBRequest<R>,
): Promise<R> {
  try {
    const tx = db.transaction(store, mode);
    const done = mode === 'readwrite' ? committed(tx) : Promise.resolve();
    // A failing request rejects below; the commit promise must not go unhandled.
    done.catch(() => undefined);
    const result = await request(work(tx.objectStore(store)));
    await done;
    return result;
  } catch (error) {
    throw toStoreError(error);
  }
}

export function createRepo<T extends object, K extends IDBValidKey = string>(
  context: RepoContext,
  options: RepoOptions<T>,
): Repo<T, K> {
  const { db } = context;
  const { store, kind, userIdFields = [] } = options;
  return {
    get: (key) => run(db, store, 'readonly', (s) => s.get(key)) as Promise<T | undefined>,
    list: () => run(db, store, 'readonly', (s) => s.getAll()) as Promise<T[]>,
    listBy: (index, key) =>
      run(db, store, 'readonly', (s) => s.index(index).getAll(key)) as Promise<T[]>,
    async put(value) {
      validateEntity(kind, value);
      for (const field of userIdFields) {
        const id = (value as Record<string, unknown>)[field];
        if (typeof id !== 'string' || !isUserId(id)) {
          throw new StoreError('invalid', `${field} of a ${kind} must be a user id (u-<uuid>)`, [
            `/${field} is not a user id`,
          ]);
        }
      }
      await run(db, store, 'readwrite', (s) => s.put(value));
      context.afterWrite();
    },
    async delete(key) {
      await run(db, store, 'readwrite', (s) => s.delete(key));
      context.afterWrite();
    },
  };
}
