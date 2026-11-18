// Places and which of them count (docs/data-model.md#place, docs/store.md#places).
// Pure: the settings and the stored places in, the selection out.

import type { Place, PlaceSettings } from './types';

/**
 * Name of the place made for existing stock and on a fresh install. The visible
 * string is `strings.places.home` (docs/ui-strings.md); a test keeps them equal.
 */
export const DEFAULT_PLACE_NAME = 'Home';

/** The places that exist, the ones that count and the one new entries go to; ids all exist. */
export interface PlaceSelection {
  places: Place[];
  ticked: string[];
  /** Empty only when no place exists at all (a store that lost its places). */
  entry: string;
}

/**
 * The device setting made consistent with the places that exist: ids of deleted places
 * drop out, no ticked place means the first place, a missing entry place means the first ticked one.
 */
export function resolveSelection(places: readonly Place[], setting: PlaceSettings): PlaceSelection {
  const known = new Set(places.map((p) => p.id));
  let ticked = setting.ticked.filter((id, i, all) => known.has(id) && all.indexOf(id) === i);
  const first = places[0]?.id;
  if (ticked.length === 0 && first !== undefined) ticked = [first];
  const entry = known.has(setting.entry) ? setting.entry : (ticked[0] ?? '');
  return { places: [...places], ticked, entry };
}
