// Types of components: lines, yield, expansion and their errors. Every
// fallible function returns a result union and never throws. A stored
// component record can be passed as is: these types are a subset of it.
import type { Amount, ConvertError, IngredientFacts } from '../amounts/types';
import type { PercentAmount } from '../scale/types';
import type { Step } from '../steps/types';

/** A reference to an ingredient or to another component. */
export interface ComponentRef {
  kind: 'ingredient' | 'component';
  id: string;
}

/** The state of food on a line, as in the stored model. */
export type FoodState = 'raw' | 'cooked' | 'prepared';

/** One line of a component; a line without `amount` is kept and reported as unmeasured. */
export interface ComponentLine {
  ref: ComponentRef;
  amount?: Amount | PercentAmount;
  role?: string;
  state?: FoodState;
  note?: string;
  /** Names the line so a step can use it; unique in the component. */
  key?: string;
}

/**
 * How long a made component keeps in one place, and how: "in portions, airtight". Every entry has
 * a source; the user's own entry is `user`.
 */
export interface KeepEntry {
  storage: 'pantry' | 'fridge' | 'freezer';
  days: number;
  source: string;
  /** How it is kept, in the user's words. */
  note?: string;
}

/** A component: lines, the weighed output and the role whose mass is 100 percent. */
export interface Component {
  id: string;
  /** Role whose summed mass (lines not in percent) is 100 percent for percent lines. */
  percentBase?: string;
  lines: readonly ComponentLine[];
  /** How long it keeps once made, per storage place; absent when nothing is recorded. */
  keeps?: readonly KeepEntry[];
  /** Steps with bilingual text; the stored `method` text stays valid beside them. */
  steps?: readonly Step[];
  /** The output weight as weighed; absent when unknown. There is no default. */
  yield?: { amount: { value: number; unit: 'g' | 'kg' | 'oz' | 'lb' }; source: string };
}

/** What is known per ingredient id; an ingredient without an entry has no facts. */
export type FactsByIngredient = Readonly<Record<string, IngredientFacts | undefined>>;

/** Why a component function failed. */
export type ComponentErrorCode =
  | 'cannot-convert'
  | 'no-percent-base'
  | 'component-needs-mass'
  | 'no-yield'
  | 'unknown-component'
  | 'cycle'
  | 'duplicate-id'
  | 'invalid-value'
  | 'zero-input';

/** An error with the context that explains it. */
export interface ComponentError {
  code: ComponentErrorCode;
  /** The component the error is in; for `unknown-component` the id that is missing. */
  componentId?: string;
  /** Index of the offending line. */
  index?: number;
  /** The conversion error behind `cannot-convert`. */
  cause?: ConvertError;
  /** Component ids from the start id to the one meant (`cycle`: ends at the repeated id). */
  path?: string[];
  /** The offending field for `invalid-value`: `amount`, `yield` or `outputG`. */
  field?: string;
}

/** Failure shape shared by the component functions. */
export type ComponentFail = { ok: false; error: ComponentError };

/** Grams of one line. */
export interface LineGrams {
  index: number;
  ref: ComponentRef;
  role?: string;
  state?: FoodState;
  g: number;
}

/**
 * A line whose amount is written but cannot be converted to grams, because its ingredient lacks
 * the fact the unit needs (a density for a volume, a piece weight for a count). It is kept out of
 * the sums, as a line without amount is, and never guessed.
 */
export interface UnconvertedIndex {
  index: number;
  /** `needs-density`, `needs-unit-weight` or `not-convertible` (with `missing`). */
  cause: ConvertError;
}

/** Result of `componentLineGrams`. */
export type LinesResult =
  | {
      ok: true;
      lines: LineGrams[];
      unmeasured: number[];
      /** Lines with an amount that lacks the fact to convert it; not in `inputG`. */
      unconverted: UnconvertedIndex[];
      inputG: number;
    }
  | ComponentFail;

/** An ingredient in the expansion, aggregated by id, state and role. */
export interface RawIngredient {
  ingredientId: string;
  state?: FoodState;
  role?: string;
  g: number;
}

/** A line without amount somewhere in the tree. */
export interface UnmeasuredLine {
  path: string[];
  index: number;
  ref: ComponentRef;
}

/** A line somewhere in the tree whose amount cannot be converted to grams (see `UnconvertedIndex`). */
export interface UnconvertedLine extends UnmeasuredLine {
  cause: ConvertError;
}

/** Options of `expandComponent`. */
export interface ExpandOptions {
  /** Output weight wanted in grams; absent: one run of the recipe as written. */
  outputG?: number;
  /**
   * What a component without a recorded yield weighs when one is needed. Absent: nothing is
   * assumed and it is `no-yield`. `'input'`: one run is taken as weighing what went in (its
   * measured lines), and the component is listed in `unweighed`.
   */
  withoutYield?: 'input';
}

/** Result of `expandComponent`. */
export type ExpandResult =
  | {
      ok: true;
      raw: RawIngredient[];
      rawG: number;
      unmeasured: UnmeasuredLine[];
      /** Lines anywhere in the tree whose amount lacks the fact to convert it; not in `raw`. */
      unconverted: UnconvertedLine[];
      /** Components taken as weighing their input (`withoutYield: 'input'`), in first-seen order. */
      unweighed: string[];
      /** Multiple of one run: 1 without `outputG`. */
      factor: number;
    }
  | ComponentFail;

/** Total input against output; `known: false` when no yield is recorded. */
export type YieldFigures =
  { known: true; outputG: number; lossG: number; yieldPct: number } | { known: false };

/** Result of `componentYield`. */
export type YieldResult =
  | {
      ok: true;
      inputG: number;
      unmeasured: number[];
      unconverted: UnconvertedIndex[];
      yield: YieldFigures;
    }
  | ComponentFail;

/** Result of the portion functions. */
export type PortionsResult =
  | { ok: true; portions: number; wholePortions: number; remainderG: number }
  | { ok: false; error: { code: 'invalid-value'; field: string } };

/** Result of `portionWeight`. */
export type PortionWeightResult =
  { ok: true; portionG: number } | { ok: false; error: { code: 'invalid-value'; field: string } };
