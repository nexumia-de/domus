// Reads what a cycle needs from the local store: the place, its records
// (tombstones included) and the custom ingredients.

import type { Place } from '@mixtura/engine';
import type { Ingredient, LocalStore, StockRecord } from '../store';

export interface PlaceSnapshot {
  place: Place;
  rows: StockRecord[];
  ingredients: Ingredient[];
}

/** The snapshot of a place, or undefined when the device does not have it. */
export async function snapshotOf(
  local: LocalStore,
  placeId: string,
): Promise<PlaceSnapshot | undefined> {
  const place = await local.places.get(placeId);
  if (!place) return undefined;
  const [rows, ingredients] = await Promise.all([
    local.stock.listBy('placeId', placeId),
    local.ingredients.list(),
  ]);
  return { place, rows, ingredients };
}
