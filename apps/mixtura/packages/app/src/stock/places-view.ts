// What the Stock screen shows about places, derived from the records of every
// place: the names of the ticked places that have an ingredient present (row
// line) and one block per ticked place (detail sheet). Built on the engine's
// `combinePlaces`, which lists the holders of every key. Pure.

import { combinePlaces, type SyncRecord } from '@mixtura/engine';
import type { Place, Stock, StockFields } from '../store';
import type { RecordsByPlace } from './combine';

/** Where an ingredient stands in one place. */
export type PlaceState = 'in' | 'out' | 'untracked';

export interface PlaceBlock {
  placeId: string;
  name: string;
  state: PlaceState;
  /** The place's own live record, if any. */
  record: Stock | undefined;
}

const fieldsOf = (record: Stock): StockFields => {
  const fields: Partial<Stock> = { ...record };
  delete fields.placeId;
  delete fields.updatedAt;
  return fields as StockFields;
};

/** The records of the ticked places in the shape `combinePlaces` takes; tombstones stay tombstones. */
function asSync(
  byPlace: RecordsByPlace,
  ticked: readonly string[],
): Record<string, SyncRecord<StockFields>[]> {
  const out: Record<string, SyncRecord<StockFields>[]> = {};
  for (const placeId of ticked) {
    out[placeId] = [...(byPlace.get(placeId) ?? [])].map(([key, record]) =>
      'deleted' in record
        ? { key, updatedAt: record.updatedAt, deleted: true as const }
        : { key, updatedAt: record.updatedAt, value: fieldsOf(record) },
    );
  }
  return out;
}

/**
 * For every ingredient that is present in a ticked place: the names of those places, in the order
 * of `ticked`. Empty when fewer than two places count, because one place needs no name on a row.
 */
export function presentAt(
  byPlace: RecordsByPlace,
  ticked: readonly string[],
  places: readonly Place[],
): Map<string, string[]> {
  const out = new Map<string, string[]>();
  if (ticked.length < 2) return out;
  const names = new Map(places.map((p) => [p.id, p.name]));
  for (const entry of combinePlaces(asSync(byPlace, ticked), ticked)) {
    const at = entry.holders
      .filter((h) => h.value.present)
      .map((h) => names.get(h.placeId))
      .filter((n): n is string => n !== undefined);
    if (at.length > 0) out.set(entry.key, at);
  }
  return out;
}

/** One block per ticked place for an ingredient, in the order of `ticked`. */
export function placeBlocks(
  byPlace: RecordsByPlace,
  ticked: readonly string[],
  places: readonly Place[],
  id: string,
): PlaceBlock[] {
  return ticked.flatMap((placeId) => {
    const place = places.find((p) => p.id === placeId);
    if (!place) return [];
    const found = byPlace.get(placeId)?.get(id);
    const record = found && !('deleted' in found) ? found : undefined;
    const state: PlaceState = !record ? 'untracked' : record.present ? 'in' : 'out';
    return [{ placeId, name: place.name, state, record }];
  });
}
