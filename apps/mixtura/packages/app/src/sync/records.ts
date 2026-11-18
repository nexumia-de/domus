// Stock rows of one place and the custom ingredients they refer to, as the
// records of materia's sync document. Pure. Docs: docs/sync-cycle.md#records.

import { isUserId, type SyncRecord } from '@mixtura/engine';
import type { Ingredient, Stock, StockRecord } from '../store';

const ms = (instant: string): number => Date.parse(instant) || 0;

/** What a stock record carries besides its key and time: the value of a sync record. */
export type StockValue = Omit<Stock, 'placeId' | 'ingredientId' | 'updatedAt'>;

/** One sync record per row; the key is the ingredient id, a tombstone stays one. */
export function rowsToRecords(rows: readonly StockRecord[]): SyncRecord<StockValue>[] {
  return rows.map((row): SyncRecord<StockValue> => {
    if ('deleted' in row) return { key: row.ingredientId, updatedAt: row.updatedAt, deleted: true };
    const { ingredientId, updatedAt } = row;
    const value: StockValue & Partial<Stock> = { ...row };
    delete value.placeId;
    delete value.ingredientId;
    delete value.updatedAt;
    return { key: ingredientId, updatedAt, value };
  });
}

/** The rows of `placeId` for sync records; a record without a value and not deleted is dropped. */
export function recordsToRows(
  placeId: string,
  records: readonly SyncRecord<StockValue>[],
): StockRecord[] {
  const rows: StockRecord[] = [];
  for (const { key, updatedAt, deleted, value } of records) {
    const base = { placeId, ingredientId: key, updatedAt };
    if (deleted) rows.push({ ...base, deleted: true });
    else if (value && typeof value === 'object') rows.push({ ...value, ...base });
  }
  return rows;
}

/**
 * The custom ingredients the live rows refer to, as entity records. Seed
 * ingredients (ids that are not user ids) are not embedded. An ingredient has
 * no change time yet (issue #143), so its `updatedAt` is the newest one of the
 * live rows that refer to it.
 */
export function entityRecords(
  rows: readonly StockRecord[],
  ingredients: readonly Ingredient[],
): SyncRecord<Ingredient>[] {
  const newest = new Map<string, string>();
  for (const row of rows) {
    if ('deleted' in row || !isUserId(row.ingredientId)) continue;
    const seen = newest.get(row.ingredientId);
    if (seen === undefined || ms(row.updatedAt) > ms(seen))
      newest.set(row.ingredientId, row.updatedAt);
  }
  const out: SyncRecord<Ingredient>[] = [];
  for (const ingredient of ingredients) {
    const updatedAt = newest.get(ingredient.id);
    if (updatedAt !== undefined) out.push({ key: ingredient.id, updatedAt, value: ingredient });
  }
  return out;
}

/** The live entity records as ingredients. */
export const entitiesToIngredients = (records: readonly SyncRecord<Ingredient>[]): Ingredient[] =>
  records.flatMap((r) => (!r.deleted && r.value ? [r.value] : []));
