// Where the stock is kept: the collection `stock` of every space, in the
// database the apps on the address share (host package). This file is the
// only one that knows that shape; the screens work with rows of a space
// (docs/data-model.md#stock, docs/store.md#stock-in-a-space).

import {
  ensureSpace,
  isDeviceOnly,
  localChange,
  type Store as SharedStore,
  type StoredSpace,
} from '@nexumia-de/hospes';
import type { SyncRecord } from '@mixtura/engine';
import type { Space, Stock, StockRecord } from '../store';
import { isStockValue } from '../store/validate';

/** The name of the collection; one per space, whichever app writes it. */
export const STOCK_COLLECTION = 'stock';

/** A space as the screens need it; a space without a name gets `unnamed`. */
export const spaceOf = (stored: StoredSpace, unnamed: string): Space => ({
  id: stored.id,
  name: stored.name?.trim() || unnamed,
  deviceOnly: isDeviceOnly(stored),
});

/**
 * The rows of one space for the records of its collection. The collection is shared and may come
 * from another device, so it is not trusted: a record whose value is no stock value is left out
 * (it stays in the collection untouched). A value keeps the fields this app does not know.
 */
export function rowsOf(spaceId: string, records: readonly SyncRecord[]): StockRecord[] {
  const rows: StockRecord[] = [];
  for (const { key, updatedAt, deleted, value } of records) {
    const base = { spaceId, ingredientId: key, updatedAt };
    if (deleted) rows.push({ ...base, deleted: true });
    else if (isStockValue(value)) rows.push({ ...(value as object), ...base } as Stock);
  }
  return rows;
}

/** What the collection keeps of a live row: everything but the key and the stamp. */
export function valueOf(row: Stock): Record<string, unknown> {
  const value: Record<string, unknown> = { ...row };
  delete value['spaceId'];
  delete value['ingredientId'];
  delete value['updatedAt'];
  return value;
}

/** The fields of a stock value this app reads and writes; every other field is another app's. */
const OWN_FIELDS = new Set(['present', 'openedOn', 'moreBatches', 'bestBefore', 'note']);

/**
 * The value to store for a mark: what this app knows comes from the mark, every other field
 * from the record as it is stored now. The screens hold the record of their last read, and a
 * field another app wrote since then must not be overwritten with the older copy.
 */
function withForeignFields(
  value: Record<string, unknown>,
  stored: readonly SyncRecord[],
  key: string,
): Record<string, unknown> {
  const current = stored.find((r) => r.key === key && r.deleted !== true)?.value;
  const out: Record<string, unknown> = {};
  for (const [field, v] of Object.entries(value)) if (OWN_FIELDS.has(field)) out[field] = v;
  if (current !== null && typeof current === 'object') {
    for (const [field, v] of Object.entries(current)) if (!OWN_FIELDS.has(field)) out[field] = v;
  } else {
    for (const [field, v] of Object.entries(value)) if (!OWN_FIELDS.has(field)) out[field] = v;
  }
  return out;
}

export interface StockData {
  spaces: Space[];
  rows: StockRecord[];
}

/**
 * Every space of the device with its stock rows. A device without a space gets one that is on
 * this device only, named `names.home`, so there is always a space to put stock in.
 */
export async function loadStock(
  shared: SharedStore,
  names: { home: string; unnamed: string },
): Promise<StockData> {
  const stored = await ensureSpace(shared, names.home);
  const rows: StockRecord[] = [];
  for (const space of stored) {
    const state = await shared.readCollection(space.id, STOCK_COLLECTION);
    rows.push(...rowsOf(space.id, state.records));
  }
  return { spaces: stored.map((s) => spaceOf(s, names.unnamed)), rows };
}

/**
 * Writes changed rows into their spaces' collections, one atomic change per space. A live row is
 * put, a tombstone removes the record. The stamp is the collection's (`localChange`): later than
 * every record in it, even when the device clock is behind.
 */
export async function writeStock(
  shared: SharedStore,
  records: readonly StockRecord[],
  now: () => string,
): Promise<void> {
  const bySpace = new Map<string, StockRecord[]>();
  for (const record of records) {
    bySpace.set(record.spaceId, [...(bySpace.get(record.spaceId) ?? []), record]);
  }
  for (const [spaceId, list] of bySpace) {
    await localChange(shared, spaceId, STOCK_COLLECTION, now, (stored) => ({
      put: list.flatMap((r) =>
        'deleted' in r
          ? []
          : [{ key: r.ingredientId, value: withForeignFields(valueOf(r), stored, r.ingredientId) }],
      ),
      remove: list.flatMap((r) => ('deleted' in r ? [r.ingredientId] : [])),
    }));
  }
}
