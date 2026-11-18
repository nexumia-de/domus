// One IndexedDB transaction over the place, its stock and the ingredients, for
// the sync cycle's result (docs/sync-cycle.md#applying-the-result). The caller
// decides what to write from what the transaction reads, so a change made
// while a cycle was in flight is still there when the merge is stored.

import { committed, request } from './db';
import { toStoreError } from './errors';
import type { Ingredient, Place, StockRecord } from './types';

/** What the stores hold, read inside the transaction. */
export interface PlaceContents {
  place: Place | undefined;
  /** Every stock record of the place, tombstones included. */
  stock: StockRecord[];
  /** The ids of every stored ingredient. */
  ingredientIds: ReadonlySet<string>;
}

/** What to put; records not listed stay as they are. */
export interface PlaceWrite {
  place?: Place | undefined;
  stock: StockRecord[];
  ingredients: Ingredient[];
}

/** Reads the place, runs `work` on it and writes its answer, all in one transaction. */
export async function transactPlace(
  db: IDBDatabase,
  placeId: string,
  work: (current: PlaceContents) => PlaceWrite,
): Promise<void> {
  let tx: IDBTransaction | undefined;
  try {
    tx = db.transaction(['places', 'stock', 'ingredients'], 'readwrite');
    const done = committed(tx);
    done.catch(() => undefined);
    const place = (await request(tx.objectStore('places').get(placeId))) as Place | undefined;
    const stock = (await request(
      tx.objectStore('stock').index('placeId').getAll(placeId),
    )) as StockRecord[];
    const keys = (await request(tx.objectStore('ingredients').getAllKeys())) as string[];
    const out = work({ place, stock, ingredientIds: new Set(keys) });
    if (out.place) tx.objectStore('places').put(out.place);
    for (const record of out.stock) tx.objectStore('stock').put(record);
    for (const ingredient of out.ingredients) tx.objectStore('ingredients').put(ingredient);
    await done;
  } catch (error) {
    try {
      tx?.abort();
    } catch {
      // Already finished or aborted.
    }
    throw toStoreError(error);
  }
}
