// The alcohol thresholds of data/alcohol-thresholds.json (docs/non-alcoholic.md).
import raw from '../../data/alcohol-thresholds.json';
import type { AlcoholPreset, AlcoholThresholds } from './types';

interface WithoutPreset extends AlcoholPreset {
  bound: 'below' | 'upTo';
}
type LowPreset = AlcoholPreset;
const data = raw as {
  default: { without: string; low: string };
  presets: { without: WithoutPreset[]; low: LowPreset[] };
};

const without = (id: string) => {
  const p = data.presets.without.find((x) => x.id === id);
  if (!p) throw new Error(`alcohol-thresholds.json: no preset ${id}`);
  return p;
};
const low = (id: string) => {
  const p = data.presets.low.find((x) => x.id === id);
  if (!p) throw new Error(`alcohol-thresholds.json: no preset ${id}`);
  return p;
};

/**
 * The default lines of data/alcohol-thresholds.json: ABV after dilution below 0.5 % is `none`, up to 10 % is `low`.
 * Stricter "without" presets (up to 0.05 %, exactly 0) and the low preset up to 1.2 % are in the file; all are adjustable data.
 */
export const ALCOHOL_THRESHOLDS: AlcoholThresholds = {
  withoutPct: without(data.default.without).maxPct,
  withoutBound: without(data.default.without).bound,
  lowPct: low(data.default.low).maxPct,
};

/** The selectable lines with their evidence, and the ids of the defaults (data/alcohol-thresholds.json). */
export const ALCOHOL_PRESETS: {
  readonly without: readonly AlcoholPreset[];
  readonly low: readonly AlcoholPreset[];
  readonly default: { readonly without: string; readonly low: string };
} = { without: data.presets.without, low: data.presets.low, default: data.default };

/**
 * The thresholds for chosen preset ids.
 *
 * @param withoutId - Id of a "without alcohol" preset; an unknown id means the default.
 * @param lowId - Id of a low-ABV preset; an unknown id means the default.
 * @returns The two lines in percent ABV after dilution, ready for `classifyAlcohol`.
 */
export function alcoholThresholds(withoutId?: string, lowId?: string): AlcoholThresholds {
  const w = data.presets.without.find((x) => x.id === withoutId) ?? without(data.default.without);
  const l = data.presets.low.find((x) => x.id === lowId) ?? low(data.default.low);
  return { withoutPct: w.maxPct, withoutBound: w.bound, lowPct: l.maxPct };
}
