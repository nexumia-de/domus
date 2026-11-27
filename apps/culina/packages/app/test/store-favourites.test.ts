// The favourites are a store kind (`favourites`): one personal record per marked dish, in the row
// shape of every kind. A database from before it existed (IndexedDB layout 5) gets the new object
// store and keeps every row and its data schema version; an older build that opens a database of
// layout 6 is refused by IndexedDB itself and changes nothing; a replace that does not name the
// kind (a file older than format 5) leaves it alone.
// What it does not prove: fake-indexeddb, not a browser's IndexedDB; an older build is simulated by
// opening the database at the old layout number, not by running the old code; two tabs are two
// stores in one process.
import type { IDBFactory } from 'fake-indexeddb';
import { describe, expect, test } from 'vitest';
import { favouriteRecord, skillRecord } from '@culina/engine';
import { openStore, type Store } from '../src/store';
import { changeSpan } from '../src/exchange/changes';
import { clockOf, dumpRaw, freshFactory, ONION } from './store-helpers';

const T1 = '2026-11-27T08:00:00.000Z';
const T2 = '2026-11-27T08:05:00.000Z';
const FAMILY = 'u-3f1c2a52-8d1e-4b7a-9c01-5a1e0c0ffee4';
const SHIPPED = 'risotto';
const own = favouriteRecord('own', FAMILY);
const shipped = favouriteRecord('shipped', SHIPPED);

const open = async (factory: IDBFactory = freshFactory(), ...clock: string[]): Promise<Store> => {
  const result = await openStore({
    now: clockOf(...(clock.length ? clock : [T1])),
    indexedDB: factory,
  });
  if (!result.ok) throw new Error(`open failed: ${result.error.code}`);
  return result.store;
};

describe('the favourites kind', () => {
  test('put, get, list and remove a record; the row is the sync record', async () => {
    const store = await open();
    expect(await store.put('favourites', own)).toMatchObject({
      ok: true,
      row: { key: own.id, updatedAt: T1, value: own },
    });
    expect(await store.put('favourites', shipped)).toMatchObject({ ok: true });
    expect(await store.list('favourites')).toEqual({ ok: true, records: [own, shipped] });
    expect((await store.remove('favourites', own.id)).ok).toBe(true);
    expect(await store.list('favourites')).toEqual({ ok: true, records: [shipped] });
    // The removal is a tombstone: the row stays for sync, marked deleted.
    const rows = await store.listRows('favourites');
    expect(rows.ok && rows.rows.map((r) => [r.key, r.deleted === true])).toEqual([
      [own.id, true],
      [shipped.id, false],
    ]);
  });

  test('a record that does not meet the schema is refused and nothing is written', async () => {
    const store = await open();
    for (const bad of [
      { origin: 'own', dish: FAMILY },
      { id: `favourite-own-${FAMILY}`, origin: 'both', dish: FAMILY },
      { id: `favourite-own-${FAMILY}`, origin: 'own' },
      { ...own, date: '2026-11-27' },
      { ...own, count: 3 },
      { ...own, dish: 'x'.repeat(61) },
      { id: FAMILY, origin: 'own', dish: FAMILY },
    ]) {
      const done = await store.put('favourites', bad);
      expect(done.ok === false && done.error.code).toBe('invalid-record');
    }
    expect(await store.list('favourites')).toEqual({ ok: true, records: [] });
  });

  test('replacing with records that name no favourites kind (a file before format 5) leaves them', async () => {
    const store = await open();
    await store.put('favourites', shipped);
    expect((await store.bulk.replaceAll({ ingredients: [ONION], skills: [] })).ok).toBe(true);
    expect(await store.list('favourites')).toEqual({ ok: true, records: [shipped] });
    // Control: a replace that names the kind (a format 5 file) makes it the file's.
    expect((await store.bulk.replaceAll({ favourites: [] })).ok).toBe(true);
    expect(await store.list('favourites')).toEqual({ ok: true, records: [] });
  });

  test('a new mark is an unexported change for the backup reminder', async () => {
    const store = await open();
    await store.put('favourites', own);
    expect(await changeSpan(store)).toEqual({ first: T1, last: T1 });
  });

  test('two tabs: the later write wins, a clear after a mark included', async () => {
    const factory = freshFactory();
    const a = await open(factory, T1);
    const b = await open(factory, T2);
    await a.put('favourites', own);
    // Tab B marks the same dish (the same row), then takes the mark back.
    await b.put('favourites', own);
    expect(await a.list('favourites')).toEqual({ ok: true, records: [own] });
    await b.remove('favourites', own.id);
    expect(await a.list('favourites')).toEqual({ ok: true, records: [] });
  });
});

/** A database as the commit before created it: IndexedDB layout 5, no `favourites` store. */
const createLayout5 = (factory: IDBFactory): Promise<void> =>
  new Promise((resolve, reject) => {
    const request = factory.open('culina', 5);
    request.onupgradeneeded = () => {
      for (const name of [
        'ingredients',
        'templates',
        'components',
        'dishes',
        'stock',
        'affinities',
        'tastings',
        'skills',
        'cooked',
        'drafts',
        'meta',
        'backup',
      ]) {
        request.result.createObjectStore(name, { keyPath: 'key' });
      }
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(['ingredients', 'skills', 'meta'], 'readwrite');
      tx.objectStore('meta').put({ key: 'schemaVersion', value: 1 });
      tx.objectStore('ingredients').put({ key: ONION.id, updatedAt: T1, value: ONION });
      const skill = skillRecord('folding', true);
      tx.objectStore('skills').put({ key: skill.id, updatedAt: T1, value: skill });
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    };
  });

/** What an older build does first: open the database at its own layout number. */
const openAsLayout5 = (factory: IDBFactory): Promise<string> =>
  new Promise((resolve) => {
    const request = factory.open('culina', 5);
    request.onsuccess = () => {
      request.result.close();
      resolve('opened');
    };
    request.onerror = () => resolve(request.error?.name ?? 'error');
  });

describe('a database from before the favourites kind existed', () => {
  test('gets the favourites store on the next open and keeps its rows unchanged', async () => {
    const factory = freshFactory();
    await createLayout5(factory);
    const before = await dumpRaw(factory);
    const store = await open(factory);
    expect(store.schemaVersion).toBe(1);
    expect((await store.put('favourites', own)).ok).toBe(true);
    store.close();
    const raw = await dumpRaw(factory);
    expect(raw.ingredients).toEqual(before.ingredients);
    expect(raw.skills).toEqual(before.skills);
    expect(raw.meta).toEqual(before.meta);
    expect(raw.favourites).toHaveLength(1);
  });

  test('an older build opening the new database is refused by IndexedDB and destroys nothing', async () => {
    const factory = freshFactory();
    const store = await open(factory);
    await store.put('ingredients', ONION);
    await store.put('favourites', own);
    store.close();
    const before = await dumpRaw(factory);
    // The layout number of the older build is lower than the database's: a VersionError, which
    // that build's openStore reports as `unavailable` with the reason, writing nothing.
    expect(await openAsLayout5(factory)).toBe('VersionError');
    expect(await dumpRaw(factory)).toEqual(before);
    const again = await open(factory);
    expect(await again.list('favourites')).toEqual({
      ok: true,
      records: [own],
    });
  });

  test('a tab of the older build still open: the new build is blocked, says unavailable, writes nothing', async () => {
    const factory = freshFactory();
    await createLayout5(factory);
    // The older tab keeps its connection and does not close it on a version change.
    const old = await new Promise<IDBDatabase>((resolve) => {
      const request = factory.open('culina', 5);
      request.onsuccess = () => resolve(request.result);
    });
    const result = await openStore({ now: clockOf(T1), indexedDB: factory });
    expect(result.ok === false && result.error).toEqual({
      code: 'unavailable',
      reason: 'InvalidStateError',
    });
    old.close();
    // Once the old tab is gone the waiting upgrade only adds the missing stores: the rows and the
    // data schema version are as the older build left them.
    const raw = await dumpRaw(factory);
    expect(raw.ingredients).toEqual([{ key: ONION.id, updatedAt: T1, value: ONION }]);
    expect(raw.skills).toHaveLength(1);
    expect(raw.meta).toEqual([{ key: 'schemaVersion', value: 1 }]);
    expect(raw.favourites).toEqual([]);
  });
});
