// The repository: get, list, put, remove, listRows per kind, over one open database.
import { nextUpdatedAt } from './clock';
import { bulkStore, type Bulk } from './bulk';
import { draftStore, type Drafts } from './drafts';
import { ALL_STORES, failed, readKind, run } from './idb';
import { storeLog, toId } from './log';
import { schemaIssues } from './validate';
import { fail, type Kind, type Result, type Row, type StoredRecord } from './types';

export interface ReadStore {
  /** The live record, or `not-found` (a removed record is not found). */
  get(kind: Kind, id: string): Promise<Result<{ record: StoredRecord }>>;
  /** Live records, sorted by id. Tombstones are left out. */
  list(kind: Kind): Promise<Result<{ records: StoredRecord[] }>>;
  /** Every row including tombstones, sorted by key (for sync and export later). */
  listRows(kind: Kind): Promise<Result<{ rows: Row[] }>>;
  close(): void;
}

export interface Store extends ReadStore {
  /** Validates against the kind's schema, then writes the row with a newer `updatedAt`. */
  put(kind: Kind, record: unknown): Promise<Result<{ row: Row }>>;
  /** Writes a tombstone; the row is never deleted. */
  remove(kind: Kind, id: string): Promise<Result<{ row: Row }>>;
  /**
   * Deletes every row of a kind, tombstones included. Only for `stock`, once its items moved into
   * the shared collection of a space (src/shared-stock/legacy.ts).
   */
  clearKind(kind: 'stock'): Promise<Result>;
  /**
   * "Erase everything on this device": deletes every row of every kind, tombstones included, every
   * draft and the migration backup, in one transaction; `meta` (the schema version) stays, so the
   * database is as a first start leaves it. No tombstone is written: nothing of the notebook is
   * synced (docs/behaviour.md, Erase everything on this device).
   */
  eraseAll(): Promise<Result>;
  readonly schemaVersion: number;
  /** Unfinished forms: their own object store, not validated, not exported or synced. */
  readonly drafts: Drafts;
  /** Many records in one transaction: import and its Undo. */
  readonly bulk: Bulk;
}

const byKey = (a: Row, b: Row): number => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);

export const readOnlyStore = (db: IDBDatabase): ReadStore => ({
  async get(kind, id) {
    try {
      const rows = await run(db, [kind], 'readonly', (tx) => {
        const request = tx.objectStore(kind).get(id);
        return () => request.result as Row | undefined;
      });
      return rows?.value && !rows.deleted
        ? { ok: true, record: rows.value }
        : fail({ code: 'not-found' });
    } catch (error) {
      return failed(error);
    }
  },
  async list(kind) {
    try {
      const rows = (await readKind(db, kind)).sort(byKey);
      const records = rows.flatMap((row) => (row.value && !row.deleted ? [row.value] : []));
      return { ok: true, records };
    } catch (error) {
      return failed(error);
    }
  },
  async listRows(kind) {
    try {
      return { ok: true, rows: (await readKind(db, kind)).sort(byKey) };
    } catch (error) {
      return failed(error);
    }
  },
  close: () => db.close(),
});

/** Reads the stored row and writes the next one in one readwrite transaction. */
const write = (
  db: IDBDatabase,
  kind: Kind,
  id: string,
  now: () => string,
  make: (updatedAt: string) => Row,
): Promise<Row | undefined> =>
  run(db, [kind], 'readwrite', (tx, abort) => {
    const store = tx.objectStore(kind);
    const request = store.get(id);
    let written: Row | undefined;
    request.onsuccess = () => {
      try {
        const stored = request.result as Row | undefined;
        written = make(nextUpdatedAt(now, stored?.updatedAt));
        store.put(written);
      } catch (error) {
        abort(error);
      }
    };
    return () => written;
  });

export const readWriteStore = (
  db: IDBDatabase,
  now: () => string,
  schemaVersion: number,
): Store => ({
  ...readOnlyStore(db),
  schemaVersion,
  drafts: draftStore(db, now),
  bulk: bulkStore(db, now),
  async put(kind, record) {
    const id = (record as { id?: unknown } | null)?.id;
    const issues = schemaIssues(kind, record);
    if (issues.length > 0 || typeof id !== 'string') {
      return fail({ code: 'invalid-record', issues });
    }
    try {
      const row = await write(db, kind, id, now, (updatedAt) => ({
        key: id,
        updatedAt,
        value: structuredClone(record) as StoredRecord,
      }));
      storeLog('put', { kind, count: 1, ids: [toId(id)] });
      return row ? { ok: true, row } : fail({ code: 'unavailable' });
    } catch (error) {
      return failed(error);
    }
  },
  async clearKind(kind) {
    try {
      await run(db, [kind], 'readwrite', (tx) => {
        tx.objectStore(kind).clear();
        return () => undefined;
      });
      storeLog('clear', { kind });
      return { ok: true };
    } catch (error) {
      return failed(error);
    }
  },
  async eraseAll() {
    const names = ALL_STORES.filter((name) => name !== 'meta');
    try {
      await run(db, names, 'readwrite', (tx) => {
        for (const name of names) tx.objectStore(name).clear();
        return () => undefined;
      });
      storeLog('erase', { count: names.length });
      return { ok: true };
    } catch (error) {
      return failed(error);
    }
  },
  async remove(kind, id) {
    try {
      const existing = await readOnlyStore(db).get(kind, id);
      if (!existing.ok) return existing;
      const row = await write(db, kind, id, now, (updatedAt) => ({
        key: id,
        updatedAt,
        deleted: true,
      }));
      storeLog('remove', { kind, count: 1, ids: [toId(id)] });
      return row ? { ok: true, row } : fail({ code: 'unavailable' });
    } catch (error) {
      return failed(error);
    }
  },
});
