// Any unit to ml (volume) or g (mass) and back, with the table of
// data/units.json. Overrides apply only to units the table marks overridable.
import { unitRow, unitValue } from './table';
import { fail, ok } from './types';
import type { Amount, Result, UnitId, UnitKind, UnitOverrides } from './types';

function usable(amount: Amount): Result<number> {
  if (!Number.isFinite(amount.value) || amount.value < 0) {
    return fail('invalid_value', 'An amount must be a finite number of zero or more.');
  }
  return ok(amount.value);
}

/** The amount in the base unit of its kind: ml for volume, g for mass. */
export function toBase(
  amount: Amount,
  overrides?: UnitOverrides,
): Result<{ value: number; kind: Exclude<UnitKind, 'fill'> }> {
  const v = usable(amount);
  if (!v.ok) return v;
  const row = unitRow(amount.unit);
  const per = unitValue(amount.unit, overrides);
  if (row.kind === 'fill' || per === null) {
    return fail('not_measurable', `"${amount.unit}" has no volume of its own.`);
  }
  return ok({ value: v.value * per, kind: row.kind });
}

export function toMl(amount: Amount, overrides?: UnitOverrides): Result<number> {
  const base = toBase(amount, overrides);
  if (!base.ok) return base;
  if (base.value.kind !== 'volume') return fail('not_a_volume', `"${amount.unit}" is a mass.`);
  return ok(base.value.value);
}

export function toGrams(amount: Amount, overrides?: UnitOverrides): Result<number> {
  const base = toBase(amount, overrides);
  if (!base.ok) return base;
  if (base.value.kind !== 'mass') return fail('not_a_mass', `"${amount.unit}" is a volume.`);
  return ok(base.value.value);
}

/** An amount of the base unit (ml or g) expressed in `unit`. */
export function fromBase(base: number, unit: UnitId, overrides?: UnitOverrides): Result<Amount> {
  if (!Number.isFinite(base) || base < 0) {
    return fail('invalid_value', 'An amount must be a finite number of zero or more.');
  }
  const per = unitValue(unit, overrides);
  if (unitRow(unit).kind === 'fill' || per === null) {
    return fail('not_measurable', `"${unit}" has no volume of its own.`);
  }
  return ok({ value: base / per, unit });
}

/** Convert between two units of the same kind (volume to volume, mass to mass). */
export function convert(amount: Amount, to: UnitId, overrides?: UnitOverrides): Result<Amount> {
  const base = toBase(amount, overrides);
  if (!base.ok) return base;
  if (unitRow(to).kind !== base.value.kind) {
    return fail('incompatible_units', `Cannot convert "${amount.unit}" to "${to}".`);
  }
  return fromBase(base.value.value, to, overrides);
}
