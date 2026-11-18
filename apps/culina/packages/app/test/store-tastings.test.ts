// Tasting notes are records of their own: the store kind, and a database from before it existed.
import type { IDBFactory } from 'fake-indexeddb';
import { describe, expect, test } from 'vitest';
import { checkStore, openStore, type Store } from '../src/store';
import { dumpRaw, freshFactory, clockOf, ONION } from './store-helpers';
import { must } from './must';

const T1 = '2026-11-18T08:00:00.000Z';
const BREAD = 'u-3f1c2a52-8d1e-4b7a-9c01-5a1e0c0ffee2';
const NOTE = {
  id: 'u-3f1c2a52-8d1e-4b7a-9c01-5a1e0c0ffee5',
  ref: { kind: 'component', id: BREAD },
  date: '2026-11-18',
  text: 'Crumb open, needs a little more salt.',
};

const open = async (factory: IDBFactory = freshFactory()): Promise<Store> => {
  const result = await openStore({ now: clockOf(T1), indexedDB: factory });
  if (!result.ok) throw new Error(`open failed: ${result.error.code}`);
  return result.store;
};

describe('the tastings kind', () => {
  test('put, get, list and remove a tasting note', async () => {
    const store = await open();
    expect((await store.put('tastings', NOTE)).ok).toBe(true);
    expect(await store.get('tastings', NOTE.id)).toEqual({ ok: true, record: NOTE });
    expect(await store.list('tastings')).toEqual({ ok: true, records: [NOTE] });
    expect((await store.remove('tastings', NOTE.id)).ok).toBe(true);
    expect(await store.get('tastings', NOTE.id)).toEqual({
      ok: false,
      error: { code: 'not-found' },
    });
    expect(await store.list('tastings')).toEqual({ ok: true, records: [] });
    const rows = await store.listRows('tastings');
    expect(rows.ok && rows.rows.map((r) => r.deleted)).toEqual([true]);
  });

  test('two notes on one version are two records', async () => {
    const store = await open();
    const other = { ...NOTE, id: 'u-3f1c2a52-8d1e-4b7a-9c01-5a1e0c0ffee6', text: 'Better.' };
    await store.put('tastings', NOTE);
    await store.put('tastings', other);
    const listed = await store.list('tastings');
    expect(listed.ok && listed.records.map((r) => r.id)).toEqual([NOTE.id, other.id]);
  });

  test('an invalid tasting note is rejected and nothing is stored', async () => {
    const store = await open();
    for (const bad of [
      { ...NOTE, ref: { kind: 'ingredient', id: 'salt' } },
      { ...NOTE, text: '' },
      { ...NOTE, date: '18.11.2026' },
      { id: NOTE.id, date: NOTE.date, text: NOTE.text },
    ]) {
      const result = await store.put('tastings', bad);
      expect(result.ok === false && result.error.code).toBe('invalid-record');
    }
    expect(await store.list('tastings')).toEqual({ ok: true, records: [] });
  });

  test('a component or dish with a tastings list is rejected now', async () => {
    const store = await open();
    const list = [{ date: '2026-11-18', text: 'Needs salt.' }];
    const component = {
      id: BREAD,
      name: 'Bread dough',
      lines: [{ ref: { kind: 'ingredient', id: 'salt' }, amount: { value: 1, unit: 'g' } }],
      version: { family: BREAD, date: '2026-11-17' },
    };
    expect((await store.put('components', component)).ok).toBe(true);
    const result = await store.put('components', { ...component, tastings: list });
    expect(result.ok === false && must(result.error.issues).map((i) => i.keyword)).toContain(
      'additionalProperties',
    );
    const dish = {
      id: BREAD,
      name: 'Plate',
      slots: [{ role: 'main', ref: { kind: 'ingredient', id: 'salt' } }],
      version: { family: BREAD, date: '2026-11-17' },
    };
    expect((await store.put('dishes', dish)).ok).toBe(true);
    expect((await store.put('dishes', { ...dish, tastings: list })).ok).toBe(false);
  });

  test('checkStore finds a note on a version that does not exist', async () => {
    const store = await open();
    await store.put('tastings', NOTE);
    await store.put('tastings', { ...NOTE, id: 'u-n2', ref: { kind: 'dish', id: 'u-d1' } });
    const found = await checkStore(store);
    expect(found.ok && found.findings.map((f) => `${f.code}:${f.kind}:${f.ref}`)).toEqual([
      `unknown-component:tasting:${BREAD}`,
      'unknown-dish:tasting:u-d1',
    ]);
  });
});

/** A database as the previous commit created it: IndexedDB version 1, no `tastings` store. */
const createLayout1 = (factory: IDBFactory): Promise<void> =>
  new Promise((resolve, reject) => {
    const request = factory.open('culina', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of [
        'ingredients',
        'templates',
        'components',
        'dishes',
        'stock',
        'affinities',
        'meta',
        'backup',
      ]) {
        db.createObjectStore(name, { keyPath: 'key' });
      }
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(['ingredients', 'components', 'meta'], 'readwrite');
      tx.objectStore('meta').put({ key: 'schemaVersion', value: 1 });
      tx.objectStore('ingredients').put({ key: ONION.id, updatedAt: T1, value: ONION });
      // Written when the schema still allowed a tastings list inside a component.
      tx.objectStore('components').put({
        key: BREAD,
        updatedAt: T1,
        value: { id: BREAD, name: 'Bread dough', tastings: [{ date: '2026-11-18', text: 'Ok.' }] },
      });
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    };
  });

describe('a database created before the tastings store existed', () => {
  test('opening adds the store, keeps every row and keeps data schema version 1', async () => {
    const factory = freshFactory();
    await createLayout1(factory);
    const store = await open(factory);
    expect(store.schemaVersion).toBe(1);
    expect(await store.list('ingredients')).toEqual({ ok: true, records: [ONION] });
    const component = await store.get('components', BREAD);
    expect(component.ok && component.record.tastings).toEqual([
      { date: '2026-11-18', text: 'Ok.' },
    ]);
    expect(await store.list('tastings')).toEqual({ ok: true, records: [] });
    expect((await store.put('tastings', NOTE)).ok).toBe(true);
    store.close();
    const raw = await dumpRaw(factory);
    expect(raw.meta).toEqual([{ key: 'schemaVersion', value: 1 }]);
    expect(raw.tastings).toHaveLength(1);
    expect(raw.ingredients).toHaveLength(1);
  });

  test('opening twice does not fail on the store that exists now', async () => {
    const factory = freshFactory();
    await createLayout1(factory);
    (await open(factory)).close();
    const again = await open(factory);
    expect(await again.list('ingredients')).toEqual({ ok: true, records: [ONION] });
  });
});
