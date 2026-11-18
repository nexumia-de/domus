// Scaling by weight: by factor, to a target total, or from one known line.
// Nothing is rounded here; rounding is the caller's explicit output step.
import { toGrams } from '../amounts/convert';
import type { Amount } from '../amounts/types';
import { cautionsFor } from './cautions';
import type {
  FactsById,
  ScalableLine,
  ScaleError,
  ScaleErrorCode,
  ScaleOptions,
  ScaleResult,
  UnscaledLine,
} from './types';

const positive = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;

type Fail = { ok: false; error: ScaleError };

const fail = (code: ScaleErrorCode, lineId?: string): Fail => ({
  ok: false,
  error: lineId === undefined ? { code } : { code, lineId },
});

/** Grams of a line's amount, or the error that names the line. */
function lineGrams(line: ScalableLine, facts: FactsById): { ok: true; g: number } | Fail {
  const amount = line.amount;
  if (amount === undefined) return fail('no-amount', line.id);
  if (amount.unit === 'percent') return fail('percent-line', line.id);
  const grams = toGrams(amount, facts[line.id]);
  if (grams.ok) return grams;
  return { ok: false, error: { code: 'cannot-convert', lineId: line.id, cause: grams.error } };
}

/**
 * Multiplies every measured amount by a factor, in its own unit. Percent
 * lines and lines without an amount are returned unchanged and listed in
 * `unscaled`. Cautions: `time-not-linear` whenever the factor is not 1,
 * `salt-not-linear` as well when a line has a salt role.
 *
 * @param lines - The lines to scale.
 * @param factor - Finite and greater than 0.
 * @param options - `saltRoles`, default `['salt']`.
 * @returns The scaled lines with factor, unscaled ids and cautions, or `invalid-factor` or `invalid-value` (an amount that is not finite and positive, or a result that overflows) with the line id.
 */
export function scaleByFactor(
  lines: readonly ScalableLine[],
  factor: number,
  options: ScaleOptions = {},
): ScaleResult {
  if (!positive(factor)) return fail('invalid-factor');
  const unscaled: UnscaledLine[] = [];
  const out: ScalableLine[] = [];
  for (const line of lines) {
    const amount = line.amount;
    if (amount === undefined) {
      unscaled.push({ id: line.id, reason: 'no-amount' });
      out.push(line);
    } else if (amount.unit === 'percent') {
      unscaled.push({ id: line.id, reason: 'percent' });
      out.push(line);
    } else {
      const value = amount.value * factor;
      if (!positive(amount.value) || !Number.isFinite(value)) return fail('invalid-value', line.id);
      out.push({ ...line, amount: { ...amount, value } });
    }
  }
  const cautions = cautionsFor(factor, out, options.saltRoles);
  return { ok: true, factor, lines: out, unscaled, cautions };
}

/**
 * Scales so that the measured lines add up to a target mass. Every amount is
 * converted to grams (volume and count lines need their facts); lines without
 * an amount are skipped and listed in `unscaled`.
 *
 * @param lines - The lines to scale.
 * @param targetG - The wanted total in grams; finite and greater than 0.
 * @param factsById - Facts per line id.
 * @param options - `saltRoles`, default `['salt']`.
 * @returns As `scaleByFactor`, or `invalid-target`, `zero-total` (no measured line), `percent-line` or `cannot-convert`, the last two with the line id.
 */
export function scaleToTotal(
  lines: readonly ScalableLine[],
  targetG: number,
  factsById: FactsById = {},
  options: ScaleOptions = {},
): ScaleResult {
  if (!positive(targetG)) return fail('invalid-target');
  let total = 0;
  for (const line of lines) {
    if (line.amount === undefined) continue;
    const grams = lineGrams(line, factsById);
    if (!grams.ok) return grams;
    total += grams.g;
  }
  if (total === 0) return fail('zero-total');
  return scaleByFactor(lines, targetG / total, options);
}

/**
 * Scales so that one line has the amount the cook has ("I have 300 g of
 * butter"). When `have` is in the line's own unit the plain ratio of values
 * is used and no facts are needed; otherwise both go through grams.
 *
 * @param lines - The lines to scale.
 * @param lineId - The line the cook has an amount of.
 * @param have - What the cook has.
 * @param factsById - Facts per line id.
 * @param options - `saltRoles`, default `['salt']`.
 * @returns As `scaleByFactor`, or `unknown-line`, `no-amount`, `percent-line`, `invalid-value` or `cannot-convert`, each with the line id.
 */
export function scaleFromLine(
  lines: readonly ScalableLine[],
  lineId: string,
  have: Amount,
  factsById: FactsById = {},
  options: ScaleOptions = {},
): ScaleResult {
  const line = lines.find((l) => l.id === lineId);
  if (line === undefined) return fail('unknown-line', lineId);
  const amount = line.amount;
  if (amount === undefined) return fail('no-amount', lineId);
  if (amount.unit === 'percent') return fail('percent-line', lineId);
  if (!positive(amount.value) || !positive(have.value)) return fail('invalid-value', lineId);
  if (amount.unit === have.unit) return scaleByFactor(lines, have.value / amount.value, options);
  const facts = factsById[lineId];
  const wanted = toGrams(have, facts);
  const current = toGrams(amount, facts);
  if (!wanted.ok)
    return { ok: false, error: { code: 'cannot-convert', lineId, cause: wanted.error } };
  if (!current.ok)
    return { ok: false, error: { code: 'cannot-convert', lineId, cause: current.error } };
  return scaleByFactor(lines, wanted.g / current.g, options);
}
