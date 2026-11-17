// Shelf life of a batch: the minimum of its parts' shelf lives, with the
// ingredient that sets it. Numbers come from the data (`shelfLifeDays`,
// inherited); a part without one makes the whole unknown, never a default.
import { resolveProperty } from '../ingredients/properties';
import type { IngredientTree } from '../ingredients/tree';
import type { Id } from '../ingredients/types';
import type { ShelfLife } from './types';

/** On a tie the ingredient that comes first in `ids` is named. */
export function shelfLife(tree: IngredientTree, ids: readonly Id[]): ShelfLife {
  const missing: Id[] = [];
  let best: { days: number; limitingId: Id } | undefined;
  for (const id of new Set(ids)) {
    const r = resolveProperty(tree, id, 'shelfLifeDays');
    if (r.value === undefined) missing.push(id);
    else if (!best || r.value < best.days) best = { days: r.value, limitingId: id };
  }
  if (missing.length > 0 || !best) return { known: false, missingIds: missing };
  return { known: true, ...best };
}
