import type { ComponentRef } from '@culina/engine';
import { createIdbStore, localChange } from '@nexumia-de/hospes';
import { resolveStockKey, stockKeyOf } from '../notebook/stock';
import { state } from '../notebook/state';
import { addEdit } from '../shared-stock/edits';
import { itemsOf, STOCK, type Detail } from '../shared-stock/value';
import { e2eNow } from './e2e-clock';
import { openStore } from './index';

/**
 * Test hook for the browser test: only loaded when the page URL has `?e2e-store`. It exposes
 * a second handle to the store as a promise on `globalThis.__culinaStore`, so the browser tests can read and write records directly,
 * and `globalThis.__culinaStock` for the stock, which is the collection `stock` of the used space in
 * the shared database `domus`, read and written through a handle of its own.
 * Inert otherwise; it makes no network request.
 */
const now = e2eNow(globalThis.location.search) ?? (() => new Date().toISOString());
(globalThis as Record<string, unknown>).__culinaStore = openStore({ now });

const shared = createIdbStore();

/** The id of the used space, once the app has read the stock. */
const usedSpace = async (): Promise<string> => {
  for (let i = 0; i < 200; i++) {
    const id = state.stockSpace?.state().space?.id;
    if (id !== undefined) return id;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error('no stock space');
};

const live = async (): Promise<{ key: string; value: unknown }[]> => {
  const { records } = await shared.readCollection(await usedSpace(), STOCK);
  return records.flatMap((r) => (r.deleted === true ? [] : [{ key: r.key, value: r.value }]));
};

(globalThis as Record<string, unknown>).__culinaStock = {
  /** The stored items as Culina shows them, read from the shared database. */
  items: async () =>
    (await live()).flatMap(({ key, value }) => {
      const ref = resolveStockKey(key);
      return ref === undefined ? [] : itemsOf(key, ref, value);
    }),
  /** The live records of the used space: key to value. */
  records: async () => Object.fromEntries((await live()).map((r) => [r.key, r.value])),
  /**
   * Adds items (`ref` and detail) as a person would, one after the other. `key` names the record
   * when the notebook of this page does not know the thing yet (a component written just now).
   */
  add: async (items: (Detail & { ref: ComponentRef; key?: string })[]) => {
    const id = await usedSpace();
    for (const { ref, key, ...detail } of items) {
      const at = key ?? stockKeyOf(ref);
      await localChange(shared, id, STOCK, now, (records) => addEdit(records, at, detail).edit);
    }
  },
  /** Puts records as another app would write them. */
  put: async (records: Record<string, unknown>) => {
    const id = await usedSpace();
    await localChange(shared, id, STOCK, now, () => ({
      put: Object.entries(records).map(([key, value]) => ({ key, value })),
    }));
  },
};
