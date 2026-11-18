// Reading and writing the six user stores as one unit, inside one
// IndexedDB transaction each. The import backup (the data as it was before
// an import) lives in `meta` and is written in the same transaction as the
// import, so there is never an import without its undo.

import { committed, request } from '../db';
import { toStoreError } from '../errors';
import { KINDS, type Kind, type Snapshot } from './format';
import type { Plan } from './merge';

export const IMPORT_BACKUP_KEY = 'importBackup';

export interface ImportBackup {
  takenAt: string;
  snapshot: Snapshot;
}

const STORE_OF: Record<Kind, string> = {
  ingredients: 'ingredients',
  templates: 'templates',
  specs: 'specs',
  places: 'places',
  stock: 'stock',
  affinities: 'affinities',
};

/** The key of a record in its object store; stock has the compound key place, ingredient. */
const keyOf = (kind: Kind, record: object): IDBValidKey =>
  kind === 'stock'
    ? [(record as { placeId: string }).placeId, (record as { ingredientId: string }).ingredientId]
    : (record as { id: string }).id;

async function readAll(tx: IDBTransaction): Promise<Snapshot> {
  const out = {} as Record<Kind, object[]>;
  for (const kind of KINDS)
    out[kind] = (await request(tx.objectStore(STORE_OF[kind]).getAll())) as object[];
  return out as unknown as Snapshot;
}

export async function readSnapshot(db: IDBDatabase): Promise<Snapshot> {
  try {
    return await readAll(db.transaction(KINDS.map((k) => STORE_OF[k])));
  } catch (error) {
    throw toStoreError(error);
  }
}

export async function readImportBackup(db: IDBDatabase): Promise<ImportBackup | undefined> {
  try {
    const record = (await request(
      db.transaction('meta').objectStore('meta').get(IMPORT_BACKUP_KEY),
    )) as { value: ImportBackup } | undefined;
    return record?.value;
  } catch (error) {
    throw toStoreError(error);
  }
}

export interface Applied {
  /** What the plan did, recomputed against the data inside the transaction. */
  plan: Plan;
  /** The data as it was before. */
  before: Snapshot;
}

/**
 * Runs `plan(before)` and writes its result in one transaction over the user
 * stores and `meta`. Any failure (quota, a broken record) aborts the whole
 * transaction: the database is left as it was. `backup` stores `before` as
 * the import backup; `null` removes the stored backup (used by undo).
 */
export async function applyInTransaction(
  db: IDBDatabase,
  makePlan: (before: Snapshot) => Plan,
  backup: { takenAt: string } | null,
): Promise<Applied> {
  const names = [...KINDS.map((k) => STORE_OF[k]), 'meta'];
  let tx: IDBTransaction | undefined;
  try {
    tx = db.transaction(names, 'readwrite');
    const done = committed(tx);
    done.catch(() => undefined);
    const before = await readAll(tx);
    const plan = makePlan(before);
    for (const kind of KINDS) {
      const store = tx.objectStore(STORE_OF[kind]);
      for (const record of plan.deletes[kind] as object[]) store.delete(keyOf(kind, record));
      for (const record of plan.writes[kind] as object[]) store.put(record);
    }
    const meta = tx.objectStore('meta');
    if (backup)
      meta.put({ key: IMPORT_BACKUP_KEY, value: { takenAt: backup.takenAt, snapshot: before } });
    else meta.delete(IMPORT_BACKUP_KEY);
    await done;
    return { plan, before };
  } catch (error) {
    try {
      tx?.abort();
    } catch {
      // Already finished or aborted.
    }
    throw toStoreError(error);
  }
}

export async function deleteImportBackup(db: IDBDatabase): Promise<void> {
  try {
    const tx = db.transaction('meta', 'readwrite');
    const done = committed(tx);
    done.catch(() => undefined);
    tx.objectStore('meta').delete(IMPORT_BACKUP_KEY);
    await done;
  } catch (error) {
    throw toStoreError(error);
  }
}
