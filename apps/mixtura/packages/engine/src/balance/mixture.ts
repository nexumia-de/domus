// The mixing formulas of docs/balance.md (before dilution), shared by
// prepared ingredients and, later, by the balance of a whole spec:
//   V0 = sum v_i; E = sum v_i * a_i / 100; ABV0 = 100 * E / V0;
//   S = sum (v_i * s_i / 100 + m_i); C = sum v_i * c_i / 100;
//   sugar = 100 * S / V0; acid = 100 * C / V0.
// Volumes are additive. Amounts are already in millilitres (and grams
// for solid sugar); unit conversion is not this module's job.
import type { Id } from '../ingredients/types';

export interface MixPart {
  id: Id;
  /** Volume in ml; 0 is allowed for a solid such as granulated sugar. */
  ml: number;
  /** Properties of the part; undefined if unknown (only needed when ml > 0). */
  abv?: number;
  sugar?: number;
  acid?: number;
  /** Solid sugar in g added by this part; adds no volume. */
  sugarG?: number;
}

export type Computed = { value: number } | { value: undefined; reason: string };

export interface MixResult {
  volumeMl: number;
  abv: Computed;
  sugar: Computed;
  acid: Computed;
}

type Concentration = 'abv' | 'sugar' | 'acid';

/** Sum of ml * property / 100 over the parts; the property of every part with volume must be known. */
function weighted(
  parts: readonly MixPart[],
  property: Concentration,
  extra: (p: MixPart) => number,
) {
  const unknown = parts.filter((p) => p.ml > 0 && p[property] === undefined).map((p) => p.id);
  if (unknown.length > 0) return { unknown };
  const total = parts.reduce((sum, p) => sum + (p.ml * (p[property] ?? 0)) / 100 + extra(p), 0);
  return { total };
}

/**
 * Mixes the parts with `waterMl` of water (no ethanol, sugar or acid). The
 * volume is the sum of the parts and the water, or `finalVolumeMl` when the
 * caller knows the real volume (a yield measured after dissolving sugar);
 * the totals of ethanol, sugar and acid are conserved either way.
 */
export function mix(parts: readonly MixPart[], waterMl = 0, finalVolumeMl?: number): MixResult {
  const volumeMl = finalVolumeMl ?? parts.reduce((sum, p) => sum + p.ml, 0) + waterMl;
  const result = (property: Concentration, extra: (p: MixPart) => number): Computed => {
    if (!(volumeMl > 0)) return { value: undefined, reason: 'the mixture has no volume' };
    const w = weighted(parts, property, extra);
    if (w.unknown) {
      return { value: undefined, reason: `${property} unknown for: ${w.unknown.join(', ')}` };
    }
    return { value: (100 * (w.total as number)) / volumeMl };
  };
  return {
    volumeMl,
    abv: result('abv', () => 0),
    sugar: result('sugar', (p) => p.sugarG ?? 0),
    acid: result('acid', () => 0),
  };
}
