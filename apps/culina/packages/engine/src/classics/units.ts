// The size of a source unit word: the engine's unit table first, then the classic's own `units`.
import { isUnitId, unitFactor, unitKind } from '../amounts/units';
import type { UnitKind } from '../amounts/types';
import type { Classic } from './types';

/** What a unit word is worth: its kind and its factor to grams, millilitres or pieces. */
export interface UnitSize {
  kind: UnitKind;
  factor: number;
}

/**
 * Resolves a unit word of a classic's amount.
 *
 * @param word - A unit id of `data/units.json` or a word defined in the classic's `units`.
 * @param classic - The classic whose `units` are read; a word of the table wins.
 * @returns The kind and factor, or `undefined` when the word is in neither.
 */
export function resolveSourceUnit(
  word: string,
  classic: Pick<Classic, 'units'>,
): UnitSize | undefined {
  if (isUnitId(word)) return { kind: unitKind(word), factor: unitFactor(word) };
  const own = Object.prototype.hasOwnProperty.call(classic.units ?? {}, word)
    ? classic.units?.[word]
    : undefined;
  return own === undefined ? undefined : { kind: own.kind, factor: own.factor };
}
