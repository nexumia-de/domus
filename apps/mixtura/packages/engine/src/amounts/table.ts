// The unit table, read from data/units.json. The only place that knows the
// JSON layout; every other file asks this one.
import raw from '../../data/units.json';
import type { UnitId, UnitKind, UnitOverrides } from './types';

export type UnitRow = {
  id: UnitId;
  symbols: string[];
  kind: UnitKind;
  value: number | null;
  status: 'exact' | 'convention';
  overridable: boolean;
};

/** The unit table of data/units.json: id, symbols, kind, size in ml or g, status and evidence of each unit. */
export const UNITS: readonly UnitRow[] = (raw as { units: UnitRow[] }).units;

const byId = new Map<UnitId, UnitRow>(UNITS.map((u) => [u.id, u]));

export function unitRow(id: UnitId): UnitRow {
  const row = byId.get(id);
  if (!row) throw new Error(`unit id not in units.json: ${id}`);
  return row;
}

/**
 * The size of one unit.
 *
 * @param id - Unit id.
 * @param overrides - Replacement ml per unit for overridable convention units.
 * @returns ml (volume unit) or g (mass unit) per one unit; null for a fill unit such as `top` or a counted unit such as `slice`.
 */
export function unitValue(id: UnitId, overrides?: UnitOverrides): number | null {
  const row = unitRow(id);
  const o = overrides?.[id];
  if (row.overridable && typeof o === 'number' && Number.isFinite(o) && o > 0) return o;
  return row.value;
}

/**
 * True when balance must flag the figure as estimated: a convention volume.
 *
 * @param id - Unit id.
 * @returns Whether the unit's volume is a convention (dash, teaspoon) rather than exact.
 */
export function isEstimatedUnit(id: UnitId): boolean {
  const row = unitRow(id);
  return row.kind === 'volume' && row.status === 'convention';
}
