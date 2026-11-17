// What a swap did to the figures: for each of ABV, sugar and acid (and the
// volume) the saved value, the new value and the difference, as numbers and
// never as a verdict (docs/screens-browse.md#swap-mode). The difference is taken
// between the values as they are shown (rounded to the figure's decimals), so
// "18.3 -> 19.7" always comes with "+1.4". Pure.

import type { BalanceResult, RangeFigure } from '@mixtura/engine';

export interface FigureChange {
  /** Value before and after, absent when the figure is unknown. */
  before?: number;
  after?: number;
  /** Shown difference after - before, rounded like the figures; absent when either is unknown. */
  delta?: number;
}

export interface SwapDelta {
  figures: Record<RangeFigure, FigureChange>;
  volume: FigureChange;
}

const KEYS = { abv: 'abvPct', sugar: 'sugarPer100Ml', acid: 'acidPct' } as const;

const DECIMALS: Record<RangeFigure, number> = { abv: 1, sugar: 1, acid: 2 };

const rounded = (value: number, decimals: number): number => Number(value.toFixed(decimals));

function change(
  before: number | undefined,
  after: number | undefined,
  decimals: number,
): FigureChange {
  const out: FigureChange = {};
  if (before !== undefined) out.before = before;
  if (after !== undefined) out.after = after;
  if (before !== undefined && after !== undefined) {
    out.delta = rounded(rounded(after, decimals) - rounded(before, decimals), decimals);
  }
  return out;
}

function figuresOf(result: BalanceResult): Record<RangeFigure | 'volume', number | undefined> {
  const none = { abv: undefined, sugar: undefined, acid: undefined, volume: undefined };
  if (!result.ok) return none;
  const after = result.value.after;
  if (!after) return none;
  const read = (f: { known: boolean; value?: number } | undefined): number | undefined =>
    f?.known ? (f as { value: number }).value : undefined;
  return {
    abv: read(after[KEYS.abv]),
    sugar: read(after[KEYS.sugar]),
    acid: read(after[KEYS.acid]),
    volume: after.volumeMl,
  };
}

/** The change from the saved drink's figures to the swapped drink's, after dilution. */
export function swapDelta(before: BalanceResult, after: BalanceResult): SwapDelta {
  const b = figuresOf(before);
  const a = figuresOf(after);
  return {
    figures: {
      abv: change(b.abv, a.abv, DECIMALS.abv),
      sugar: change(b.sugar, a.sugar, DECIMALS.sugar),
      acid: change(b.acid, a.acid, DECIMALS.acid),
    },
    volume: change(b.volume, a.volume, 0),
  };
}

/** `+1.4`, `-0.3` (a true minus sign) or `0.0`: the sign always shown for a change. */
export function signed(delta: number, decimals: number): string {
  const text = Math.abs(delta).toFixed(decimals);
  if (delta > 0) return `+${text}`;
  if (delta < 0) return `−${text}`;
  return text;
}
