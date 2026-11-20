// The one move of the stock items Culina kept in its own database into the shared collection of
// the used space (src/shared-stock/legacy.ts, decision point 9): one record per thing, batches
// kept, a record that already says present or not is never overwritten, the items leave Culina's
// database only after the shared write, a second run moves nothing, a failed write leaves them.
// What this does not prove: Culina's own database is fake-indexeddb and the shared one the host's
// memory store; an interruption is simulated by a store that throws, not by closing a real tab.
import { createMemoryStore, ensureSpace, localChange, type Store } from '@nexumia-de/hospes';
import { expect, test } from 'vitest';
import { listStock, stockSpaces } from '../src/notebook';
import { state } from '../src/notebook/state';
import { openStore } from '../src/store';
import { must } from './must';
import { liveStock, startWithStock } from './stock-helpers';
import { freshFactory } from './store-helpers';

const NOW = () => '2026-11-18T08:00:00.000Z';
const ONION = { id: 'u-onion', name: 'Onion', parentId: 'alliums' };
const OLD = [
  {
    id: 'u-1',
    ref: { kind: 'ingredient', id: 'u-onion' },
    amount: { value: 400, unit: 'g' },
    'x-emptio': { shop: 'M' },
  },
  {
    id: 'u-2',
    ref: { kind: 'component', id: 'example-herb-oil-2' },
    preparedOn: '2026-11-10',
    useBy: '2026-11-14',
  },
  {
    id: 'u-3',
    ref: { kind: 'component', id: 'example-herb-oil' },
    preparedOn: '2026-11-12',
    storage: 'freezer',
  },
  { id: 'u-4', ref: { kind: 'ingredient', id: 'carrot' }, always: true },
];

/** Culina's own database as the version before this change left it: the examples and old stock. */
const oldDatabase = async (): Promise<IDBFactory> => {
  const factory = freshFactory();
  await startWithStock({ factory });
  const opened = await openStore({ now: NOW, indexedDB: factory });
  if (!opened.ok) throw new Error('open');
  expect((await opened.store.put('ingredients', ONION)).ok).toBe(true);
  for (const item of OLD) expect((await opened.store.put('stock', item)).ok).toBe(true);
  opened.store.close();
  state.stockSpace?.stop();
  return factory;
};

const ownStock = async (factory: IDBFactory) => {
  const opened = await openStore({ now: NOW, indexedDB: factory });
  if (!opened.ok) throw new Error('open');
  const rows = await opened.store.listRows('stock');
  opened.store.close();
  return rows.ok ? rows.rows : undefined;
};

test('the old items move into the used space at the first start and leave Culina’s database', async () => {
  const factory = await oldDatabase();
  const shared = createMemoryStore();
  await startWithStock({ shared, factory, examples: false });
  const space = must(stockSpaces().used).id;
  expect(await liveStock(shared, space)).toEqual({
    'u-onion': { present: true, amount: { value: 400, unit: 'g' }, 'x-emptio': { shop: 'M' } },
    // Two versions of one component are one thing, kept under the family id, two batches.
    'example-herb-oil': {
      present: true,
      openedOn: '2026-11-10',
      bestBefore: '2026-11-14',
      batches: [{ openedOn: '2026-11-12', storage: 'freezer' }],
    },
    carrot: { present: true, always: true },
  });
  expect(
    listStock()
      .map((i) => i.id)
      .sort(),
  ).toEqual(['carrot', 'example-herb-oil', 'example-herb-oil~1', 'u-onion']);
  expect(await ownStock(factory)).toEqual([]);
  expect(state.stockSpace?.moved()).toMatchObject({ ok: true, kept: [] });
});

test('run twice: the second start finds nothing to move and changes nothing', async () => {
  const factory = await oldDatabase();
  const shared = createMemoryStore();
  await startWithStock({ shared, factory, examples: false });
  const space = must(stockSpaces().used).id;
  const first = await shared.readCollection(space, 'stock');
  await startWithStock({ shared, factory, examples: false });
  expect(await shared.readCollection(space, 'stock')).toEqual(first);
  expect(state.stockSpace?.moved()).toEqual({ ok: true, moved: [], kept: [] });
});

test('a record the space already has (present true or false) is never overwritten', async () => {
  const factory = await oldDatabase();
  const shared = createMemoryStore();
  const [home] = await ensureSpace(shared, 'Home');
  const space = must(home).id;
  await localChange(shared, space, 'stock', NOW, () => ({
    put: [
      { key: 'carrot', value: { present: false, note: 'out, said Mixtura' } },
      { key: 'u-onion', value: { present: true } },
    ],
  }));
  await startWithStock({ shared, factory, examples: false });
  const after = await liveStock(shared, space);
  expect(after.carrot).toEqual({ present: false, note: 'out, said Mixtura' });
  expect(after['u-onion']).toEqual({ present: true });
  expect(Object.keys(after).sort()).toEqual(['carrot', 'example-herb-oil', 'u-onion']);
  expect(state.stockSpace?.moved()).toMatchObject({ ok: true, kept: ['u-onion', 'carrot'] });
  expect(await ownStock(factory)).toEqual([]);
});

test('a shared write that fails leaves the old items where they are; the next start moves them', async () => {
  const factory = await oldDatabase();
  const shared = createMemoryStore();
  let broken = true;
  const failing: Store = {
    ...shared,
    listSpaces: () => shared.listSpaces(),
    getSpace: (id) => shared.getSpace(id),
    putSpace: (s) => shared.putSpace(s),
    removeSpace: (id) => shared.removeSpace(id),
    readCollection: (id, name) => shared.readCollection(id, name),
    writeCollection: (id, name, s) => shared.writeCollection(id, name, s),
    changeRecords: (id, name, fn) =>
      broken ? Promise.reject(new Error('quota')) : shared.changeRecords(id, name, fn),
  };
  await startWithStock({ shared: failing, factory, examples: false });
  expect(state.stockSpace?.moved()).toEqual({ ok: false, reason: 'write' });
  expect(await ownStock(factory)).toHaveLength(OLD.length);
  broken = false;
  await startWithStock({ shared: failing, factory, examples: false });
  expect(state.stockSpace?.moved()).toMatchObject({ ok: true });
  expect(await ownStock(factory)).toEqual([]);
  expect(Object.keys(await liveStock(shared, must(stockSpaces().used).id))).toHaveLength(3);
});

test('interrupted after the shared write and before the clear: the next start keeps the space and clears', async () => {
  const factory = await oldDatabase();
  const shared = createMemoryStore();
  await startWithStock({ shared, factory, examples: false });
  const space = must(stockSpaces().used).id;
  // The person changes the onion in the space; then the old items show up again in Culina's
  // database, as if the clear of the first start had not happened.
  await localChange(
    shared,
    space,
    'stock',
    () => '2026-11-19T08:00:00.000Z',
    () => ({
      put: [{ key: 'u-onion', value: { present: false } }],
    }),
  );
  const before = await shared.readCollection(space, 'stock');
  const opened = await openStore({ now: NOW, indexedDB: factory });
  if (!opened.ok) throw new Error('open');
  for (const item of OLD) await opened.store.put('stock', item);
  opened.store.close();
  await startWithStock({ shared, factory, examples: false });
  expect((await shared.readCollection(space, 'stock')).records).toEqual(before.records);
  expect(await ownStock(factory)).toEqual([]);
});
