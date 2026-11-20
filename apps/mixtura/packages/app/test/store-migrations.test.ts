/* eslint-disable @typescript-eslint/no-non-null-assertion -- fixtures are indexed at known positions */
import { expect, test } from 'vitest';
import { openDatabase } from '../src/store/db';
import { migrations, rowsInPlace, type Migration } from '../src/store/migrations';
import { SCHEMA_VERSION } from '../src/store/schema';
import { openLocalStore, StoreError } from '../src/store';
import { freshFactory, user } from './helpers';

const v1 = migrations.filter((m) => m.version === 1);

/** Opens a database as the previous release did: only the first migration. */
const openOld = (factory: IDBFactory) => openDatabase({ factory, version: 1, migrations: v1 });

/** Stock rows as versions 1 to 3 stored them: keyed by ingredient, no place. */
const oldRows = [
  { ingredientId: 'gin', present: true, openedOn: '2026-11-01', note: 'back bar' },
  { ingredientId: 'lime-juice', present: false },
  {
    ingredientId: user.ingredients[0]!.id,
    present: true,
    openedOn: '2026-11-10',
    moreBatches: ['2026-11-01', '2026-10-20'],
    bestBefore: '2026-12-01',
  },
];
const AT = '2026-11-18T08:00:00Z';
const PLACE_ID = 'u-00000000-0000-4000-8000-000000000001';
const options = { clock: () => AT, newId: () => PLACE_ID };

/** Opens a database as release 3 did: migrations 1 to 3, and puts the rows into its stock store. */
async function openV3(factory: IDBFactory, rows: readonly object[] = oldRows): Promise<void> {
  const old = await openDatabase({
    factory,
    version: 3,
    migrations: migrations.filter((m) => m.version <= 3),
  });
  expect(old.version).toBe(3);
  expect(old.transaction('stock').objectStore('stock').keyPath).toBe('ingredientId');
  const tx = old.transaction('stock', 'readwrite');
  for (const row of rows) tx.objectStore('stock').put(row);
  await new Promise((done) => (tx.oncomplete = done));
  old.close();
}

/** Opens the database as release 5 did (stock per place, the sync stores), from whatever is there. */
const openV5 = (factory: IDBFactory) =>
  openDatabase({
    factory,
    version: 5,
    migrations: migrations.filter((m) => m.version <= 5),
    ...options,
  });
const getAll = <T>(db: IDBDatabase, store: string): Promise<T[]> =>
  new Promise((resolve) => {
    const req = db.transaction(store).objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
  });

test("opening a version 1 database upgrades it to the current one without losing the user's own data", async () => {
  const factory = freshFactory();
  const old = await openOld(factory);
  expect(old.version).toBe(1);
  const tx = old.transaction(['specs', 'ingredients', 'stock'], 'readwrite');
  tx.objectStore('specs').put(user.specs[1]);
  tx.objectStore('ingredients').put(user.ingredients[0]);
  tx.objectStore('stock').put(oldRows[0]);
  await new Promise((done) => (tx.oncomplete = done));
  old.close();

  const store = await openLocalStore({ factory, storage: undefined, ...options });
  expect(await store.specs.get(user.specs[1]!.id)).toEqual(user.specs[1]);
  expect(await store.ingredients.list()).toEqual([user.ingredients[0]]);
  // No old preferences: nothing is invented, defaults apply.
  expect((await store.settings.load()).theme).toBe('system');
  store.close();
});

test('migration 4: every stock row of a version 3 database lands in the default place', async () => {
  const factory = freshFactory();
  await openV3(factory);
  const db = await openV5(factory);
  expect(await getAll(db, 'places')).toEqual([{ id: PLACE_ID, name: 'Home', updatedAt: AT }]);
  const stock = await getAll<object>(db, 'stock');
  expect(stock).toHaveLength(oldRows.length);
  // Every field of every row survives (the batches included), plus the place and the instant.
  for (const row of oldRows)
    expect(stock).toContainEqual({ ...row, placeId: PLACE_ID, updatedAt: AT });
  db.close();
});

test('migration 4 that fails leaves the version 3 database and its stock as they were', async () => {
  const factory = freshFactory();
  await openV3(factory);
  const error = await openLocalStore({
    factory,
    storage: undefined,
    ...options,
    clock: () => {
      throw new Error('no clock');
    },
  }).catch((e: unknown) => e);
  expect(error).toMatchObject({ kind: 'migration' });
  const db = await openDatabase({
    factory,
    version: 3,
    migrations: migrations.filter((m) => m.version <= 3),
  });
  expect(await getAll(db, 'stock')).toHaveLength(oldRows.length);
  expect([...db.objectStoreNames]).not.toContain('places');
  db.close();
});

test('rowsInPlace stamps rows and cannot be fooled by a row that carries a place', () => {
  expect(rowsInPlace([{ ingredientId: 'gin', present: true, placeId: 'other' }], 'p', AT)).toEqual([
    { ingredientId: 'gin', present: true, placeId: 'p', updatedAt: AT },
  ]);
});

const GONE = ['places', 'stock', 'storages', 'bindings'];

test('migration 6: places, stock, storages and bindings leave the database; the rest stays', async () => {
  const factory = freshFactory();
  await openV3(factory);
  const old = await openV5(factory);
  for (const name of GONE) expect([...old.objectStoreNames]).toContain(name);
  const tx = old.transaction(['settings', 'specs', 'drafts', 'storages'], 'readwrite');
  tx.objectStore('settings').put({ key: 'theme', value: 'dark' });
  tx.objectStore('specs').put(user.specs[1]);
  tx.objectStore('drafts').put({ key: 'draft/x', value: { a: 1 } });
  tx.objectStore('storages').put({ id: 's1', label: 'x', type: 'webdav', baseUrl: 'https://x' });
  await new Promise((done) => (tx.oncomplete = done));
  old.close();

  const store = await openLocalStore({ factory, storage: undefined, ...options });
  expect((await store.settings.load()).theme).toBe('dark');
  expect(await store.specs.list()).toEqual([user.specs[1]]);
  expect(await store.drafts.get('draft/x')).toBeDefined();
  // The choice of spaces starts empty; it is made from the spaces of the device (stock/spaces-rules.ts).
  expect((await store.settings.load()).spaces).toEqual({ ticked: [], entry: '', known: [] });
  store.close();
  const db = await openDatabase({ factory });
  expect(db.version).toBe(SCHEMA_VERSION);
  for (const name of GONE) expect([...db.objectStoreNames]).not.toContain(name);
  expect(await getAll(db, 'settings')).not.toContainEqual(
    expect.objectContaining({ key: 'places' }),
  );
  db.close();
});

test('a fresh install runs the whole chain and ends without the stores for stock and sync', async () => {
  const db = await openDatabase({ factory: freshFactory() });
  for (const name of GONE) expect([...db.objectStoreNames]).not.toContain(name);
  expect(await getAll(db, 'settings')).toEqual([]);
  db.close();
});

test('migration 2 moves the interim preferences into settings, once', async () => {
  const factory = freshFactory();
  const old = await openOld(factory);
  old.close();
  const legacy = JSON.stringify({ theme: 'dark', units: 'us' });
  let reads = 0;
  const open = () =>
    openLocalStore({ factory, storage: undefined, legacyPrefs: () => (reads++, legacy) });
  const first = await open();
  expect(await first.settings.load()).toMatchObject({ theme: 'dark', units: 'us' });
  await first.settings.set('theme', 'light');
  first.close();
  // The database is at version 2 now: the migration does not run again.
  const second = await open();
  expect(reads).toBe(1);
  expect(await second.settings.load()).toMatchObject({ theme: 'light', units: 'us' });
  second.close();
});

test('a fresh database runs every migration, the legacy values included', async () => {
  const store = await openLocalStore({
    factory: freshFactory(),
    storage: undefined,
    legacyPrefs: () => '{"theme":"light","units":"imperial","extra":1}',
  });
  expect(await store.settings.load()).toMatchObject({ theme: 'light', units: 'imperial' });
  store.close();
});

test('garbage in the old preferences falls back to the defaults', async () => {
  const store = await openLocalStore({
    factory: freshFactory(),
    storage: undefined,
    legacyPrefs: () => '{nope',
  });
  expect(await store.settings.load()).toMatchObject({ theme: 'system', units: 'metric' });
  store.close();
});

test('a failing migration rolls back and leaves the old database as it was', async () => {
  const factory = freshFactory();
  const old = await openOld(factory);
  const put = old.transaction('specs', 'readwrite');
  put.objectStore('specs').put(user.specs[1]);
  await new Promise((done) => (put.oncomplete = done));
  old.close();
  const broken: Migration = {
    version: 2,
    describe: 'fails',
    up: () => {
      throw new Error('boom');
    },
  };
  const error = await openDatabase({ factory, migrations: [...v1, broken] }).catch(
    (e: unknown) => e,
  );
  expect(error).toMatchObject({ kind: 'migration', message: 'boom' });
  const again = await openOld(factory);
  expect(again.version).toBe(1);
  expect(
    await new Promise((r) => {
      const q = again.transaction('specs').objectStore('specs').count();
      q.onsuccess = () => r(q.result);
    }),
  ).toBe(1);
  again.close();
});

test('a database newer than the app is refused and left alone', async () => {
  const factory = freshFactory();
  const newer = await openDatabase({ factory, version: SCHEMA_VERSION + 3, migrations: [] });
  newer.close();
  const error = await openLocalStore({ factory, storage: undefined }).catch((e: unknown) => e);
  expect(error).toBeInstanceOf(StoreError);
  expect(error).toMatchObject({ kind: 'too-new' });
  expect((error as StoreError).message).toContain(String(SCHEMA_VERSION + 3));
  const check = await openDatabase({ factory, version: SCHEMA_VERSION + 3, migrations: [] });
  expect(check.version).toBe(SCHEMA_VERSION + 3);
  check.close();
});

test('no IndexedDB is a typed error', async () => {
  await expect(openLocalStore({ factory: undefined })).rejects.toMatchObject({
    kind: 'unavailable',
  });
});

test('a factory that throws is a typed error', async () => {
  const factory = {
    open: () => {
      throw Object.assign(new Error('denied'), { name: 'SecurityError' });
    },
  } as unknown as IDBFactory;
  await expect(openLocalStore({ factory })).rejects.toMatchObject({ kind: 'unavailable' });
});

test('an upgrade that another tab holds up reports blocked', async () => {
  const factory = freshFactory();
  // A tab on the old version that never closes and ignores versionchange.
  const holder = await new Promise<IDBDatabase>((resolve) => {
    const open = factory.open('mixtura', 1);
    open.onupgradeneeded = () =>
      migrations[0]!.up({
        db: open.result,
        tx: open.transaction!,
        legacyPrefs: null,
        clock: () => '2026-11-18T08:00:00Z',
        newId: () => 'u-00000000-0000-4000-8000-000000000000',
        placeName: 'Home',
      });
    open.onsuccess = () => resolve(open.result);
  });
  const error = await openLocalStore({ factory, storage: undefined }).catch((e: unknown) => e);
  expect(error).toMatchObject({ kind: 'blocked' });
  holder.close();
});
