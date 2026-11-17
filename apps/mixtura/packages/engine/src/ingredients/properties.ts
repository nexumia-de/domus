// Resolves inherited properties from the nearest ancestor that defines
// them and reports which ancestor supplied the value (docs/data-model.md,
// "Inheritance"). Missing values come back as undefined plus a reason.
import type { IngredientTree } from './tree';
import type { Found, Id, Ingredient, InheritedProperty, Missing, Resolved } from './types';

/** ABV, sugar and acid of a prepared ingredient are computed from its spec, never inherited. */
const computedWhenPrepared: readonly InheritedProperty[] = ['abv', 'sugar', 'acid'];

export function resolveProperty<P extends InheritedProperty>(
  tree: IngredientTree,
  id: Id,
  property: P,
): Resolved<NonNullable<Ingredient[P]>> {
  let cur: Ingredient | undefined = tree.byId.get(id);
  if (!cur) return { value: undefined, reason: `unknown ingredient ${id}` };
  while (cur) {
    const own = cur[property];
    if (own !== undefined) return { value: own as NonNullable<Ingredient[P]>, from: cur.id };
    if (cur.prepared && computedWhenPrepared.includes(property)) {
      return {
        value: undefined,
        reason: `${cur.id} is a prepared ingredient: its ${property} is computed from its spec`,
      };
    }
    cur = cur.parentId === undefined ? undefined : tree.byId.get(cur.parentId);
  }
  return { value: undefined, reason: `no ancestor of ${id} defines ${property}` };
}

/** The price record of the ingredient itself: cost is never inherited. */
export function resolveCost(
  tree: IngredientTree,
  id: Id,
): Resolved<NonNullable<Ingredient['cost']>> {
  const item = tree.byId.get(id);
  if (!item) return { value: undefined, reason: `unknown ingredient ${id}` };
  if (item.cost) return { value: item.cost, from: id };
  return { value: undefined, reason: `${id} has no cost; cost is not inherited` };
}

export type ResolvedProperties = {
  [P in InheritedProperty]: Resolved<NonNullable<Ingredient[P]>>;
};

export const INHERITED: readonly InheritedProperty[] = [
  'role',
  'abv',
  'sugar',
  'acid',
  'shelfLifeDays',
  'substitutionClass',
];

/** All inherited properties of one ingredient with their sources. */
export function resolveAll(tree: IngredientTree, id: Id): ResolvedProperties {
  const out: Record<string, Found<unknown> | Missing> = {};
  for (const p of INHERITED) out[p] = resolveProperty(tree, id, p);
  return out as ResolvedProperties;
}
