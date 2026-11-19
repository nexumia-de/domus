// Skill state is a store kind: one personal record per technique, in the row shape of every kind;
// a database from before it existed gets the new object store and keeps its rows; the export and
// import of the other kinds leave it alone.
import type { IDBFactory } from 'fake-indexeddb';
import { describe, expect, test } from 'vitest';
import { skillRecord } from '@culina/engine';
import { openStore, type Store } from '../src/store';
import { changeSpan } from '../src/exchange/changes';
import { clockOf, dumpRaw, freshFactory, ONION } from './store-helpers';

const T1 = '2026-11-19T08:00:00.000Z';
const T2 = '2026-11-19T08:05:00.000Z';

const open = async (factory: IDBFactory = freshFactory(), ...clock: string[]): Promise<Store> => {
  const result = await openStore({
    now: clockOf(...(clock.length ? clock : [T1])),
    indexedDB: factory,
  });
  if (!result.ok) throw new Error(`open failed: ${result.error.code}`);
  return result.store;
};

describe('the skills kind', () => {
  test('put, get, list and remove a skill record; the row is the sync record', async () => {
    const store = await open();
    const record = skillRecord('melting', true);
    const put = await store.put('skills', record);
    expect(put).toMatchObject({
      ok: true,
      row: { key: 'skill-melting', updatedAt: T1, value: record },
    });
    expect(await store.get('skills', 'skill-melting')).toEqual({ ok: true, record });
    expect(await store.list('skills')).toEqual({ ok: true, records: [record] });
    expect((await store.remove('skills', 'skill-melting')).ok).toBe(true);
    expect(await store.list('skills')).toEqual({ ok: true, records: [] });
    const rows = await store.listRows('skills');
    expect(rows.ok && rows.rows.map((r) => r.deleted)).toEqual([true]);
  });

  test('marking and unmarking writes the same record, newer each time', async () => {
    const store = await open(freshFactory(), T1, T2);
    await store.put('skills', skillRecord('melting', true));
    await store.put('skills', skillRecord('melting', false));
    const rows = await store.listRows('skills');
    expect(rows.ok && rows.rows.map((r) => [r.key, r.updatedAt, r.value?.learned])).toEqual([
      ['skill-melting', T2, false],
    ]);
  });

  test('a record that does not meet the schema is refused and nothing is written', async () => {
    const store = await open();
    for (const bad of [
      { id: 'melting', technique: 'melting', learned: true },
      { id: 'skill-melting', technique: 'melting', learned: 'yes' },
      { id: 'skill-melting', technique: 'melting' },
      { ...skillRecord('melting', true), note: 'extra' },
    ]) {
      const done = await store.put('skills', bad);
      expect(done.ok === false && done.error.code).toBe('invalid-record');
    }
    expect(await store.list('skills')).toEqual({ ok: true, records: [] });
  });

  test('replacing the notebook from an export file leaves the skills as they are', async () => {
    const store = await open();
    await store.put('skills', skillRecord('melting', true));
    const none = {
      ingredients: [ONION],
      templates: [],
      components: [],
      dishes: [],
      stock: [],
      affinities: [],
      tastings: [],
    };
    expect((await store.bulk.replaceAll(none)).ok).toBe(true);
    expect(await store.list('skills')).toEqual({
      ok: true,
      records: [skillRecord('melting', true)],
    });
    expect(await store.list('ingredients')).toEqual({ ok: true, records: [ONION] });
  });

  test('a skill change is no unexported change for the backup reminder', async () => {
    const store = await open();
    await store.put('skills', skillRecord('melting', true));
    expect(await changeSpan(store)).toEqual({});
  });
});

/** A database as the previous commit created it: IndexedDB version 3, no `skills` store. */
const createLayout3 = (factory: IDBFactory): Promise<void> =>
  new Promise((resolve, reject) => {
    const request = factory.open('culina', 3);
    request.onupgradeneeded = () => {
      for (const name of [
        'ingredients',
        'templates',
        'components',
        'dishes',
        'stock',
        'affinities',
        'tastings',
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
      const tx = db.transaction(['ingredients', 'meta'], 'readwrite');
      tx.objectStore('meta').put({ key: 'schemaVersion', value: 1 });
      tx.objectStore('ingredients').put({ key: ONION.id, updatedAt: T1, value: ONION });
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    };
  });

describe('a database from before skills existed', () => {
  test('gets the skills store on the next open and keeps its rows', async () => {
    const factory = freshFactory();
    await createLayout3(factory);
    const store = await open(factory);
    expect(store.schemaVersion).toBe(1);
    expect(await store.get('ingredients', ONION.id)).toEqual({ ok: true, record: ONION });
    expect((await store.put('skills', skillRecord('folding', true))).ok).toBe(true);
    store.close();
    const raw = await dumpRaw(factory);
    expect(raw.skills).toHaveLength(1);
    expect(raw.ingredients).toHaveLength(1);
  });
});
