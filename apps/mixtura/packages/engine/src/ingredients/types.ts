// Types of the ingredient model. They mirror schemas/ingredient.schema.json,
// schemas/prepared-ingredient.schema.json and schemas/common.schema.json;
// test/ingredients-types.test.ts compares the field lists below with the schemas.

export type Id = string;
export type Role =
  'base' | 'modifier' | 'sweet' | 'sour' | 'bitter' | 'accent' | 'texture' | 'lengthener';
export type Level = 'category' | 'type' | 'product';

export interface Quantity {
  amount: number;
  unit: Id;
}

export interface Source {
  name: string;
  licence: string;
  url?: string;
  note?: string;
}

export interface Cost {
  price: number;
  currency: string;
  quantity: Quantity;
}

/** A substitution class is an id; ingredients with the same resolved id can stand in for each other. */
export type SubstitutionClass = Id;

export interface PreparedIngredient {
  specId: Id;
  yield: Quantity;
}

export type InheritedProperty =
  'role' | 'abv' | 'sugar' | 'acid' | 'shelfLifeDays' | 'substitutionClass';

/** What one counted unit of an ingredient holds, as data with its evidence (docs/units.md#counted-units). */
export interface UnitVolume {
  /** Volume in ml of one unit (one whole egg, one slice). */
  ml: number;
  /** `assumption` means no source was read. */
  evidence: 'derived' | 'secondary' | 'assumption';
  /** Where the number comes from; free text. */
  source?: string;
}

export interface Ingredient {
  id: Id;
  name: string;
  level: Level;
  parentId?: Id;
  role?: Role;
  abv?: number;
  sugar?: number;
  acid?: number;
  shelfLifeDays?: number;
  /** How to keep it, in the user's words (a prepared ingredient: "in the fridge, closed"); free text, never read by the engine. */
  storage?: string;
  substitutionClass?: SubstitutionClass;
  cost?: Cost;
  /** Volume of one counted unit by unit id (`whole`, `slice`, ...); never inherited. */
  unitVolumes?: Record<string, UnitVolume>;
  prepared?: PreparedIngredient;
  assumed?: InheritedProperty[];
  source?: Source;
  notes?: string;
}

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
export const PREPARED_FIELDS = [
  'specId',
  'yield',
] as const satisfies readonly (keyof PreparedIngredient)[];
type _AllIngredientFields =
  Exclude<keyof Ingredient, (typeof INGREDIENT_FIELDS)[number]> extends never ? true : never;
type _AllPreparedFields =
  Exclude<keyof PreparedIngredient, (typeof PREPARED_FIELDS)[number]> extends never ? true : never;
export const FIELD_CHECKS: [_AllIngredientFields, _AllPreparedFields] = [true, true];

/** A value with the ingredient that supplied it, or no value and the reason. Never a guess. */
export type Found<T> = { value: T; from: Id };
export type Missing = { value: undefined; reason: string };
export type Resolved<T> = Found<T> | Missing;

export type TreeErrorCode = 'duplicate-id' | 'missing-parent' | 'cycle' | 'level-order';

/** An error that names the ids involved; for a cycle the ids run around it and end with the first. */
export interface TreeError {
  code: TreeErrorCode;
  ids: Id[];
  message: string;
}
