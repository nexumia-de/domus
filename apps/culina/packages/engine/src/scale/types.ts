// Types of scaling by weight.
import type { Amount, ConvertError, IngredientFacts } from '../amounts/types';

/** A percentage of a base mass (baker's percentage); not scalable by weight. */
export interface PercentAmount {
  value: number;
  unit: 'percent';
}

/** One line of something to scale. */
export interface ScalableLine {
  id: string;
  /** Absent for "salt to taste". */
  amount?: Amount | PercentAmount;
  /** A role id, used only to find salt for the caution. */
  role?: string;
}

/** Facts per line id; a line without an entry has none. */
export type FactsById = Readonly<Record<string, IngredientFacts | undefined>>;

/** Things that do not scale linearly; the engine flags them and adjusts nothing. */
export type Caution = 'time-not-linear' | 'salt-not-linear';

/** A line the scaling left as it was, and why. */
export interface UnscaledLine {
  id: string;
  reason: 'percent' | 'no-amount';
}

/** Options shared by all scaling functions. */
export interface ScaleOptions {
  /** Roles that count as salt for `salt-not-linear`; default `['salt']`. */
  saltRoles?: readonly string[];
}

/** Why scaling failed. */
export type ScaleErrorCode =
  | 'invalid-factor'
  | 'invalid-target'
  | 'invalid-value'
  | 'zero-total'
  | 'percent-line'
  | 'no-amount'
  | 'unknown-line'
  | 'cannot-convert';

/** A scaling error; `lineId` names the line it concerns, `cause` the conversion error. */
export interface ScaleError {
  code: ScaleErrorCode;
  lineId?: string;
  cause?: ConvertError;
}

/** Result of every scaling function. */
export type ScaleResult =
  | {
      ok: true;
      /** The factor applied to every scalable amount. */
      factor: number;
      /** All input lines in order; scaled amounts keep their own unit. */
      lines: ScalableLine[];
      unscaled: UnscaledLine[];
      cautions: Caution[];
    }
  | { ok: false; error: ScaleError };
