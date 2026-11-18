// The explicit output step: the only place the engine rounds.
import type { RoundResult } from './types';

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
