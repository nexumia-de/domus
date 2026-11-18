import { readFileSync } from 'node:fs';
import { IDBFactory } from 'fake-indexeddb';
import { openDb, run } from '../src/store/idb';
import { KINDS, type Rows, type StoredRecord } from '../src/store/types';

export const freshFactory = (): IDBFactory => new IDBFactory();

/** A clock that returns the given instants in turn and then the last one again. */
export const clockOf = (...instants: string[]): (() => string) => {
  let i = 0;
  return () => instants[Math.min(i++, instants.length - 1)] ?? '2026-11-18T08:00:00.000Z';
};

export const ONION: StoredRecord = { id: 'u-aaaa', name: 'Onion', parentId: 'alliums' };
export const STOCK_OF_ONION: StoredRecord = {
  id: 'u-bbbb',
  ref: { kind: 'ingredient', id: 'u-aaaa' },
  amount: { value: 400, unit: 'g' },
  state: 'raw',
};

export interface Fixture {
  schemaVersion: number;
  rows: Partial<Rows>;
}

export const fixture = (name: string): Fixture =>
  JSON.parse(readFileSync(new URL(`fixtures/store/${name}`, import.meta.url), 'utf8')) as Fixture;

/** Writes rows and a version straight into the database, as an older app version left them. */
export const seedRaw = async (
  factory: IDBFactory,
  version: number,
  rows: Partial<Rows>,
): Promise<void> => {
  const db = await openDb(factory);
  await run(db, [...KINDS, 'meta'], 'readwrite', (tx) => {
    tx.objectStore('meta').put({ key: 'schemaVersion', value: version });
    for (const kind of KINDS) for (const row of rows[kind] ?? []) tx.objectStore(kind).put(row);
    return () => undefined;
  });
  db.close();
};

/** Everything in the database, read raw: rows by kind, the version and the backup store. */
export const dumpRaw = async (factory: IDBFactory) => {
  const db = await openDb(factory);
  const read = (name: string): Promise<unknown[]> =>
    new Promise((resolve) => {
      const request = db.transaction(name).objectStore(name).getAll();
      request.onsuccess = () => resolve(request.result as unknown[]);
    });
  const out: Record<string, unknown[]> = {};
  for (const name of [...KINDS, 'meta', 'backup']) out[name] = await read(name);
  db.close();
  return out;
};
