// Compares the figures of a drink after dilution with the usual range of a
// template. The result is within, below, above or unknown, with the range and
// how well it is known; it never says more than that.
import type { Figure } from '../balance/types';
import type { RangeCheck, RangeFigure, Template } from './types';

/** The figures after dilution that ranges are about (a subset of AfterFigures). */
export interface RangeInput {
  abvPct: Figure;
  sugarPer100Ml: Figure;
  acidPct: Figure;
}

const FIGURES: [RangeFigure, keyof RangeInput][] = [
  ['abv', 'abvPct'],
  ['sugar', 'sugarPer100Ml'],
  ['acid', 'acidPct'],
];

/** Tolerance for decimal ranges such as 25.6 – 27.8 meeting computed values. */
const EPS = 1e-9;

/** Always three entries, in the order abv, sugar, acid. `after` absent means no dilution figures. */
export function checkRange(template: Template, after: RangeInput | undefined): RangeCheck[] {
  return FIGURES.map(([figure, key]): RangeCheck => {
    const range = template.usual?.[figure];
    if (!range) {
      return { figure, status: 'unknown', reason: 'the template has no range for this figure' };
    }
    const base = {
      figure,
      range: { min: range.min, max: range.max },
      evidence: template.usual?.evidence ?? 'unstated',
      sourceName: template.source?.name,
    } as const;
    if (!after) {
      return {
        ...base,
        status: 'unknown',
        reason: 'no figures after dilution (method missing or unknown)',
      };
    }
    const f = after[key];
    if (!f.known) {
      return { ...base, status: 'unknown', reason: f.reason, missingIds: f.missingIds };
    }
    const status =
      f.value < range.min - EPS ? 'below' : f.value > range.max + EPS ? 'above' : 'within';
    return { ...base, status, value: f.value };
  });
}
