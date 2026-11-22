// The shared database of the address, from the page: stock is the collection
// `stock` of a space in the database `domus` of the host package
// (packages/host/src/idb-store.ts), not a store of Mixtura's own database.
// The browser scripts read and seed it through these helpers only. The app
// keeps stock in memory: after seeding, reload the page (or open it fresh).
//
// A stock row here is what the app's screens work with, flattened:
// `{ spaceId, ingredientId, updatedAt, present, openedOn?, ... }`, or
// `{ spaceId, ingredientId, updatedAt, deleted: true }` for a removed record.
/* global indexedDB -- in the functions the page runs */

/**
 * The page's side: opens `domus` (made as the host package makes it) and runs `job` in one
 * transaction over both stores.
 */
const runInPage = (job, arg) =>
  new Promise((resolve, reject) => {
    const open = indexedDB.open('domus', 1);
    open.onupgradeneeded = () => {
      const db = open.result;
      if (!db.objectStoreNames.contains('spaces'))
        db.createObjectStore('spaces', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('collections'))
        db.createObjectStore('collections', { keyPath: ['space', 'name'] });
    };
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction(['spaces', 'collections'], 'readwrite');
      let value;
      let failure;
      tx.oncomplete = () => {
        db.close();
        resolve(value);
      };
      tx.onabort = () => {
        db.close();
        reject(failure ?? tx.error ?? new Error('transaction aborted'));
      };
      const tools = {
        spaces: tx.objectStore('spaces'),
        collections: tx.objectStore('collections'),
        done: (v) => (value = v),
        hex: (bytes) =>
          [...crypto.getRandomValues(new Uint8Array(bytes))]
            .map((b) => b.toString(16).padStart(2, '0'))
            .join(''),
        /** The space with this id or name; without one, the only space. */
        pick: (all, which) => {
          if (which === null) {
            if (all.length !== 1) throw new Error(`name the space: there are ${all.length}`);
            return all[0];
          }
          const found = all.find((s) => s.id === which || s.name === which);
          if (!found) throw new Error(`no space ${which}`);
          return found;
        },
      };
      // A throw in the job or in one of its request callbacks aborts the transaction.
      try {
        job(tools, arg);
      } catch (error) {
        failure = error;
        tx.abort();
      }
    };
  });

/**
 * Runs `job(tools, input)` in the page. Both functions go over as source text in one expression:
 * a function does not cross into the page, and the page's Content Security Policy does not
 * apply to what the debugger evaluates.
 */
const inDb = (page, job, input = null) =>
  page.evaluate(`(${runInPage})(${job}, ${JSON.stringify(input)})`);

/** The spaces of the device as stored: `{ id, secret, name?, storage: { type, address } }`. */
export const readSpaces = (page) =>
  inDb(page, ({ spaces, done }) => {
    const all = spaces.getAll();
    all.onsuccess = () => done(all.result);
  });

/**
 * The stock rows of one space (id or name), or of every space without `space`; removed records
 * come as `{ deleted: true }`.
 */
export const readStock = (page, space) =>
  inDb(
    page,
    ({ spaces, collections, done, pick }, which) => {
      const all = spaces.getAll();
      all.onsuccess = () => {
        const only = which === null ? null : pick(all.result, which).id;
        const rows = collections.getAll();
        rows.onsuccess = () =>
          done(
            rows.result
              .filter((c) => c.name === 'stock' && (only === null || c.space === only))
              .flatMap((c) =>
                c.records.map(({ key, updatedAt, deleted, value }) =>
                  deleted
                    ? { spaceId: c.space, ingredientId: key, updatedAt, deleted: true }
                    : { ...value, spaceId: c.space, ingredientId: key, updatedAt },
                ),
              ),
          );
      };
    },
    space ?? null,
  );

/** The ids of the ingredients a space (or any space) has in stock, sorted. */
export const presentIds = async (page, space) =>
  [
    ...new Set(
      (await readStock(page, space)).filter((row) => row.present).map((row) => row.ingredientId),
    ),
  ].sort();

/** Waits until the device has a space; false when none came within `ms`. */
const spaceWithin = async (page, ms) => {
  const until = Date.now() + ms;
  for (;;) {
    if ((await readSpaces(page)).length > 0) return true;
    if (Date.now() >= until) return false;
    await page.waitForTimeout(50);
  }
};

/**
 * Puts stock rows into a space: `{ ingredientId, present, openedOn?, ..., updatedAt? }`, or an
 * ingredient id alone for "in stock". `space` is an id or a name; without it the only space is
 * taken. The app makes its space `Home` on the first read of the stock, so this waits for it;
 * on a screen that does not read the stock pass `make`: after a short wait (the app may be
 * making the space this moment) `Home` is made here, on this device only, as the app would.
 * `replace` empties the space's stock first. Resolves with the space's id.
 */
export const seedStock = async (page, rows, { space, replace = false, make = false } = {}) => {
  const there = await spaceWithin(page, make ? 500 : 15000);
  if (!there && !make) throw new Error('no space: open a screen that reads the stock first');
  return inDb(
    page,
    ({ spaces, collections, done, pick, hex }, { list, which, clear }) => {
      const all = spaces.getAll();
      all.onsuccess = () => {
        let target;
        if (all.result.length === 0 && which === null) {
          target = {
            id: hex(16),
            secret: hex(32),
            name: 'Home',
            storage: { type: 'device', address: '' },
          };
          spaces.put(target);
        } else {
          target = pick(all.result, which);
        }
        const get = collections.get([target.id, 'stock']);
        get.onsuccess = () => {
          const row = get.result ?? { space: target.id, name: 'stock', records: [] };
          const records = new Map(clear ? [] : row.records.map((r) => [r.key, r]));
          for (const item of list) {
            const { ingredientId, updatedAt, ...value } =
              typeof item === 'string' ? { ingredientId: item, present: true } : item;
            delete value.spaceId;
            records.set(ingredientId, {
              key: ingredientId,
              updatedAt: updatedAt ?? '2026-11-18T08:00:00.000Z',
              value,
            });
          }
          collections.put({ ...row, records: [...records.values()] });
          done(target.id);
        };
      };
    },
    { list: rows, which: space ?? null, clear: replace },
  );
};

/**
 * A further space on this device only, as the Household app would make one (the scripts of
 * Mixtura cannot open Household: only Mixtura's build is served). Resolves with its id.
 */
export const addSpace = (page, name, storage = { type: 'device', address: '' }) =>
  inDb(
    page,
    ({ spaces, done, hex }, { spaceName, spaceStorage }) => {
      const space = { id: hex(16), secret: hex(32), name: spaceName, storage: spaceStorage };
      spaces.put(space);
      done(space.id);
    },
    { spaceName: name, spaceStorage: storage },
  );
