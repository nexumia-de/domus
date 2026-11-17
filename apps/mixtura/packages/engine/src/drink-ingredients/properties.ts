// The drink domain's inherited properties: ABV, sugar and acid beside the
// general ones, and ABV, sugar and acid of a prepared ingredient computed
// from its spec. The walk itself is general (ingredients/properties.ts).
import { inheritedValue, resolveAllOf } from '../ingredients/properties';
import type { Id, Resolved } from '../ingredients/types';
import type { Ingredient, IngredientTree, InheritedProperty } from './types';

/** ABV, sugar and acid of a prepared ingredient are computed from its spec, never inherited. */
const computedWhenPrepared: readonly InheritedProperty[] = ['abv', 'sugar', 'acid'];

/**
 * Reads a property from the ingredient or its nearest ancestor that has it.
 *
 * @param tree - A validated tree.
 * @param id - Ingredient id.
 * @param property - `role`, `abv` (percent), `sugar` (g per 100 ml), `acid` (percent), `shelfLifeDays` (days) or `substitutionClass`.
 * @returns The value and the id that supplied it, or no value and the reason; never a default.
 */
export function resolveProperty<P extends InheritedProperty>(
  tree: IngredientTree,
  id: Id,
  property: P,
): Resolved<NonNullable<Ingredient[P]>> {
  return inheritedValue(tree, id, property, computedWhenPrepared);
}

export type ResolvedProperties = {
  [P in InheritedProperty]: Resolved<NonNullable<Ingredient[P]>>;
};

/** The names of the properties a child inherits from its ancestors. */
export const INHERITED: readonly InheritedProperty[] = [
  'role',
  'abv',
  'sugar',
  'acid',
  'shelfLifeDays',
  'substitutionClass',
];

/**
 * All inherited properties of one ingredient with their sources.
 *
 * @param tree - A validated tree.
 * @param id - Ingredient id.
 * @returns One `resolveProperty` result per inherited property.
 */
export function resolveAll(tree: IngredientTree, id: Id): ResolvedProperties {
  return resolveAllOf(tree, id, INHERITED, computedWhenPrepared);
}
