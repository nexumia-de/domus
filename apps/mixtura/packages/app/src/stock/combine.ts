// The stock of the ticked places as one record per ingredient, the shape every
// screen reads (docs/screens-stock-settings.md#as-built). Pure.

import type { Stock, StockRecord } from '../store';

/** Records of every place, by place id and then ingredient id; tombstones included. */
export type RecordsByPlace = ReadonlyMap<string, ReadonlyMap<string, StockRecord>>;

/**
 * Combines the ticked places. An ingredient is present when any ticked place has it present; its record
 * is the one of the first ticked place that has it present (the one with the newest batch date when
 * several do, so a fresh batch is never hidden by an older one), else the first with a live record.
 * Tombstones count as no record. With one ticked place this is that place's live records.
 * @param byPlace Records of every place.
 * @param ticked The places that count, in order.
 * @returns One live record per ingredient.
 */
export function combinePlaces(
  byPlace: RecordsByPlace,
  ticked: readonly string[],
): Map<string, Stock> {
  const out = new Map<string, Stock>();
  for (const placeId of ticked) {
    for (const [id, record] of byPlace.get(placeId) ?? []) {
      if ('deleted' in record) continue;
      const chosen = out.get(id);
      const fresher =
        chosen?.present === true &&
        record.present &&
        (record.openedOn ?? '') > (chosen.openedOn ?? '');
      if (!chosen || (!chosen.present && record.present) || fresher) out.set(id, record);
    }
  }
  return out;
}
