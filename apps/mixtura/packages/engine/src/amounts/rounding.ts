// Display rounding per unit (docs/units.md, Display and rounding). A value
// that would round to zero is refined by one step at a time, never shown as 0.
import type { UnitId } from './types';

export type Rounding = {
  /** Rounding steps, coarsest first; later steps are the refinements. */
  steps: number[];
  /** Whole numbers with a floor of 1 (dash, drop, splash, top). */
  atLeastOne?: boolean;
  /** Shown as a mixed number such as 1½ instead of a decimal. */
  fractional?: boolean;
};

export function roundingFor(unit: UnitId, value: number): Rounding {
  switch (unit) {
    case 'ml':
      return { steps: value >= 5 ? [1] : [0.5, 0.1, 0.01] };
    case 'cl':
      return { steps: [0.1, 0.01, 0.001] };
    case 'oz_us':
    case 'oz_imp':
    case 'oz_mass':
      return { steps: value >= 0.5 ? [1 / 4] : [1 / 8, 1 / 16, 1 / 32], fractional: true };
    case 'tsp':
    case 'barspoon':
    case 'tbsp':
      return { steps: [1 / 4, 1 / 8, 1 / 16, 1 / 32], fractional: true };
    case 'g':
      return { steps: value >= 10 ? [1] : [0.1, 0.01] };
    default:
      return { steps: [1], atLeastOne: true };
  }
}

const EPS = 1e-9;

/** Round half up to a step; EPS keeps 0.625 / 0.25 from falling to the low side. */
function toStep(value: number, step: number): number {
  return Math.round(value / step + EPS) * step;
}

/** The rounded value and the step that was used. */
export function roundForDisplay(unit: UnitId, value: number): { value: number; step: number } {
  const rule = roundingFor(unit, value);
  const last = rule.steps[rule.steps.length - 1] as number;
  if (value <= 0) return { value: 0, step: rule.steps[0] as number };
  if (rule.atLeastOne) return { value: Math.max(1, toStep(value, 1)), step: 1 };
  for (const step of rule.steps) {
    const rounded = toStep(value, step);
    if (rounded > 0) return { value: rounded, step };
  }
  return { value: last, step: last };
}
