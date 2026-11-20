// Shared by the store tests: a fresh in-memory IndexedDB per test and the
// example records of the data model (user entities from the export example,
// seed entities from the tiny fixture).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { IDBFactory } from 'fake-indexeddb';
import { openLocalStore, parseSeed, type LocalStore, type StoreOptions } from '../src/store';
import type { Affinity, Ingredient, Spec, Template } from '../src/store';
import { createMemoryStore, type Store as SharedStore } from '@nexumia-de/hospes';
import type { AppData } from '../src/data';

const read = (url: string): unknown =>
  JSON.parse(readFileSync(fileURLToPath(new URL(url, import.meta.url)), 'utf8'));

export const seed = parseSeed(read('./fixtures/seed-fixture.json'));

const example = read('../../engine/schemas/examples/valid/export-full.json') as {
  ingredients: Ingredient[];
  templates: Template[];
  specs: Spec[];
  affinities: Affinity[];
};
export const user = example;
export const freshFactory = (): IDBFactory => new IDBFactory();

export const openFresh = (options: StoreOptions = {}): Promise<LocalStore> =>
  openLocalStore({ factory: freshFactory(), storage: undefined, ...options });

/** The database the apps share, in memory, as the stock code sees it. */
export const sharedStore = (): SharedStore => createMemoryStore();

/** What the stock state needs of the app's data: the local store, the shared one and a sync that does nothing. */
export const stockData = (local: LocalStore | null, shared: SharedStore): AppData =>
  ({
    local: () => local,
    shared,
    sync: {
      refresh: () => Promise.resolve(),
      changed: () => undefined,
      syncNow: () => undefined,
      status: () => undefined,
      stop: () => undefined,
    },
  }) as unknown as AppData;

/** Puts a space on the device; without a storage it is on this device only. */
export async function putSpace(
  shared: SharedStore,
  id: string,
  name: string,
  storage = { type: 'device', address: '' },
): Promise<string> {
  await shared.putSpace({ id, secret: `secret-${id}`, name, storage });
  return id;
}

/** The record of an ingredient in the `stock` collection of a space, as stored. */
export async function storedStock(shared: SharedStore, spaceId: string, ingredientId: string) {
  const { records } = await shared.readCollection(spaceId, 'stock');
  return records.find((r) => r.key === ingredientId);
}

/** Puts stock records into a space's collection as another device or app would have. */
export async function seedStock(
  shared: SharedStore,
  spaceId: string,
  records: { key: string; updatedAt?: string; value?: unknown; deleted?: true }[],
): Promise<void> {
  await shared.changeRecords(spaceId, 'stock', (current) => ({
    ...current,
    records: [
      ...current.records,
      ...records.map((r) => ({ updatedAt: '2026-11-01T00:00:00.000Z', ...r })),
    ],
  }));
}
