// Bundled by run.mjs for the page: what an app does before sync is set up, so the browser checks
// have a space on this device only (the Household app itself never makes one). It writes to the
// shared database with the host package's own code, as Mixtura does.
import { createIdbStore, ensureSpace, localChange } from '@nexumia-de/hospes';

const withStore = async (work) => {
  const store = createIdbStore();
  try {
    return await work(store);
  } finally {
    store.close();
  }
};

/** A space on this device only with one record in the collection `stock`; returns its id. */
export const deviceOnlySpace = (name) =>
  withStore(async (store) => {
    const [space] = await ensureSpace(store, name);
    await localChange(
      store,
      space.id,
      'stock',
      () => new Date().toISOString(),
      () => ({
        put: [{ key: 'gin', value: { amount: 700 } }],
      }),
    );
    return space.id;
  });

/** The stored space without its secret, and the keys an app keeps in `stock`. */
export const look = (id) =>
  withStore(async (store) => {
    const space = await store.getSpace(id);
    const stock = await store.readCollection(id, 'stock');
    return {
      storage: space?.storage,
      name: space?.name,
      stock: stock.records.filter((r) => r.deleted !== true).map((r) => r.key),
    };
  });
