// Types of the batch module (docs/balance.md, "Batching").
import type { Amount } from '../amounts/index';
import type { BalanceFigures, BalanceLine } from '../balance/index';
import type { Id } from '@nexumia-de/materia';

export type BatchErrorCode = 'invalid-servings' | 'no-dilution' | 'invalid-line' | 'balance-error';

export interface BatchError {
  code: BatchErrorCode;
  ids: Id[];
  message: string;
}

/** A batch line: the exact scaled amount and the amount rounded for the bar. */
export interface BatchLine {
  ingredientId: Id;
  exact: Amount;
  rounded: Amount;
  /** Rounding step in the unit of `rounded`. */
  step: number;
  /** rounded minus exact in ml (volume units, counted units with a known volume) or g (mass units); null for a counted unit without a known volume. */
  roundingError: number | null;
}

export type ShelfLife =
  { known: true; days: number; limitingId: Id } | { known: false; missingIds: Id[] };

export interface Batch {
  servings: number;
  lines: BatchLine[];
  water: { exactMl: number; roundedMl: number; roundingErrorMl: number };
  /** What one poured serving is, ml: the volume of one diluted drink. */
  pourPerServingMl: number;
  totalVolumeMl: number;
  roundedTotalMl: number;
  /** Servings the batch as made yields at `pourPerServingMl` each. */
  roundedYieldServings: number;
  /** Lines served at the glass instead of batched (`top` lines). */
  servedSeparately: BalanceLine[];
  /** One drink, as the spec describes it. */
  perDrink: BalanceFigures;
  /** The batch with exact amounts: equals `perDrink` after dilution. */
  exact: BalanceFigures;
  /** The batch with the rounded amounts and water. */
  made: BalanceFigures;
  shelfLife: ShelfLife;
}

export type BatchResult = { ok: true; value: Batch } | { ok: false; errors: BatchError[] };
