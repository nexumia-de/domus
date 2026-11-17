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

export function roundingFor(unit: UnitId, value: number, batch = false): Rounding {
  switch (unit) {
    case 'ml':
      // Bar pours: 2.5 ml steps up to 100 ml, 5 ml above, 0.5 ml below 5 ml (docs/units.md#display-and-rounding).
      if (batch) return { steps: value >= 5 ? [1] : [0.5, 0.1, 0.01] };
      return { steps: value >= 100 ? [5] : value >= 5 ? [2.5] : [0.5, 0.1, 0.01] };
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
    case 'whole':
    case 'slice':
    case 'leaf':
    case 'sprig':
    case 'wedge':
    case 'piece':
    case 'pinch':
    case 'cube':
    case 'peel':
    case 'stalk':
    case 'scoop':
    case 'chunk':
    case 'yolk':
    case 'stick':
    case 'bean':
    case 'capsule':
      // A count is shown to the nearest half, never as 0 (docs/units.md#counted-units).
      return { steps: [1 / 2, 1 / 4, 1 / 8], fractional: true };
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
export function roundForDisplay(
  unit: UnitId,
  value: number,
  batch = false,
): { value: number; step: number } {
  const rule = roundingFor(unit, value, batch);
  const last = rule.steps[rule.steps.length - 1] as number;
  if (value <= 0) return { value: 0, step: rule.steps[0] as number };
  if (rule.atLeastOne) return { value: Math.max(1, toStep(value, 1)), step: 1 };
  for (const step of rule.steps) {
    const rounded = toStep(value, step);
    if (rounded > 0) return { value: rounded, step };
  }
  return { value: last, step: last };
}

/** Pour grid per unit: a stored amount on it is shown exactly (docs/units.md#display-and-rounding). */
const EXACT_GRID: Partial<Record<UnitId, number>> = { ml: 0.5, cl: 0.05, g: 0.5 };

/** True when a stored value lies on the unit's pour grid (7.5 ml, 22.5 ml, 4.25 cl). */
export function onPourGrid(unit: UnitId, value: number): boolean {
  const step = EXACT_GRID[unit];
  if (step === undefined || !(value > 0)) return false;
  const k = value / step;
  return Math.abs(k - Math.round(k)) < 1e-7;
}
