// A pre-diluted batch: the spec scaled to N servings plus the water the
// method would have added to each, so that a pour from the batch equals the
// finished drink. Quantities are rounded by the display rules and the
// rounding error is reported with figures for the batch as made.
import { formatAmountDetailed, toBase, UNITS } from '../amounts/index';
import type { Amount, DisplaySystem } from '../amounts/index';
import {
  computeBalance,
  type BalanceFigures,
  type BalanceOptions,
  type BalanceSpec,
} from '../balance/index';
import type { IngredientTree } from '../ingredients/tree';
import { countedVolume } from '../ingredients/unit-volumes';
import { scaleLines, type ScaleOptions } from './scale';
import { shelfLife } from './shelf';
import type { Batch, BatchError, BatchLine, BatchResult } from './types';

export interface BatchOptions extends BalanceOptions, ScaleOptions {
  /** Display system for the rounded amounts; default metric. */
  system?: DisplaySystem;
}

const balanceErrors = (errors: { ids: string[]; message: string }[]): BatchError[] =>
  errors.map((e) => ({ code: 'balance-error', ids: e.ids, message: e.message }));

const COUNTED = new Set<string>(UNITS.filter((u) => u.kind === 'count').map((u) => u.id));

/** Volume (ml) or mass (g) of a line's amount; NaN when it has none as data (counted line without a unit volume). */
function base(tree: IngredientTree, id: string, amount: Amount, options: BatchOptions): number {
  if (COUNTED.has(amount.unit)) {
    return countedVolume(tree, id, amount.unit, amount.value)?.ml ?? Number.NaN;
  }
  const b = toBase(amount, options.unitOverrides);
  return b.ok ? b.value.value : NaN;
}

/**
 * A counted amount in a batch is rounded up to a whole number of units: a
 * garnish or an egg cannot be prepared in fractions, and having too few is
 * the worse error (docs/balance.md, Batching).
 */
function roundCount(value: number): { value: number; step: number } {
  return { value: value > 0 ? Math.max(1, Math.ceil(value - 1e-9)) : 0, step: 1 };
}

/**
 * Builds a pre-diluted batch of a spec with the dilution water added.
 *
 * @param tree - A validated tree.
 * @param spec - The spec of one serving; amounts in units of the unit table.
 * @param servings - Number of servings above 0.
 * @param options - Balance options plus rounding and scaling options.
 * @returns Lines (exact and rounded amounts), water and totals in ml, servings yielded, the figures of the batch as made and the lines served at the glass, or errors.
 */
export function prediluted(
  tree: IngredientTree,
  spec: BalanceSpec,
  servings: number,
  options: BatchOptions = {},
): BatchResult {
  const batched = spec.lines.filter((l) => !(l.unit === 'top'));
  const servedSeparately = spec.lines.filter((l) => l.unit === 'top');
  const scaled = scaleLines(batched, servings, options);
  if (!scaled.ok) return scaled;

  const drink = computeBalance(tree, { method: spec.method, lines: batched }, options);
  if (!drink.ok) return { ok: false, errors: balanceErrors(drink.errors) };
  const perDrink = drink.value;
  if (!perDrink.dilution || !perDrink.after) {
    return {
      ok: false,
      errors: [
        {
          code: 'no-dilution',
          ids: [],
          message: `no dilution for method "${spec.method ?? ''}": a batch needs one`,
        },
      ],
    };
  }
  const fraction = perDrink.dilution.fraction;
  const dilution = { ...options.dilution, fraction };
  const run = (lines: typeof batched, f: number) =>
    computeBalance(tree, { lines }, { ...options, dilution: { ...dilution, fraction: f } });

  const exact = run(scaled.value, fraction);
  if (!exact.ok) return { ok: false, errors: balanceErrors(exact.errors) };

  const lines: BatchLine[] = [];
  for (const line of scaled.value) {
    const amount: Amount = { value: line.amount, unit: line.unit as Amount['unit'] };
    let shown: Amount;
    let step: number;
    if (COUNTED.has(amount.unit)) {
      const r = roundCount(amount.value);
      shown = { value: r.value, unit: amount.unit };
      step = r.step;
    } else {
      const f = formatAmountDetailed(amount, {
        system: options.system,
        overrides: options.unitOverrides,
      });
      if (!f.ok) {
        return {
          ok: false,
          errors: [{ code: 'invalid-line', ids: [line.ingredientId], message: f.error.message }],
        };
      }
      shown = f.value.shown;
      step = f.value.step;
    }
    const error =
      base(tree, line.ingredientId, shown, options) -
      base(tree, line.ingredientId, amount, options);
    lines.push({
      ingredientId: line.ingredientId,
      exact: amount,
      rounded: shown,
      step,
      roundingError: Number.isNaN(error) ? null : error,
    });
  }
  const roundedLines = lines.map((l, i) => ({
    ...(scaled.value[i] as (typeof batched)[number]),
    amount: l.rounded.value,
    unit: l.rounded.unit,
  }));
  const roundedBefore = run(roundedLines, 0);
  if (!roundedBefore.ok) return { ok: false, errors: balanceErrors(roundedBefore.errors) };
  const exactWaterMl = (exact.value.after as { waterMl: number }).waterMl;
  const waterShown = formatAmountDetailed({ value: exactWaterMl, unit: 'ml' });
  const roundedWaterMl = waterShown.ok ? waterShown.value.shown.value : exactWaterMl;
  const v0 = roundedBefore.value.before.volumeMl;
  const made = run(roundedLines, v0 > 0 ? roundedWaterMl / v0 : 0);
  if (!made.ok) return { ok: false, errors: balanceErrors(made.errors) };

  const pour = perDrink.after.volumeMl;
  const roundedTotalMl = v0 + roundedWaterMl;
  const value: Batch = {
    servings,
    lines,
    water: {
      exactMl: exactWaterMl,
      roundedMl: roundedWaterMl,
      roundingErrorMl: roundedWaterMl - exactWaterMl,
    },
    pourPerServingMl: pour,
    totalVolumeMl: (exact.value.after as { volumeMl: number }).volumeMl,
    roundedTotalMl,
    roundedYieldServings: pour > 0 ? roundedTotalMl / pour : 0,
    servedSeparately,
    perDrink: perDrink as BalanceFigures,
    exact: exact.value,
    made: made.value,
    shelfLife: shelfLife(
      tree,
      batched.map((l) => l.ingredientId),
    ),
  };
  return { ok: true, value };
}
