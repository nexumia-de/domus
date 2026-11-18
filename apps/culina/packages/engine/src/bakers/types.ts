// Types of baker's percentages and hydration.

/** A line of a dough in grams. */
export interface BakersLine {
  id: string;
  g: number;
  /** A role id; lines with the base role are the flour. */
  role?: string;
}

/** A line of a formula in percent of the flour. */
export interface FormulaLine {
  id: string;
  pct: number;
  role?: string;
}

/** Options shared by the baker's functions. */
export interface BakersOptions {
  /** The role whose summed mass is 100 %; default `flour`. */
  baseRole?: string;
}

/** Why a baker's function failed. */
export type BakersErrorCode =
  'invalid-value' | 'no-base' | 'base-not-100' | 'invalid-target' | 'duplicate-id';

/** A baker's error; `lineId` names the line for `invalid-value` and `duplicate-id`. */
export interface BakersError {
  code: BakersErrorCode;
  lineId?: string;
  /** For `base-not-100`: the percentages of the base lines added up. */
  basePct?: number;
}

/** Result of `bakersPercent`. */
export type BakersPercentResult =
  | {
      ok: true;
      /** Summed mass of the base-role lines. */
      flourG: number;
      /** Summed mass of all lines. */
      doughG: number;
      /** Percent of the flour, by line id. */
      pct: Record<string, number>;
      /** The dough as percent of the flour: the sum of all percentages. */
      totalPct: number;
    }
  | { ok: false; error: BakersError };

/** What a formula is scaled to: a dough weight or a flour weight. */
export type FormulaTarget = { doughG: number } | { flourG: number };

/** Result of `fromBakersPercent`. */
export type FormulaResult =
  | {
      ok: true;
      flourG: number;
      /** Grams by line id. */
      g: Record<string, number>;
      /** Sum of the grams. */
      doughG: number;
    }
  | { ok: false; error: BakersError };

/** The recorded composition of a prepared component such as a preferment. */
export interface Composition {
  flourG: number;
  waterG: number;
}

/** A line for `hydration`. */
export interface HydrationLine {
  id: string;
  g: number;
  role?: string;
  /** Flour and water inside this line (a poolish, a soaker); counted instead of `g`. */
  composition?: Composition;
  /** A made component; without `composition` it is not counted and is listed in `notCounted`. */
  component?: boolean;
}

/** Options of `hydration`. */
export interface HydrationOptions extends BakersOptions {
  /** Roles whose mass counts as water; default `['water']`. */
  waterRoles?: readonly string[];
}

/** Result of `hydration`. */
export type HydrationResult =
  | {
      ok: true;
      /** Water over flour, in percent. */
      hydrationPct: number;
      flourG: number;
      waterG: number;
      /** Ids of component lines that carry no composition and so are on neither side. */
      notCounted: string[];
    }
  | { ok: false; error: BakersError };
