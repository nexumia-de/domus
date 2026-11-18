// Conversion between units. Mass and volume units convert among themselves
// exactly by the table; crossing kinds needs the ingredient's own facts and
// without them the answer is an error, never a guess.
import type {
  Amount,
  ConvertError,
  ConvertResult,
  GramsResult,
  IngredientFacts,
  UnitId,
  UnitKind,
} from './types';
import { isUnitId, unitFactor, unitKind } from './units';

const positive = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;

function check(amount: Amount): ConvertError | undefined {
  if (!positive(amount.value)) return { code: 'invalid-value', field: 'value' };
  if (!isUnitId(amount.unit)) return { code: 'unknown-unit', unit: String(amount.unit) };
  return undefined;
}

function checkFacts(facts: IngredientFacts | undefined): ConvertError | undefined {
  if (facts?.densityGPerMl !== undefined && !positive(facts.densityGPerMl)) {
    return { code: 'invalid-value', field: 'densityGPerMl' };
  }
  if (facts?.unitWeightG !== undefined && !positive(facts.unitWeightG)) {
    return { code: 'invalid-value', field: 'unitWeightG' };
  }
  return undefined;
}

/** The facts a crossing needs, as field names. */
function needed(from: UnitKind, to: UnitKind): ('densityGPerMl' | 'unitWeightG')[] {
  const kinds = new Set([from, to]);
  const out: ('densityGPerMl' | 'unitWeightG')[] = [];
  if (kinds.has('volume')) out.push('densityGPerMl');
  if (kinds.has('count')) out.push('unitWeightG');
  return out;
}

function missingError(
  from: UnitKind,
  to: UnitKind,
  facts?: IngredientFacts,
): ConvertError | undefined {
  const missing = needed(from, to).filter((f) => facts?.[f] === undefined);
  if (missing.length === 0) return undefined;
  if (missing.length > 1) return { code: 'not-convertible', missing };
  return missing[0] === 'densityGPerMl' ? { code: 'needs-density' } : { code: 'needs-unit-weight' };
}

/** Grams of a checked amount; the facts it needs must be present. */
function gramsOf(amount: Amount, facts?: IngredientFacts): number {
  const kind = unitKind(amount.unit);
  const base = amount.value * unitFactor(amount.unit);
  if (kind === 'mass') return base;
  if (kind === 'volume') return base * (facts?.densityGPerMl as number);
  return base * (facts?.unitWeightG as number);
}

/** Inverse of `gramsOf` for a target unit. */
function fromGrams(g: number, unit: UnitId, facts?: IngredientFacts): number {
  const kind = unitKind(unit);
  if (kind === 'mass') return g / unitFactor(unit);
  if (kind === 'volume') return g / (facts?.densityGPerMl as number) / unitFactor(unit);
  return g / (facts?.unitWeightG as number) / unitFactor(unit);
}

/**
 * An amount in grams. Volume needs `densityGPerMl`, count needs `unitWeightG`.
 *
 * @param amount - Value (finite, greater than 0) and unit id.
 * @param facts - What is known about the ingredient; no defaults exist.
 * @returns The grams, or `invalid-value`, `unknown-unit`, `needs-density`, `needs-unit-weight`.
 */
export function toGrams(amount: Amount, facts?: IngredientFacts): GramsResult {
  const error = check(amount) ?? checkFacts(facts);
  if (error) return { ok: false, error };
  const kind = unitKind(amount.unit);
  const missing = kind === 'mass' ? undefined : missingError(kind, 'mass', facts);
  if (missing) return { ok: false, error: missing };
  return { ok: true, g: gramsOf(amount, facts) };
}

/**
 * An amount in another unit. Within one kind (mass, volume, count) the table
 * alone decides. Mass and volume need the density, mass and count the unit
 * weight, volume and count both (the way goes through mass); a missing single
 * fact is `needs-density` or `needs-unit-weight`, missing both `not-convertible`.
 *
 * @param amount - Value (finite, greater than 0) and unit id.
 * @param toUnit - The unit wanted.
 * @param facts - What is known about the ingredient; no defaults exist.
 * @returns The converted amount (unrounded), or an error with its code.
 */
export function convert(amount: Amount, toUnit: UnitId, facts?: IngredientFacts): ConvertResult {
  const error =
    check(amount) ??
    (isUnitId(toUnit) ? undefined : { code: 'unknown-unit' as const, unit: String(toUnit) }) ??
    checkFacts(facts);
  if (error) return { ok: false, error };
  const from = unitKind(amount.unit);
  const to = unitKind(toUnit);
  if (from === to) {
    const value = (amount.value * unitFactor(amount.unit)) / unitFactor(toUnit);
    return { ok: true, amount: { value, unit: toUnit } };
  }
  const missing = missingError(from, to, facts);
  if (missing) return { ok: false, error: missing };
  const value = fromGrams(gramsOf(amount, facts), toUnit, facts);
  return { ok: true, amount: { value, unit: toUnit } };
}
