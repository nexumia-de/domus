// Shared by the store tests: a fresh in-memory IndexedDB per test and the
// example records of the data model (user entities from the export example,
// seed entities from the tiny fixture).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { IDBFactory } from 'fake-indexeddb';
import { openLocalStore, parseSeed, type LocalStore, type StoreOptions } from '../src/store';
import type { Affinity, Ingredient, Place, Spec, Stock, StockRecord, Template } from '../src/store';

const read = (url: string): unknown =>
  JSON.parse(readFileSync(fileURLToPath(new URL(url, import.meta.url)), 'utf8'));

export const seed = parseSeed(read('./fixtures/seed-fixture.json'));

const example = read('../../engine/schemas/examples/valid/export-full.json') as {
  ingredients: Ingredient[];
  templates: Template[];
  specs: Spec[];
  places: Place[];
  stock: StockRecord[];
  affinities: Affinity[];
};
export const user = example;
/** The live stock records of the example (the file also holds a tombstone). */
export const userStock = example.stock.filter((r): r is Stock => !('deleted' in r));

export const freshFactory = (): IDBFactory => new IDBFactory();

export const openFresh = (options: StoreOptions = {}): Promise<LocalStore> =>
  openLocalStore({ factory: freshFactory(), storage: undefined, ...options });
