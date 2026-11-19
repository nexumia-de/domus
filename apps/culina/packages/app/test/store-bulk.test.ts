// The bulk writes of the store (import and its Undo): all or nothing, tombstones on replace,
// revert puts records back or removes them.
import { describe, expect, test } from 'vitest';
import { openStore, type Store } from '../src/store';
import { clockOf, freshFactory } from './store-helpers';

const T = '2026-11-18T08:00:00.000Z';
const id = (n: number): string => `u-00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const ing = (n: number, name: string) => ({ id: id(n), name });

const open = async (): Promise<Store> => {
  const result = await openStore({ now: clockOf(T), indexedDB: freshFactory() });
  if (!result.ok) throw new Error(result.error.code);
  return result.store;
};

const names = async (store: Store): Promise<string[]> => {
  const listed = await store.list('ingredients');
  return listed.ok ? listed.records.map((r) => String(r.name)) : [];
};

describe('putMany', () => {
  test('writes every record in one go, each with its own row', async () => {
    const store = await open();
    const done = await store.bulk.putMany([
      { kind: 'ingredients', record: ing(1, 'Flour') },
      { kind: 'ingredients', record: ing(2, 'Butter') },
      {
        kind: 'stock',
        record: {
          id: id(3),
          ref: { kind: 'ingredient', id: id(1) },
          amount: { value: 5, unit: 'g' },
          state: 'raw',
        },
      },
    ]);
    expect(done).toEqual({ ok: true, count: 3 });
    expect(await names(store)).toEqual(['Flour', 'Butter']);
  });

  test('one record that breaks its schema writes nothing, and names the path only', async () => {
    const store = await open();
    const done = await store.bulk.putMany([
      { kind: 'ingredients', record: ing(1, 'Flour') },
      { kind: 'ingredients', record: { id: id(2), name: '' } },
    ]);
    expect(done.ok).toBe(false);
    expect(JSON.stringify(done)).not.toContain('Flour');
    expect(await names(store)).toEqual([]);
  });
});

describe('replaceAll', () => {
  test('writes the given records and tombstones the others, which stay as rows', async () => {
    const store = await open();
    await store.put('ingredients', ing(1, 'Flour'));
    await store.put('ingredients', ing(2, 'Butter'));
    const empty = {
      ingredients: [],
      templates: [],
      components: [],
      dishes: [],
      stock: [],
      affinities: [],
      tastings: [],
    };
    const done = await store.bulk.replaceAll({
      ...empty,
      ingredients: [ing(2, 'Butter 2'), ing(3, 'Salt')],
    });
    expect(done.ok).toBe(true);
    expect(await names(store)).toEqual(['Butter 2', 'Salt']);
    const rows = await store.listRows('ingredients');
    expect(rows.ok && rows.rows.map((r) => [r.key.slice(-1), r.deleted === true])).toEqual([
      ['1', true],
      ['2', false],
      ['3', false],
    ]);
  });

  test('an unusable record in any kind leaves everything as it was', async () => {
    const store = await open();
    await store.put('ingredients', ing(1, 'Flour'));
    const empty = {
      ingredients: [],
      templates: [],
      components: [],
      dishes: [],
      stock: [],
      affinities: [],
      tastings: [],
    };
    const done = await store.bulk.replaceAll({
      ...empty,
      ingredients: [ing(2, 'Salt')],
      tastings: [{ id: 'x' }],
    });
    expect(done.ok).toBe(false);
    expect(await names(store)).toEqual(['Flour']);
  });
});

describe('revert', () => {
  test('puts a record back as it was and removes one that was new', async () => {
    const store = await open();
    await store.put('ingredients', ing(1, 'Flour'));
    await store.bulk.putMany([
      { kind: 'ingredients', record: ing(1, 'Wheat flour') },
      { kind: 'ingredients', record: ing(2, 'Salt') },
    ]);
    const done = await store.bulk.revert([
      { kind: 'ingredients', id: id(1), before: ing(1, 'Flour') },
      { kind: 'ingredients', id: id(2) },
    ]);
    expect(done.ok).toBe(true);
    expect(await names(store)).toEqual(['Flour']);
  });

  test('leaves records it was not told about alone', async () => {
    const store = await open();
    await store.put('ingredients', ing(1, 'Flour'));
    await store.put('ingredients', ing(9, 'Added later'));
    await store.bulk.revert([{ kind: 'ingredients', id: id(1), before: ing(1, 'Older') }]);
    expect(await names(store)).toEqual(['Older', 'Added later']);
  });
});
