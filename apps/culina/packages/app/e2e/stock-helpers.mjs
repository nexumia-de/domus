// The stock in a browser check: the collection `stock` of the used space in the shared database
// `domus`, read and written through the page's test hook (`?e2e-store`, src/store/e2e-hook.ts), or
// read straight from IndexedDB without any app code.

/** The stored items as the app shows them: `{ id, ref, ...detail }`. */
export const stockItems = (page) => page.evaluate(() => globalThis.__culinaStock.items());

/** The live records of the used space: key to value. */
export const stockRecords = (page) => page.evaluate(() => globalThis.__culinaStock.records());

/** Adds items (`{ ref, key?, ...detail }`) as ticks and batches. */
export const addStock = (page, items) =>
  page.evaluate((list) => globalThis.__culinaStock.add(list), items);

/** Puts records (key to value) as another app would. */
export const putStock = (page, records) =>
  page.evaluate((r) => globalThis.__culinaStock.put(r), records);

/** Every row of the collection `stock` in the database `domus`, read with IndexedDB alone. */
export const domusStock = (page) =>
  page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open('domus');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const all = db.transaction('collections').objectStore('collections').getAll();
          all.onsuccess = () => {
            db.close();
            resolve(all.result.filter((row) => row.name === 'stock'));
          };
          all.onerror = () => reject(all.error);
        };
      }),
  );

/**
 * The ids the app gives to items written in this order: the key of the thing, then `key~1`,
 * `key~2` for its further batches. `keyOf` gives the key of a reference (an ingredient's id).
 */
export const sharedIds = (items, keyOf = (ref) => ref.id) => {
  const seen = new Map();
  return items.map((item) => {
    const key = keyOf(item.ref);
    const n = seen.get(key) ?? 0;
    seen.set(key, n + 1);
    return { ...item, id: n === 0 ? key : `${key}~${n}` };
  });
};
