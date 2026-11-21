// The explicit output step: the only place the engine rounds.
import type { RoundResult, UnitId } from './types';
import { unitFactor } from './units';

/**
 * Default display step in grams: 0.1 g below 10 g, otherwise 1 g.
 * Assumption, unverified: household scales read 1 g and precision scales
 * 0.1 g; no source. The caller may pass its own step to `roundMass`.
 *
 * @param g - A mass in grams (the sign is ignored).
 * @returns 0.1 when |g| is below 10, otherwise 1.
 */
export function displayStep(g: number): number {
  return Math.abs(g) < 10 ? 0.1 : 1;
}

/** Trims binary noise: 15 significant digits are kept. */
const clean = (n: number): number => Number(n.toPrecision(15));

/**
 * Rounds a mass to the nearest multiple of a step, halves away from zero.
 * Method: x / step is trimmed to 12 significant digits first, so a value
 * that is a tie as a decimal (2.675 at step 0.01) is treated as a tie and
 * not pushed below it by binary representation; the multiple is then
 * trimmed to 15 digits so 27 * 0.1 gives 2.7.
 *
 * @param g - The mass in grams; finite, any sign.
 * @param stepG - The step in grams; finite, greater than 0.
 * @returns The rounded grams, or `invalid-value` or `invalid-step`.
 */
export function roundMass(g: number, stepG: number): RoundResult {
  if (!Number.isFinite(g)) return { ok: false, error: { code: 'invalid-value' } };
  if (!Number.isFinite(stepG) || stepG <= 0) return { ok: false, error: { code: 'invalid-step' } };
  const ratio = Number((Math.abs(g) / stepG).toPrecision(12));
  const steps = Math.floor(ratio + 0.5);
  if (!Number.isFinite(steps)) return { ok: false, error: { code: 'invalid-value' } };
  const value = clean(steps * stepG);
  return { ok: true, g: g < 0 && value !== 0 ? -value : value };
}

/** The household measures a volume is shown in where the source wrote one: spoons and the cup. */
export const HOUSEHOLD_MEASURES = ['tsp', 'tbsp', 'cup'] as const satisfies readonly UnitId[];
export type HouseholdMeasure = (typeof HOUSEHOLD_MEASURES)[number];

/**
 * Display step of a piece count: a half. Assumption, unverified: a cook takes whole pieces or
 * halves (an egg, an onion); no source.
 */
export const PIECE_STEP = 0.5;

/**
 * Display step of a household measure: a quarter. Assumption, unverified: measuring spoons and
 * cups are sold in quarters, halves and wholes; no source.
 */
export const MEASURE_STEP = 0.25;

/** A number rounded for display, and whether it equals the exact one (to a relative 1e-8). */
export type ShownNumberResult =
  { ok: true; value: number; exact: boolean } | { ok: false; error: { code: 'invalid-value' } };

/** To the nearest multiple of `step`, ties away from zero, never below one step. */
function roundAtLeastStep(n: number, step: number): ShownNumberResult {
  if (!Number.isFinite(n) || n <= 0) return { ok: false, error: { code: 'invalid-value' } };
  const rounded = roundMass(n, step);
  if (!rounded.ok) return { ok: false, error: { code: 'invalid-value' } };
  const value = Math.max(rounded.g, step);
  // A derived amount carries 10 significant digits, so a difference below a relative 1e-8 is noise.
  return { ok: true, value, exact: Math.abs(n - value) <= 1e-8 * value };
}

/**
 * A piece count as shown: to the nearest half, at least a half. Only what is shown changes; the
 * caller keeps the exact count for sums and shows it quietly beside where `exact` is false.
 *
 * @param count - Pieces, finite and greater than 0.
 * @returns The shown count and whether it equals `count`; or `invalid-value`.
 */
export function roundPieces(count: number): ShownNumberResult {
  return roundAtLeastStep(count, PIECE_STEP);
}

/**
 * A volume as shown in a household measure: millilitres over the measure's size in the unit
 * table, to the nearest quarter, at least a quarter. Only what is shown changes.
 *
 * @param ml - The volume in millilitres, finite and greater than 0.
 * @param measure - `tsp`, `tbsp` or `cup`.
 * @returns The number of measures shown and whether it equals the exact number; or `invalid-value`.
 */
export function roundMeasure(ml: number, measure: HouseholdMeasure): ShownNumberResult {
  if (!HOUSEHOLD_MEASURES.includes(measure)) return { ok: false, error: { code: 'invalid-value' } };
  return roundAtLeastStep(ml / unitFactor(measure), MEASURE_STEP);
}

/**
 * The household measure of a size: the one whose size in the unit table equals `ml` (to 10
 * significant digits), so a source's "tablespoonful" taken as the US tablespoon is a `tbsp`.
 *
 * @param ml - Millilitres in one unit of a source's word.
 * @returns `tsp`, `tbsp`, `cup` or `undefined`.
 */
export function householdMeasureOf(ml: number): HouseholdMeasure | undefined {
  const same = (a: number, b: number): boolean =>
    Number(a.toPrecision(10)) === Number(b.toPrecision(10));
  return HOUSEHOLD_MEASURES.find((m) => same(unitFactor(m), ml));
}
