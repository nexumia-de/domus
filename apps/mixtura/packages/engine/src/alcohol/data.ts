// The alcohol thresholds of data/alcohol-thresholds.json (docs/non-alcoholic.md).
import raw from '../../data/alcohol-thresholds.json';
import type { AlcoholThresholds } from './types';

interface WithoutPreset {
  id: string;
  maxPct: number;
  bound: 'below' | 'upTo';
}
interface LowPreset {
  id: string;
  maxPct: number;
}
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
