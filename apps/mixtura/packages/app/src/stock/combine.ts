// The stock of the ticked spaces as one record per ingredient, the shape every
// screen reads (docs/screens-stock-settings.md#as-built). Pure.

import type { Stock, StockRecord } from '../store';

/** Records of every space, by space id and then ingredient id; tombstones included. */
export type RecordsBySpace = ReadonlyMap<string, ReadonlyMap<string, StockRecord>>;

/**
 * Combines the ticked spaces. An ingredient is present when any ticked space has it present; its record
 * is the one of the first ticked space that has it present (the one with the newest batch date when
 * several do, so a fresh batch is never hidden by an older one), else the first with a live record.
 * Tombstones count as no record. With one ticked space this is that space's live records.
 * @param bySpace Records of every space.
 * @param ticked The spaces that count, in order.
 * @returns One live record per ingredient.
 */
export function combineSpaces(
  bySpace: RecordsBySpace,
  ticked: readonly string[],
): Map<string, Stock> {
  const out = new Map<string, Stock>();
  for (const spaceId of ticked) {
    for (const [id, record] of bySpace.get(spaceId) ?? []) {
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
