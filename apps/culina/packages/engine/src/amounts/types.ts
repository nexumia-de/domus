// Types of the amounts module: units, amounts, per-ingredient facts and the
// error shapes of conversion. Every fallible function returns a result union
// and never throws.

/** A unit id; the same ids as `amountUnit` in `common.schema.json`. */
export type UnitId =
  | 'g'
  | 'kg'
  | 'oz'
  | 'lb'
  | 'ml'
  | 'l'
  | 'tsp'
  | 'tbsp'
  | 'cup'
  | 'imp-floz'
  | 'imp-gill'
  | 'imp-pint'
  | 'imp-quart'
  | 'count';

/** What a unit measures. */
export type UnitKind = 'mass' | 'volume' | 'count';

/** A number and a unit, as stored. */
export interface Amount {
  value: number;
  unit: UnitId;
}

/** What the caller knows about one ingredient; both fields are optional and have no default. */
export interface IngredientFacts {
  /** Grams per millilitre; needed to convert between volume and mass. */
  densityGPerMl?: number;
  /** Grams of one counted piece; needed to convert between count and mass. */
  unitWeightG?: number;
}

/** Why a conversion failed. */
export type ConvertErrorCode =
  'invalid-value' | 'unknown-unit' | 'needs-density' | 'needs-unit-weight' | 'not-convertible';

/** A conversion error with the context that explains it. */
export interface ConvertError {
  code: ConvertErrorCode;
  /** The offending unit text, for `unknown-unit`. */
  unit?: string;
  /** The offending field, for `invalid-value`: `value`, `densityGPerMl` or `unitWeightG`. */
  field?: string;
  /** The facts that are missing, for `not-convertible`. */
  missing?: string[];
}

/** Result of `toGrams`. */
export type GramsResult = { ok: true; g: number } | { ok: false; error: ConvertError };

/** Result of `convert`. */
export type ConvertResult = { ok: true; amount: Amount } | { ok: false; error: ConvertError };

/** Result of `roundMass`. */
export type RoundResult =
  { ok: true; g: number } | { ok: false; error: { code: 'invalid-value' | 'invalid-step' } };
