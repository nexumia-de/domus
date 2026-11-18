// The migration runner. Order: back up, migrate in memory (pure), validate, then write rows
// and the new version in ONE transaction. Any failure leaves the old rows and version alone.
import { ALL_STORES, readAllRows, run, type StoreName } from '../idb';
import { storeLog, toId } from '../log';
import { schemaIssues } from '../validate';
import { fail, KINDS, type Migration, type Result, type Rows } from '../types';

const clip = (text: string): string => text.replace(/\s+/g, ' ').slice(0, 120);

/** Reason of a thrown error: name and message of OUR migration code, never record data. */
const reasonOf = (error: unknown): string =>
  error instanceof Error ? clip(`${error.name}: ${error.message}`) : 'not an Error';

const stepFail = (step: string, reason: string) => fail({ code: 'migration-failed', step, reason });

const isRows = (value: unknown): value is Rows =>
  typeof value === 'object' &&
  value !== null &&
  KINDS.every((kind) => Array.isArray((value as Record<string, unknown>)[kind]));

/** Every migrated record is valid against its schema and stored under its own id. */
const firstProblem = (rows: Rows): string | undefined => {
  for (const kind of KINDS) {
    for (const row of rows[kind]) {
      if (row.deleted) continue;
      const issues = schemaIssues(kind, row.value);
      if (issues.length > 0) {
        return `${kind}/${toId(row.key)} at ${issues.map((i) => i.path).join(', ')}`;
      }
      if (row.value?.id !== row.key) return `${kind}/${toId(row.key)} key differs from id`;
    }
  }
  return undefined;
};

export const clearBackup = (db: IDBDatabase): Promise<void> =>
  run(db, ['backup'], 'readwrite', (tx) => {
    tx.objectStore('backup').clear();
    return () => undefined;
  });

export const migrate = async (
  db: IDBDatabase,
  from: number,
  migrations: readonly Migration[],
): Promise<Result> => {
  const target = 1 + migrations.length;
  const ordered = migrations.every((m, i) => m.from === i + 1 && m.to === i + 2);
  if (!ordered) return stepFail('plan', 'migrations are not contiguous from 1');
  const todo = migrations.filter((m) => m.from >= from);
  storeLog('migrate-start', { from, to: target });
  try {
    const old = await readAllRows(db);
    const count = KINDS.reduce((sum, kind) => sum + old[kind].length, 0);
    await run(db, ['backup'], 'readwrite', (tx) => {
      const store = tx.objectStore('backup');
      store.clear();
      store.put({ key: 'backup', version: from, rows: old });
      return () => undefined;
    });

    let rows: Rows = structuredClone(old);
    for (const m of todo) {
      const step = `${m.from}->${m.to}`;
      try {
        const next: unknown = m.migrate(rows);
        if (!isRows(next)) return await abandon(db, step, 'result is not a set of rows');
        rows = next;
      } catch (error) {
        return await abandon(db, step, reasonOf(error));
      }
      storeLog('migrate-step', { from: m.from, to: m.to });
    }
    const problem = firstProblem(rows);
    if (problem)
      return await abandon(db, `${from}->${target}`, `invalid after migration: ${problem}`);

    const names: StoreName[] = [...ALL_STORES];
    await run(db, names, 'readwrite', (tx) => {
      for (const kind of KINDS) {
        const store = tx.objectStore(kind);
        store.clear();
        for (const row of rows[kind]) store.put(row);
      }
      tx.objectStore('meta').put({ key: 'schemaVersion', value: target });
      tx.objectStore('backup').clear();
      return () => undefined;
    });
    storeLog('migrate-done', { from, to: target, count });
    return { ok: true };
  } catch (error) {
    return await abandon(db, `${from}->${target}`, reasonOf(error));
  }
};

/** The old rows and version stay; the backup is cleared (best effort) and the step reported. */
const abandon = async (db: IDBDatabase, step: string, reason: string) => {
  storeLog('migrate-failed', {});
  try {
    await clearBackup(db);
  } catch {
    /* a leftover backup is cleared by the next open */
  }
  return stepFail(step, reason);
};
