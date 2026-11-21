// Types of the nutrition module: figures per 100 g, the per-portion result, its coverage and the
// error shapes. Every fallible function returns a result union and never throws.
import type { ComponentRef } from '../components/types';

/** Nutrients per 100 g of an ingredient, as the catalogue's `x-nutrition.per100g` gives them. */
export interface NutrientsPer100g {
  kcal: number;
  kJ: number;
  proteinG: number;
  fatG: number;
  carbohydrateG: number;
  /** Absent when the data does not give it: unknown, not zero. */
  fibreG?: number;
  /** Sodium in milligrams; absent when the data does not give it. */
  sodiumMg?: number;
}

/** The nutrients per 100 g by ingredient id; an ingredient without an entry has no data. */
export type NutritionById = Readonly<Record<string, NutrientsPer100g | undefined>>;

/** The figures of one portion; salt is sodium x 2.5 (Regulation (EU) No 1169/2011, Annex I). */
export interface PortionNutrients {
  kcal: number;
  kJ: number;
  proteinG: number;
  fatG: number;
  carbohydrateG: number;
  /** Absent when a counted ingredient has no fibre figure (see `notReported`). */
  fibreG?: number;
  /** Absent when a counted ingredient has no sodium figure (see `notReported`). */
  saltG?: number;
}

/** Why a line of the dish is not in the figures. */
export type NotCountedReason =
  /** The ingredient is not in the catalogue yet (a `wanted` line). */
  | 'wanted'
  /** The source gives no amount ("to taste"). */
  | 'no-amount'
  /** The amount cannot be turned into grams: no density or unit weight is known. */
  | 'cannot-convert'
  /** The ingredient has no nutrient data. */
  | 'no-nutrition'
  /** An optional ingredient of the dish. */
  | 'optional'
  /** A component the dish names is not in the dish, or names itself. */
  | 'unknown-component';

/** A line left out of the figures. */
export interface NotCountedLine {
  /** The component the line is in; absent for a slot of the dish itself. */
  componentId?: string;
  index: number;
  ref?: ComponentRef;
  wanted?: string;
  reason: NotCountedReason;
  /** For `cannot-convert`: the facts that are missing (`densityGPerMl`, `unitWeightG`). */
  missing?: string[];
}

/** How much of the dish the figures rest on. */
export interface NutritionCoverage {
  /** Lines counted. */
  counted: number;
  /** Lines of the dish (a component is expanded into its lines; the component itself is no line). */
  total: number;
  /** Counted mass divided by the mass of all lines whose mass is known; absent when a line left out has no known mass. */
  massShare?: number;
  notCounted: NotCountedLine[];
}

export type NutritionErrorCode = 'invalid-portions' | 'invalid-nutrition' | 'invalid-value';

export interface NutritionError {
  code: NutritionErrorCode;
  /** The ingredient whose figures are not usable, for `invalid-nutrition`. */
  ingredient?: string;
}

/**
 * Whether the figures mean anything. `nothing-counted`: no line was counted. `left-out-matters`:
 * a line that has an amount, is not optional and is not a seasoning was left out (listed in
 * `lines`); a sum without it would read as the dish's and be far from it.
 */
export type NutritionShown =
  | { figures: true }
  | { figures: false; why: 'nothing-counted' | 'left-out-matters'; lines: NotCountedLine[] };

/** Result of `dishNutrition`. */
export type NutritionResult =
  | {
      ok: true;
      portions: number;
      /** Sum of the counted lines divided by the portions; zero where nothing was counted. */
      perPortion: PortionNutrients;
      /** Grams of the counted lines per portion. */
      countedGPerPortion: number;
      coverage: NutritionCoverage;
      /** Nutrients left out of `perPortion` because a counted line lacks them. */
      notReported: ('fibreG' | 'saltG')[];
      /** Whether the figures may be shown at all; the coverage is shown either way. */
      shown: NutritionShown;
    }
  | { ok: false; error: NutritionError };

/** Result of `roundNutrition`. */
export type RoundNutritionResult =
  | { ok: true; rounded: PortionNutrients }
  | { ok: false; error: { code: 'invalid-value'; field: string } };
