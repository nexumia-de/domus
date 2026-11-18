// Writes of many records in one transaction: import (add and replace) and its Undo. Everything
// is validated before anything is written, so a record that is not valid leaves the data as it was.
import { nextUpdatedAt } from './clock';
import { failed, run } from './idb';
import { storeLog } from './log';
import { schemaIssues } from './validate';
import { fail, KINDS, type Kind, type Result, type Row, type StoredRecord } from './types';

export interface Entry {
  kind: Kind;
  record: unknown;
}

export interface Bulk {
  /** Validates every entry, then writes them all (newer `updatedAt` each) or none. */
  putMany(entries: readonly Entry[]): Promise<Result<{ count: number }>>;
  /**
   * Makes the live records of every kind exactly `records`: those given are written, live
   * records that are not given get a tombstone (so a later sync knows they were removed).
   * Validated first; one transaction.
   */
  replaceAll(records: Readonly<Record<Kind, readonly unknown[]>>): Promise<Result>;
  /**
   * Undo of an import: each change puts `before` back (a newer `updatedAt`), or, when the
   * record did not exist before, tombstones it. One transaction; the notebook is as it was for
   * these records, whatever happened to others in between.
   */
  revert(changes: readonly Change[]): Promise<Result>;
}

export interface Change {
  kind: Kind;
  id: string;
  before?: StoredRecord;
}

const idOf = (record: unknown): string | undefined => {
  const id = (record as { id?: unknown } | null)?.id;
  return typeof id === 'string' ? id : undefined;
};

const firstProblem = (entries: readonly Entry[]): Result | undefined => {
  for (const { kind, record } of entries) {
    const issues = schemaIssues(kind, record);
    if (issues.length > 0 || idOf(record) === undefined) {
      return fail({ code: 'invalid-record', issues });
    }
  }
  return undefined;
};

export const bulkStore = (db: IDBDatabase, now: () => string): Bulk => ({
  async putMany(entries) {
    const problem = firstProblem(entries);
    if (problem) return problem as Result<{ count: number }>;
    try {
      const kinds = [...new Set(entries.map((e) => e.kind))];
      await run(db, kinds, 'readwrite', (tx, abort) => {
        for (const { kind, record } of entries) {
          const id = idOf(record) as string;
          const store = tx.objectStore(kind);
          const request = store.get(id);
          request.onsuccess = () => {
            try {
              const stored = request.result as Row | undefined;
              store.put({
                key: id,
                updatedAt: nextUpdatedAt(now, stored?.updatedAt),
                value: structuredClone(record) as StoredRecord,
              });
            } catch (error) {
              abort(error);
            }
          };
        }
        return () => undefined;
      });
      storeLog('put-many', { count: entries.length });
      return { ok: true, count: entries.length };
    } catch (error) {
      return failed(error);
    }
  },

  async replaceAll(records) {
    const entries = KINDS.flatMap((kind) => records[kind].map((record) => ({ kind, record })));
    const problem = firstProblem(entries);
    if (problem) return problem;
    try {
      await run(db, [...KINDS], 'readwrite', (tx, abort) => {
        for (const kind of KINDS) {
          const store = tx.objectStore(kind);
          const given = new Map(records[kind].map((r) => [idOf(r) as string, r]));
          const all = store.getAll();
          all.onsuccess = () => {
            try {
              const stored = new Map((all.result as Row[]).map((row) => [row.key, row]));
              for (const [id, record] of given) {
                store.put({
                  key: id,
                  updatedAt: nextUpdatedAt(now, stored.get(id)?.updatedAt),
                  value: structuredClone(record) as StoredRecord,
                });
              }
              for (const row of stored.values()) {
                if (row.deleted || given.has(row.key)) continue;
                store.put({
                  key: row.key,
                  updatedAt: nextUpdatedAt(now, row.updatedAt),
                  deleted: true,
                });
              }
            } catch (error) {
              abort(error);
            }
          };
        }
        return () => undefined;
      });
      storeLog('replace-all', { count: entries.length });
      return { ok: true };
    } catch (error) {
      return failed(error);
    }
  },

  async revert(changes) {
    const problem = firstProblem(
      changes.flatMap((c) => (c.before === undefined ? [] : [{ kind: c.kind, record: c.before }])),
    );
    if (problem) return problem;
    try {
      const kinds = [...new Set(changes.map((c) => c.kind))];
      await run(db, kinds, 'readwrite', (tx, abort) => {
        for (const change of changes) {
          const store = tx.objectStore(change.kind);
          const request = store.get(change.id);
          request.onsuccess = () => {
            try {
              const stored = request.result as Row | undefined;
              if (change.before === undefined && (stored === undefined || stored.deleted)) return;
              const updatedAt = nextUpdatedAt(now, stored?.updatedAt);
              store.put(
                change.before === undefined
                  ? { key: change.id, updatedAt, deleted: true }
                  : { key: change.id, updatedAt, value: structuredClone(change.before) },
              );
            } catch (error) {
              abort(error);
            }
          };
        }
        return () => undefined;
      });
      storeLog('revert', { count: changes.length });
      return { ok: true };
    } catch (error) {
      return failed(error);
    }
  },
});
