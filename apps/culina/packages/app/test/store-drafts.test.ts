// Drafts: their own object store (layout version 3), unvalidated rows, a database from before it.
import type { IDBFactory } from 'fake-indexeddb';
import { describe, expect, test } from 'vitest';
import { openStore, type Store } from '../src/store';
import { clockOf, freshFactory, ONION } from './store-helpers';

const T1 = '2026-11-18T08:00:00.000Z';
const T2 = '2026-11-18T08:05:00.000Z';

const open = async (factory: IDBFactory = freshFactory(), ...clock: string[]): Promise<Store> => {
  const result = await openStore({
    now: clockOf(...(clock.length ? clock : [T1])),
    indexedDB: factory,
  });
  if (!result.ok) throw new Error(`open failed: ${result.error.code}`);
  return result.store;
};

describe('drafts', () => {
  test('a draft does not need to satisfy a schema and survives closing the database', async () => {
    const factory = freshFactory();
    const store = await open(factory);
    const unfinished = { name: '', lines: [{ amountText: '12x' }] };
    const put = await store.drafts.put('component:new', unfinished);
    expect(put.ok && put.draft).toEqual({ key: 'component:new', updatedAt: T1, value: unfinished });
    store.close();
    const again = await open(factory);
    const got = await again.drafts.get('component:new');
    expect(got.ok && got.draft?.value).toEqual(unfinished);
  });

  test('put again is newer; remove deletes; list is sorted by key; a missing draft is undefined', async () => {
    const store = await open(freshFactory(), T1, T2);
    await store.drafts.put('dish:new', { a: 1 });
    await store.drafts.put('component:new', { b: 1 });
    const second = await store.drafts.put('dish:new', { a: 2 });
    expect(second.ok && second.draft.updatedAt > T1).toBe(true);
    const listed = await store.drafts.list();
    expect(listed.ok && listed.drafts.map((d) => d.key)).toEqual(['component:new', 'dish:new']);
    expect((await store.drafts.remove('dish:new')).ok).toBe(true);
    expect(await store.drafts.get('dish:new')).toEqual({ ok: true, draft: undefined });
  });

  test('drafts are not records: lists and rows of the kinds stay empty', async () => {
    const store = await open();
    await store.drafts.put('component:new', { name: 'x' });
    expect(await store.list('components')).toEqual({ ok: true, records: [] });
    expect(await store.listRows('components')).toEqual({ ok: true, rows: [] });
  });
});

const createLayout2 = (factory: IDBFactory): Promise<void> =>
  new Promise((resolve, reject) => {
    const request = factory.open('culina', 2);
    request.onupgradeneeded = () => {
      for (const name of [
        'ingredients',
        'templates',
        'components',
        'dishes',
        'stock',
        'affinities',
        'tastings',
        'meta',
        'backup',
      ]) {
        request.result.createObjectStore(name, { keyPath: 'key' });
      }
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(['ingredients', 'meta'], 'readwrite');
      tx.objectStore('meta').put({ key: 'schemaVersion', value: 1 });
      tx.objectStore('ingredients').put({ key: ONION.id, updatedAt: T1, value: ONION });
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
    };
  });

describe('a database created before the drafts store existed', () => {
  test('opening adds the store, keeps the rows and the data schema version 1', async () => {
    const factory = freshFactory();
    await createLayout2(factory);
    const store = await open(factory);
    expect(store.schemaVersion).toBe(1);
    expect(await store.list('ingredients')).toEqual({ ok: true, records: [ONION] });
    expect((await store.drafts.put('dish:new', { x: 1 })).ok).toBe(true);
  });
});
