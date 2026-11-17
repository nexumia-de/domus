/* eslint-disable @typescript-eslint/no-non-null-assertion -- fixtures are indexed at known positions */
import { expect, test } from 'vitest';
import { openDatabase } from '../src/store/db';
import { migrations, type Migration } from '../src/store/migrations';
import { SCHEMA_VERSION } from '../src/store/schema';
import { openLocalStore, StoreError } from '../src/store';
import { freshFactory, user } from './helpers';

const v1 = migrations.filter((m) => m.version === 1);

/** Opens a database as the previous release did: only the first migration. */
const openOld = (factory: IDBFactory) => openDatabase({ factory, version: 1, migrations: v1 });

test('opening a version 1 database upgrades it to 2 without losing data', async () => {
  const factory = freshFactory();
  const old = await openOld(factory);
  expect(old.version).toBe(1);
  const tx = old.transaction(['specs', 'ingredients', 'stock'], 'readwrite');
  tx.objectStore('specs').put(user.specs[1]);
  tx.objectStore('ingredients').put(user.ingredients[0]);
  tx.objectStore('stock').put(user.stock[0]);
  await new Promise((done) => (tx.oncomplete = done));
  old.close();

  const store = await openLocalStore({ factory, storage: undefined });
  expect(await store.specs.get(user.specs[1]!.id)).toEqual(user.specs[1]);
  expect(await store.ingredients.list()).toEqual([user.ingredients[0]]);
  expect(await store.stock.list()).toEqual([user.stock[0]]);
  // No old preferences: nothing is invented, defaults apply.
  expect((await store.settings.load()).theme).toBe('system');
  store.close();
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
      migrations[0]!.up({ db: open.result, tx: open.transaction!, legacyPrefs: null });
    open.onsuccess = () => resolve(open.result);
  });
  const error = await openLocalStore({ factory, storage: undefined }).catch((e: unknown) => e);
  expect(error).toMatchObject({ kind: 'blocked' });
  holder.close();
});
