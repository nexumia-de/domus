// Dilution by method (docs/balance.md, "Dilution model"). The numbers live in
// data/dilution.json and are passed in; no fraction is written in code.
import raw from '../../data/dilution.json';
import type {
  DilutionBound,
  DilutionEvidence,
  DilutionMethod,
  DilutionOptions,
  DilutionTable,
  DilutionUsed,
} from './types';

interface Row {
  id: string;
  fraction_low: number;
  fraction_default: number;
  fraction_high: number;
  evidence: DilutionEvidence;
}

/** The dilution table of data/dilution.json: water added per method as a fraction of the pre-dilution volume (low, default, high) with its evidence. */
export const DILUTION: DilutionTable = (raw as { methods: Row[] }).methods.map(
  (m): DilutionMethod => ({
    id: m.id,
    fractionLow: m.fraction_low,
    fractionDefault: m.fraction_default,
    fractionHigh: m.fraction_high,
    evidence: m.evidence,
  }),
);

export type DilutionChoice =
  | { ok: true; value: DilutionUsed }
  | { ok: false; reason: 'no-method' | 'unknown-method' | 'invalid-fraction' };

/** `derived` and `secondary` rows count as sourced, `assumption` as assumption. */
function basisOf(evidence: DilutionEvidence): 'sourced' | 'assumption' {
  return evidence === 'assumption' ? 'assumption' : 'sourced';
}

/**
 * The dilution fraction for a method, or why there is none.
 *
 * @param method - Method id, or undefined.
 * @param options - Table, bound (`low`, `default`, `high`) or an explicit fraction.
 * @returns Fraction of the pre-dilution volume (0.25 adds a quarter) with its basis and evidence, or the reason.
 */
export function chooseDilution(
  method: string | undefined,
  options: DilutionOptions = {},
): DilutionChoice {
  const bound: DilutionBound = options.bound ?? 'default';
  if (options.fraction !== undefined) {
    if (!Number.isFinite(options.fraction) || options.fraction < 0) {
      return { ok: false, reason: 'invalid-fraction' };
    }
    return {
      ok: true,
      value: { method, fraction: options.fraction, bound, basis: 'override', evidence: 'override' },
    };
  }
  if (method === undefined) return { ok: false, reason: 'no-method' };
  const row = (options.table ?? DILUTION).find((m) => m.id === method);
  if (!row) return { ok: false, reason: 'unknown-method' };
  const fraction =
    bound === 'low' ? row.fractionLow : bound === 'high' ? row.fractionHigh : row.fractionDefault;
  return {
    ok: true,
    value: { method, fraction, bound, basis: basisOf(row.evidence), evidence: row.evidence },
  };
}
