// The unit table as code: reads data/units.json, which holds every factor.
import table from '../../data/units.json';
import type { UnitId, UnitKind } from './types';

interface UnitEntry {
  kind: UnitKind;
  toBase: number;
  source: string;
}

const units = table as unknown as Record<string, UnitEntry>;

/** Every unit id of the table, in table order. */
export const UNIT_IDS: readonly UnitId[] = Object.keys(units) as UnitId[];

/**
 * Whether a text is a unit id of the table.
 *
 * @param unit - Any value, for example from imported JSON.
 * @returns True when it is one of `UNIT_IDS`.
 */
export function isUnitId(unit: unknown): unit is UnitId {
  return typeof unit === 'string' && Object.prototype.hasOwnProperty.call(units, unit);
}

/**
 * What a unit measures.
 *
 * @param unit - A unit id.
 * @returns `mass`, `volume` or `count`.
 */
export function unitKind(unit: UnitId): UnitKind {
  return (units[unit] as UnitEntry).kind;
}

/**
 * The factor to the base of the unit's kind: grams for mass, millilitres for
 * volume, 1 for count.
 *
 * @param unit - A unit id.
 * @returns How many base units one of `unit` is.
 */
export function unitFactor(unit: UnitId): number {
  return (units[unit] as UnitEntry).toBase;
}
