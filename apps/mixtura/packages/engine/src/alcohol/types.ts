// Types of the alcohol module (docs/non-alcoholic.md, docs/engine.md). A class is a
// statement about the computed number, never about the drink's legal status.
import type { Id } from '@nexumia-de/materia';

/** `none` below the "without alcohol" line, `low` up to the low line, `standard` above, `unknown` when the figure is not known. */
export type AlcoholClass = 'none' | 'low' | 'standard' | 'unknown';

/** The two lines, in percent ABV after dilution. */
export interface AlcoholThresholds {
  /** The "without alcohol (calculated)" line. */
  withoutPct: number;
  /** `below`: ABV under the line is `none`; `upTo`: ABV at or under the line is `none` (0 means exactly 0). */
  withoutBound: 'below' | 'upTo';
  /** ABV above the "without" line and at or under this line is `low`. */
  lowPct: number;
}

export type AlcoholUnknownReason =
  'no-dilution' | 'unknown-abv' | 'excluded-line' | 'invalid-thresholds';

export interface AlcoholClassResult {
  class: AlcoholClass;
  /** The ABV after dilution that was classified, when known. */
  abvPct?: number;
  /** Why the class is `unknown`. */
  reason?: AlcoholUnknownReason;
  /** The ingredients that made the figure unknown or that are not counted and may hold ethanol. */
  ids?: Id[];
  /** The thresholds used. */
  thresholds: AlcoholThresholds;
}

/** One selectable line of `data/alcohol-thresholds.json`, with where it comes from. */
export interface AlcoholPreset {
  id: string;
  /** The line in percent ABV after dilution. */
  maxPct: number;
  /** Only for "without alcohol" lines: `below` or `upTo` (0 means exactly 0). */
  bound?: 'below' | 'upTo';
  /** `read`, `secondary`, `derived` or `assumption, unverified`. */
  evidence: string;
  basis: string;
}
