// Two devices keep one space's stock in step through a storage: Culina's decisions
// (src/shared-stock/edits.ts) written with the host's `localChange`, and the host's cycle
// `syncCollection` against a storage in memory. Each device has its own shared database.
// What this does not prove: the storage is a memory stand-in with etags (no WebDAV or GitHub, no
// network, no encryption checked against a server), the clocks are injected, there are no real
// devices, and the loop's timing (createCollectionSync) is not exercised here.
import {
  createMemoryStore,
  deriveSpace,
  localChange,
  newSecret,
  syncCollection,
  type Store,
} from '@nexumia-de/hospes';
import { expect, test } from 'vitest';
import {
  addEdit,
  removeEdit,
  tickEdit,
  untickEdit,
  type Decision,
} from '../src/shared-stock/edits';
import { detailsOf } from '../src/shared-stock/value';
import { liveStock, memoryStorage } from './stock-helpers';

const clock = (start: string) => {
  let t = Date.parse(start);
  return () => new Date((t += 1000)).toISOString();
};

const setUp = async () => {
  const secret = newSecret();
  const space = await deriveSpace(secret);
  const storage = memoryStorage();
  const device = async () => {
    const store = createMemoryStore();
    await store.putSpace({
      id: space.id,
      secret,
      name: 'Flat',
      storage: { type: 'test', address: 'x' },
    });
    return store;
  };
  return { space, storage, a: await device(), b: await device() };
};

type Records = Parameters<Parameters<typeof localChange>[4]>[0];

/** A person's action on one device: Culina's decision inside the host's atomic change. */
const act = <T>(store: Store, id: string, now: () => string, decide: (r: Records) => Decision<T>) =>
  localChange(store, id, 'stock', now, (records) => decide(records).edit);

test('a tick on one device and a batch on the other meet in both', async () => {
  const { space, storage, a, b } = await setUp();
  const nowA = clock('2026-11-18T08:00:00Z');
  const nowB = clock('2026-11-18T08:00:30Z');
  const cycle = (store: Store, now: () => string) =>
    syncCollection({ space, collection: 'stock', adapter: storage.adapter, store, now });

  await act(a, space.id, nowA, (r) => tickEdit(r, 'carrot', false));
  await act(b, space.id, nowB, (r) =>
    addEdit(r, 'example-vegetable-stock', { preparedOn: '2026-11-18' }),
  );
  expect((await cycle(a, nowA)).ok).toBe(true);
  expect((await cycle(b, nowB)).ok).toBe(true);
  expect((await cycle(a, nowA)).ok).toBe(true);
  const onA = await liveStock(a, space.id);
  expect(onA).toEqual(await liveStock(b, space.id));
  expect(onA).toEqual({
    carrot: { present: true },
    'example-vegetable-stock': { present: true, openedOn: '2026-11-18' },
  });
});

test('an untick on one device reaches the other as present false, with the other app’s field', async () => {
  const { space, storage, a, b } = await setUp();
  const nowA = clock('2026-11-18T08:00:00Z');
  const nowB = clock('2026-11-18T09:00:00Z');
  const cycle = (store: Store, now: () => string) =>
    syncCollection({ space, collection: 'stock', adapter: storage.adapter, store, now });
  await localChange(a, space.id, 'stock', nowA, () => ({
    put: [{ key: 'carrot', value: { present: true, moreBatches: ['2026-11-01'] } }],
  }));
  await cycle(a, nowA);
  await cycle(b, nowB);
  await act(b, space.id, nowB, (r) => untickEdit(r, 'carrot'));
  await cycle(b, nowB);
  await cycle(a, nowA);
  expect((await liveStock(a, space.id)).carrot).toEqual({
    present: false,
    moreBatches: ['2026-11-01'],
  });
});

test('a change made while a cycle runs is kept and sent with the next cycle', async () => {
  const { space, storage, a, b } = await setUp();
  const nowA = clock('2026-11-18T08:00:00Z');
  const nowB = clock('2026-11-18T09:00:00Z');
  await act(a, space.id, nowA, (r) => addEdit(r, 'u-broth', { preparedOn: '2026-11-10' }));
  // The storage answers the read only after device A added a second batch.
  const slow = {
    ...storage.adapter,
    read: async (path: string) => {
      await act(a, space.id, nowA, (r) => addEdit(r, 'u-broth', { preparedOn: '2026-11-12' }));
      return storage.adapter.read(path);
    },
  };
  const first = await syncCollection({
    space,
    collection: 'stock',
    adapter: slow,
    store: a,
    now: nowA,
  });
  expect(first.ok && first.pending).toBe(true);
  expect(detailsOf((await liveStock(a, space.id))['u-broth'])).toHaveLength(2);
  await syncCollection({
    space,
    collection: 'stock',
    adapter: storage.adapter,
    store: a,
    now: nowA,
  });
  await syncCollection({
    space,
    collection: 'stock',
    adapter: storage.adapter,
    store: b,
    now: nowB,
  });
  expect(detailsOf((await liveStock(b, space.id))['u-broth'])).toHaveLength(2);
  // A removal of one batch on B reaches A too.
  await act(b, space.id, nowB, (r) => removeEdit(r, 'u-broth~1'));
  await syncCollection({
    space,
    collection: 'stock',
    adapter: storage.adapter,
    store: b,
    now: nowB,
  });
  await syncCollection({
    space,
    collection: 'stock',
    adapter: storage.adapter,
    store: a,
    now: nowA,
  });
  expect(await liveStock(a, space.id)).toEqual(await liveStock(b, space.id));
  expect(detailsOf((await liveStock(a, space.id))['u-broth'])).toHaveLength(1);
});
