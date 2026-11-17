// Totals of a spec's lines before dilution: volume, ethanol, sugar, acid.
// The arithmetic is mixture.ts; this file only turns its answer into figures.
import { mix, type Computed, type MixPart } from './mixture';
import type { Id } from '../ingredients/types';
import type { UnknownIds } from './lines';
import type { Figure } from './types';

export interface Totals {
  volumeMl: number;
  ethanolMl: Figure;
  sugarG: Figure;
  acidG: Figure;
}

/** A computed value, or unknown with the ids behind it (never a guess). */
export function figureOf(c: Computed, ids: readonly Id[]): Figure {
  if (ids.length > 0) {
    return {
      known: false,
      missingIds: [...ids],
      reason: c.value === undefined ? c.reason : 'a property of these ingredients is unknown',
    };
  }
  return c.value === undefined
    ? { known: false, missingIds: [], reason: c.reason }
    : { known: true, value: c.value };
}

export function volumeOf(parts: readonly MixPart[]): number {
  return parts.reduce((sum, p) => sum + p.ml, 0);
}

export function totals(parts: readonly MixPart[], unknown: UnknownIds): Totals {
  // With the volume fixed at 100 ml a concentration 100 * T / 100 is the
  // total T itself, so totals exist even for a spec without volume.
  const m = mix(parts, 0, 100);
  return {
    volumeMl: volumeOf(parts),
    ethanolMl: figureOf(m.abv, unknown.abv),
    sugarG: figureOf(m.sugar, unknown.sugar),
    acidG: figureOf(m.acid, unknown.acid),
  };
}
