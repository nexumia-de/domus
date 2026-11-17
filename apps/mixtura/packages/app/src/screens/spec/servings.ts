// Servings on the spec screen: the number lives in the address
// (`#/drinks/<id>?servings=3`), so it survives a reload and Back; scaling a
// line for display uses the engine's rules (docs/screens-specs.md#servings-and-batch).

import { roundCount, scaleLine, UNITS } from '@mixtura/engine';
import type { Route } from '../../router';
import { formatHash } from '../../router';
import type { SpecLine } from '../browse/types';

export const MIN_SERVINGS = 1;
export const MAX_SERVINGS = 12;

/** The number of drinks in the address, 1 to 12; anything else is 1. */
export function servingsOf(query: URLSearchParams): number {
  const n = Number(query.get('servings'));
  return Number.isInteger(n) && n >= MIN_SERVINGS && n <= MAX_SERVINGS ? n : MIN_SERVINGS;
}

/** The address of this screen with `servings` and the batch sheet set; 1 serving leaves the parameter out. */
export function specAddress(route: Route, servings: number, sheet: string | null): string {
  const query = new URLSearchParams(route.query);
  query.delete('servings');
  query.delete('sheet');
  if (servings !== MIN_SERVINGS) query.set('servings', String(servings));
  if (sheet) query.set('sheet', sheet);
  return formatHash(route.path, query);
}

const COUNTED = new Set<string>(UNITS.filter((u) => u.kind === 'count').map((u) => u.id));

/**
 * A line for `servings` drinks: amounts times N in the stored unit; a counted
 * amount is rounded up to whole units (the engine's batch rule). One serving
 * returns the line unchanged, so `1½ whole` stays as entered.
 */
export function scaledLine(line: SpecLine, servings: number): SpecLine {
  if (servings === 1) return line;
  const one = (amount: number): number => {
    const scaled = scaleLine(
      { ingredientId: line.ingredientId, amount, unit: line.unit },
      servings,
    );
    const value = scaled.ok ? scaled.value.amount : amount * servings;
    return COUNTED.has(line.unit) ? roundCount(value).value : value;
  };
  const out: SpecLine = { ...line, amount: one(line.amount) };
  if (line.amountMax !== undefined) out.amountMax = one(line.amountMax);
  if (line.topMl !== undefined) out.topMl = line.topMl * servings;
  return out;
}
