// The date a dish was cooked is a store kind (`cooked`): one personal record per dish family, in the
// row shape of every kind. A database from before it existed gets the new object store (IndexedDB
// layout 5) and keeps every row and its data schema version; an older build that opens a database
// of layout 5 is refused by IndexedDB itself and changes nothing; a replace that does not name the
// kind (a file older than format 4) leaves it alone.
// What it does not prove: fake-indexeddb, not a browser's IndexedDB; an older build is simulated by
// opening the database at the old layout number, not by running the old code; two tabs are two
// stores in one process.
import type { IDBFactory } from 'fake-indexeddb';
import { describe, expect, test } from 'vitest';
import { cookedRecord, skillRecord } from '@culina/engine';
import { openStore, type Store } from '../src/store';
import { changeSpan } from '../src/exchange/changes';
import { clockOf, dumpRaw, freshFactory, ONION } from './store-helpers';

const T1 = '2026-11-24T08:00:00.000Z';
const T2 = '2026-11-24T08:05:00.000Z';
const FAMILY = 'u-3f1c2a52-8d1e-4b7a-9c01-5a1e0c0ffee4';

const open = async (factory: IDBFactory = freshFactory(), ...clock: string[]): Promise<Store> => {
  const result = await openStore({
    now: clockOf(...(clock.length ? clock : [T1])),
    indexedDB: factory,
  });
  if (!result.ok) throw new Error(`open failed: ${result.error.code}`);
  return result.store;
};

describe('the cooked kind', () => {
  test('put, get, list and remove a record; the row is the sync record', async () => {
    const store = await open();
    const record = cookedRecord(FAMILY, '2026-11-24');
    expect(await store.put('cooked', record)).toMatchObject({
      ok: true,
      row: { key: `cooked-${FAMILY}`, updatedAt: T1, value: record },
    });
    expect(await store.list('cooked')).toEqual({ ok: true, records: [record] });
    expect((await store.remove('cooked', record.id)).ok).toBe(true);
    expect(await store.list('cooked')).toEqual({ ok: true, records: [] });
  });

  test('a record that does not meet the schema is refused and nothing is written', async () => {
    const store = await open();
    for (const bad of [
      { id: FAMILY, dish: FAMILY, date: '2026-11-24' },
      { ...cookedRecord(FAMILY, '2026-11-24'), date: '2026-11-24T18:00:00Z' },
      { id: `cooked-${FAMILY}`, dish: FAMILY },
      { ...cookedRecord(FAMILY, '2026-11-24'), count: 3 },
      { ...cookedRecord(FAMILY, '2026-11-24'), dates: ['2026-11-01'] },
    ]) {
      const done = await store.put('cooked', bad);
      expect(done.ok === false && done.error.code).toBe('invalid-record');
    }
    expect(await store.list('cooked')).toEqual({ ok: true, records: [] });
  });

  test('replacing with records that name no cooked kind (a file before format 4) leaves the days', async () => {
    const store = await open();
    const record = cookedRecord(FAMILY, '2026-11-24');
    await store.put('cooked', record);
    expect((await store.bulk.replaceAll({ ingredients: [ONION], skills: [] })).ok).toBe(true);
    expect(await store.list('cooked')).toEqual({ ok: true, records: [record] });
    // Control: a replace that names the kind (a format 4 file) makes it the file's.
    expect((await store.bulk.replaceAll({ cooked: [] })).ok).toBe(true);
    expect(await store.list('cooked')).toEqual({ ok: true, records: [] });
  });

  test('a new day is an unexported change for the backup reminder', async () => {
    const store = await open();
    await store.put('cooked', cookedRecord(FAMILY, '2026-11-24'));
    expect(await changeSpan(store)).toEqual({ first: T1, last: T1 });
  });

  test('two tabs: the later write wins, a clear after a mark included', async () => {
    const factory = freshFactory();
    const a = await open(factory, T1);
    const b = await open(factory, T2);
    await a.put('cooked', cookedRecord(FAMILY, '2026-11-24'));
    // Tab B still shows no day (its cache is older); it writes a day of its own, then clears.
    await b.put('cooked', cookedRecord(FAMILY, '2026-11-23'));
    expect(await a.get('cooked', `cooked-${FAMILY}`)).toEqual({
      ok: true,
      record: cookedRecord(FAMILY, '2026-11-23'),
    });
    await b.remove('cooked', `cooked-${FAMILY}`);
    expect(await a.list('cooked')).toEqual({ ok: true, records: [] });
  });
});

/** A database as the commit before created it: IndexedDB layout 4, no `cooked` store. */
const createLayout4 = (factory: IDBFactory): Promise<void> =>
  new Promise((resolve, reject) => {
    const request = factory.open('culina', 4);
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
const openAsLayout4 = (factory: IDBFactory): Promise<string> =>
  new Promise((resolve) => {
    const request = factory.open('culina', 4);
    request.onsuccess = () => {
      request.result.close();
      resolve('opened');
    };
    request.onerror = () => resolve(request.error?.name ?? 'error');
  });

describe('a database from before the cooked kind existed', () => {
  test('gets the cooked store on the next open and keeps its rows unchanged', async () => {
    const factory = freshFactory();
    await createLayout4(factory);
    const before = await dumpRaw(factory);
    const store = await open(factory);
    expect(store.schemaVersion).toBe(1);
    expect((await store.put('cooked', cookedRecord(FAMILY, '2026-11-24'))).ok).toBe(true);
    store.close();
    const raw = await dumpRaw(factory);
    expect(raw.ingredients).toEqual(before.ingredients);
    expect(raw.skills).toEqual(before.skills);
    expect(raw.meta).toEqual(before.meta);
    expect(raw.cooked).toHaveLength(1);
  });

  test('an older build opening the new database is refused by IndexedDB and destroys nothing', async () => {
    const factory = freshFactory();
    const store = await open(factory);
    await store.put('ingredients', ONION);
    await store.put('cooked', cookedRecord(FAMILY, '2026-11-24'));
    store.close();
    const before = await dumpRaw(factory);
    // The layout number of the older build is lower than the database's: a VersionError, which
    // that build's openStore reports as `unavailable` with the reason, writing nothing.
    expect(await openAsLayout4(factory)).toBe('VersionError');
    expect(await dumpRaw(factory)).toEqual(before);
    const again = await open(factory);
    expect(await again.list('cooked')).toEqual({
      ok: true,
      records: [cookedRecord(FAMILY, '2026-11-24')],
    });
  });

  test('a tab of the older build still open: the new build is blocked, says unavailable, writes nothing', async () => {
    const factory = freshFactory();
    await createLayout4(factory);
    // The older tab keeps its connection and does not close it on a version change.
    const old = await new Promise<IDBDatabase>((resolve) => {
      const request = factory.open('culina', 4);
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
    expect(raw.cooked).toEqual([]);
  });
});
