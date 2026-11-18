// The drink shape of the ingredient model: the general ingredient
// (ingredients/types.ts) with ABV, sugar and acid and the drink roles.
// test/ingredients-types.test.ts compares the field lists below with the
// schemas.
import type { IngredientTreeOf, TreeResultOf } from '@nexumia-de/materia';
import { PREPARED_FIELDS, type BaseIngredient, type PreparedIngredient } from '@nexumia-de/materia';

export type Role =
  'base' | 'modifier' | 'sweet' | 'sour' | 'bitter' | 'accent' | 'texture' | 'lengthener';

export type InheritedProperty =
  'role' | 'abv' | 'sugar' | 'acid' | 'shelfLifeDays' | 'substitutionClass';

export interface Ingredient extends BaseIngredient {
  role?: Role;
  abv?: number;
  sugar?: number;
  acid?: number;
  assumed?: InheritedProperty[];
}

export type IngredientTree = IngredientTreeOf<Ingredient>;

export type TreeResult = TreeResultOf<Ingredient>;

// Exhaustive lists of the fields; `satisfies` plus the check types make the
// compiler fail when an interface and its list drift apart.
export const INGREDIENT_FIELDS = [
  'id',
  'name',
  'level',
  'parentId',
  'role',
  'abv',
  'sugar',
  'acid',
  'shelfLifeDays',
  'storage',
  'substitutionClass',
  'cost',
  'unitVolumes',
  'prepared',
  'assumed',
  'source',
  'notes',
] as const satisfies readonly (keyof Ingredient)[];
type _AllIngredientFields =
  Exclude<keyof Ingredient, (typeof INGREDIENT_FIELDS)[number]> extends never ? true : never;
type _AllPreparedFields =
  Exclude<keyof PreparedIngredient, (typeof PREPARED_FIELDS)[number]> extends never ? true : never;
export const FIELD_CHECKS: [_AllIngredientFields, _AllPreparedFields] = [true, true];
