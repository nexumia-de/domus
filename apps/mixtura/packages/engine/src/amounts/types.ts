// Types shared by the amounts module. Pure data, no behaviour.

/** Ids from packages/engine/data/units.json. */
export type UnitId =
  | 'ml'
  | 'cl'
  | 'oz_us'
  | 'oz_imp'
  | 'tsp'
  | 'tbsp'
  | 'barspoon'
  | 'dash'
  | 'drop'
  | 'splash'
  | 'top'
  | 'g'
  | 'oz_mass';

export type UnitKind = 'volume' | 'mass' | 'fill';

/** What the user entered: an exact value and a unit id. Never rewritten by display. */
export type Amount = { value: number; unit: UnitId };

/** Display system, a setting that only changes how amounts are shown. */
export type DisplaySystem = 'metric' | 'us' | 'imperial';

/** Replacement volumes (ml) for units the table marks overridable. */
export type UnitOverrides = Partial<Record<UnitId, number>>;

export type AmountErrorCode =
  | 'empty'
  | 'no_number'
  | 'zero_denominator'
  | 'negative'
  | 'range'
  | 'exponent'
  | 'separators'
  | 'ambiguous_separator'
  | 'no_unit'
  | 'unknown_unit'
  | 'space_required'
  | 'not_a_volume'
  | 'not_a_mass'
  | 'not_measurable'
  | 'incompatible_units'
  | 'invalid_factor'
  | 'invalid_value';

/** A typed error for user input; the amounts functions never throw for it. */
export type AmountError = { code: AmountErrorCode; message: string };

export type Result<T> = { ok: true; value: T } | { ok: false; error: AmountError };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function fail<T = never>(code: AmountErrorCode, message: string): Result<T> {
  return { ok: false, error: { code, message } };
}
