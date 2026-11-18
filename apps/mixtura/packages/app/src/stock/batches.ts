// Batches of prepared ingredients (#101), as data. The stock record keeps
// what the user entered: `openedOn` is the made-on date of the newest batch
// at hand, `moreBatches` the dates of the others (docs/data-model.md#stock).
// Where a batch stands (fresh, use soon, past) is derived from its date, the
// user's shelf life and `today`, which the caller passes in: nothing is stored
// and the engine reads no clock. Pure.

import {
  expiry,
  limitingShelfLife,
  type ExpiryStatus,
  type IngredientTree,
  type PreparedSpec,
} from '@mixtura/engine';
import type { StockFields } from '../store';
import type { StockRecords } from './state';

export type BatchStatus = ExpiryStatus | 'invalid';

export interface Batch {
  madeOn: string;
  status: BatchStatus;
  /** Absent without a shelf life or with a date that is not real. */
  useBy?: string;
  /** Negative when past. */
  daysLeft?: number;
}

/** The made-on dates of the batches at hand, newest first, each once. Nothing when it is not at hand. */
export function batchDates(record: StockFields | undefined): string[] {
  if (!record?.present || !record.openedOn) return [];
  return [...new Set([record.openedOn, ...(record.moreBatches ?? [])])].sort().reverse();
}

/** The record with these batch dates: the newest in `openedOn`, the rest in `moreBatches`. */
export function withBatchDates(record: StockFields, dates: readonly string[]): StockFields {
  const [newest, ...rest] = [...new Set(dates)].sort().reverse();
  const { openedOn: _opened, moreBatches: _more, ...kept } = record;
  void _opened;
  void _more;
  return {
    ...kept,
    present: newest !== undefined,
    ...(newest !== undefined && { openedOn: newest }),
    ...(rest.length > 0 && { moreBatches: rest }),
  };
}

/** A batch made on `date` added; a record that was not at hand starts again with this one. */
export function addBatch(record: StockFields, date: string): StockFields {
  return withBatchDates(record, [...batchDates(record), date]);
}

/** The batch made on `date` taken away (used up); the last one leaves the ingredient not at hand. */
export function removeBatch(record: StockFields, date: string): StockFields {
  return withBatchDates(
    record,
    batchDates(record).filter((d) => d !== date),
  );
}

/** Where each batch stands today, newest first. */
export function batchesOf(
  tree: IngredientTree,
  prepared: ReadonlyMap<string, PreparedSpec>,
  id: string,
  record: StockFields | undefined,
  today: string,
): Batch[] {
  const limit = limitingShelfLife(tree, prepared, id);
  return batchDates(record).map((madeOn) => {
    const e = expiry({
      madeOn,
      today,
      ...(limit.known && { shelfLifeDays: limit.days, limitingId: limit.limitingId }),
    });
    return {
      madeOn,
      status: e.reason === 'invalid-date' ? 'invalid' : e.status,
      ...(e.useBy !== undefined && { useBy: e.useBy }),
      ...(e.daysLeft !== undefined && { daysLeft: e.daysLeft }),
    };
  });
}

export interface NearDate {
  id: string;
  name: string;
  /** The batches that are use soon or past, the one closest to or furthest past its date first. */
  batches: Batch[];
  /** How many batches there are in all. */
  total: number;
}

/** Prepared ingredients at hand with a batch that is use soon or past, the most urgent first. */
export function nearDate(
  tree: IngredientTree,
  prepared: ReadonlyMap<string, PreparedSpec>,
  records: StockRecords,
  today: string,
): NearDate[] {
  const found: NearDate[] = [];
  for (const [id, record] of records) {
    const item = tree.byId.get(id);
    if (!item?.prepared || !record.present) continue;
    const all = batchesOf(tree, prepared, id, record, today);
    const near = all
      .filter((b) => b.status === 'use-soon' || b.status === 'past')
      .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));
    if (near.length > 0) found.push({ id, name: item.name, batches: near, total: all.length });
  }
  return found.sort(
    (a, b) =>
      (a.batches[0]?.daysLeft ?? 0) - (b.batches[0]?.daysLeft ?? 0) || a.name.localeCompare(b.name),
  );
}

/**
 * What "I made this" on the spec screen does: a batch made on `date` is added
 * to the batches at hand; null when that day is already recorded.
 */
export function madeBatch(
  record: StockFields | undefined,
  id: string,
  date: string,
): StockFields | null {
  const base = record ?? { ingredientId: id, present: false };
  return batchDates(base).includes(date) ? null : addBatch(base, date);
}

/**
 * What "Used up" on the spec screen does: the batch the card shows, the
 * newest (`openedOn`), is used up and the card shows the next one. The last
 * batch leaves the ingredient as "Out" with no date.
 */
export function usedUpNewest(record: StockFields | undefined, id: string): StockFields {
  const base = record ?? { ingredientId: id, present: false };
  const [newest] = batchDates(base);
  return newest === undefined ? withBatchDates(base, []) : removeBatch(base, newest);
}
