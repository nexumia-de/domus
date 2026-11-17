// Substitution classes: ingredients with the same resolved class and the
// same resolved role can stand in for each other by default.
import { resolveProperty } from './properties';
import { ancestors, distance, type IngredientTree } from './tree';
import type { Id } from './types';

/** True if both have a resolved substitution class and it is the same. */
export function sameClass(tree: IngredientTree, a: Id, b: Id): boolean {
  const ca = resolveProperty(tree, a, 'substitutionClass').value;
  const cb = resolveProperty(tree, b, 'substitutionClass').value;
  return ca !== undefined && ca === cb;
}

export interface Substitutes {
  /** Ordered by tree distance, then id. */
  ids: Id[];
  /** Why the list is empty because something is unknown; absent when merely nothing matches. */
  reason?: string;
}

/**
 * Ingredients of the same class and role as `id`, nearest first. The
 * ingredient itself and its ancestors are left out: a more general node
 * (a category) is not something to buy instead. Without a resolved class
 * or role nothing is guessed: the list is empty and says why.
 */
export function substitutesFor(tree: IngredientTree, id: Id): Substitutes {
  if (!tree.byId.has(id)) return { ids: [], reason: `unknown ingredient ${id}` };
  const cls = resolveProperty(tree, id, 'substitutionClass');
  if (cls.value === undefined) return { ids: [], reason: cls.reason };
  const role = resolveProperty(tree, id, 'role');
  if (role.value === undefined) return { ids: [], reason: role.reason };
  const excluded = new Set([id, ...(ancestors(tree, id) ?? [])]);
  const found = tree.ids
    .filter((other) => !excluded.has(other))
    .filter((other) => resolveProperty(tree, other, 'substitutionClass').value === cls.value)
    .filter((other) => resolveProperty(tree, other, 'role').value === role.value)
    .map((other) => ({ other, d: distance(tree, id, other) as number }));
  found.sort((x, y) => x.d - y.d || (x.other < y.other ? -1 : x.other > y.other ? 1 : 0));
  return { ids: found.map((f) => f.other) };
}
