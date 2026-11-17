// Types of the balance module (docs/balance.md). Every figure is a number or
// an explicit "unknown" with the ingredient ids that prevented it; nothing is
// defaulted and nothing is a verdict.
import type { Id } from '../ingredients/types';

export type Figure<T = number> =
  { known: true; value: T } | { known: false; missingIds: Id[]; reason: string };

/** A spec line as balance reads it: a subset of the Spec line of the data model. */
export interface BalanceLine {
  ingredientId: Id;
  amount: number;
  /** Unit id from units.json. */
  unit: string;
  /**
   * Volume in ml of a `top` line ("top 90 ml"). The spec schema has no such
   * field yet; without it a `top` line is excluded and the figures say so.
   */
  topMl?: number;
}

export interface BalanceSpec {
  /** Method id; absent gives figures before dilution only. */
  method?: string;
  lines: readonly BalanceLine[];
}

export type DilutionBound = 'low' | 'default' | 'high';
export type DilutionEvidence = 'derived' | 'secondary' | 'assumption';

/** One row of data/dilution.json, in camel case. */
export interface DilutionMethod {
  id: string;
  fractionLow: number;
  fractionDefault: number;
  fractionHigh: number;
  evidence: DilutionEvidence;
}
export type DilutionTable = readonly DilutionMethod[];

export interface DilutionOptions {
  /** Replaces data/dilution.json as the source of the parameters. */
  table?: DilutionTable;
  /** Which end of the method's range to use; default `default`. */
  bound?: DilutionBound;
  /** An explicit fraction (a spec's own dilution); wins over method and table. */
  fraction?: number;
}

/** What dilution was applied. `basis` is `override` for an explicit fraction. */
export interface DilutionUsed {
  method?: string;
  fraction: number;
  bound: DilutionBound;
  basis: 'sourced' | 'assumption' | 'override';
  evidence: DilutionEvidence | 'override';
}

export interface Excluded {
  ingredientId: Id;
  reason: 'top-without-volume';
}

export interface BeforeFigures {
  volumeMl: number;
  ethanolMl: Figure;
  abvPct: Figure;
  sugarG: Figure;
  sugarPer100Ml: Figure;
  acidG: Figure;
  acidPct: Figure;
}

export interface AfterFigures {
  volumeMl: number;
  waterMl: number;
  abvPct: Figure;
  sugarPer100Ml: Figure;
  acidPct: Figure;
}

export interface BalanceFigures {
  method?: string;
  dilution?: DilutionUsed;
  /** Why there are no figures after dilution; absent when there are. */
  dilutionUnavailable?: 'no-method' | 'unknown-method';
  /** True if a convention unit (dash, tsp, ...) was counted with its table volume. */
  estimated: boolean;
  estimatedIds: Id[];
  excluded: Excluded[];
  before: BeforeFigures;
  after?: AfterFigures;
  /** S / C in g per g; `value: null` when the acid total is 0. Unchanged by dilution. */
  sugarAcidRatio: Figure<number | null>;
  /** UK units, ethanol ml / 10. */
  ukUnits: Figure;
}

export type BalanceErrorCode =
  'unknown-unit' | 'invalid-amount' | 'not-measurable' | 'invalid-fraction' | 'invalid-top';

export interface BalanceError {
  code: BalanceErrorCode;
  ids: Id[];
  message: string;
}

export type BalanceResult =
  { ok: true; value: BalanceFigures } | { ok: false; errors: BalanceError[] };
