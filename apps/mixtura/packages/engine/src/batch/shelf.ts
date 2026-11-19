// Shelf life of a batch: the minimum of its parts' shelf lives, with the
// ingredient that sets it. Numbers come from the data (`shelfLifeDays`,
// inherited); a part without one makes the whole unknown, never a default.
import { resolveProperty } from '../drink-ingredients/properties';
import type { IngredientTree } from '../drink-ingredients/types';
import type { Id } from '@nexumia-de/materia';
import type { ShelfLife } from './types';

/**
 * The shelf life of a batch: the shortest of its parts.
 *
 * @param tree - A validated tree.
 * @param ids - Ingredient ids of the parts.
 * @returns Days and the limiting ingredient (the first in `ids` on a tie), or unknown with the ids that have none.
 */
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
