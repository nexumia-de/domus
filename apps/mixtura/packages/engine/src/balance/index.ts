// Balance of a spec (docs/balance.md): lines to ml, totals, dilution by
// method, figures. Pure; the dilution numbers come from data.
import type { UnitOverrides } from '../amounts/index';
import type { SpecLookup } from '../ingredients/prepared';
import type { IngredientTree } from '../drink-ingredients/types';
import { chooseDilution } from './dilution';
import { figures } from './figures';
import { resolveLines } from './lines';
import type { BalanceResult, BalanceSpec, DilutionOptions } from './types';

export interface BalanceOptions {
  /** Specs of prepared ingredients, by spec id. */
  specs?: SpecLookup;
  unitOverrides?: UnitOverrides;
  dilution?: DilutionOptions;
}

/**
 * Computes the figures of a spec: volume, ABV, sugar, acid and ratios before and after dilution (docs/balance.md).
 *
 * @param tree - A validated tree whose ingredients carry ABV (percent), sugar (g per 100 ml), acid (percent).
 * @param spec - Method id and lines (amounts in a unit of the unit table; `topMl` in ml).
 * @param options - Specs of prepared ingredients, unit overrides, dilution table, bound or fraction.
 * @returns Figures in ml, percent and g per 100 ml, each a number or `known: false` with the ingredient ids that prevent it; or errors.
 */
export function computeBalance(
  tree: IngredientTree,
  spec: BalanceSpec,
  options: BalanceOptions = {},
): BalanceResult {
  const resolved = resolveLines(
    tree,
    options.specs ?? new Map(),
    spec.lines,
    options.unitOverrides,
  );
  if (!resolved.ok) return resolved;
  const { parts, unknown, estimatedIds, excluded } = resolved.value;
  const choice = chooseDilution(spec.method, options.dilution);
  if (!choice.ok && choice.reason === 'invalid-fraction') {
    return {
      ok: false,
      errors: [
        {
          code: 'invalid-fraction',
          ids: [],
          message: 'the dilution fraction must be a number of zero or more',
        },
      ],
    };
  }
  const dilution = choice.ok ? choice.value : undefined;
  return {
    ok: true,
    value: {
      method: spec.method,
      dilution,
      dilutionUnavailable:
        choice.ok || choice.reason === 'invalid-fraction' ? undefined : choice.reason,
      estimated: estimatedIds.length > 0,
      estimatedIds,
      excluded,
      ...figures(parts, unknown, dilution),
    },
  };
}

export { DILUTION, chooseDilution } from './dilution';
export type * from './types';
export type * from './mixture';
export { computePrepared } from './prepared';
export type { PreparedProperties, PreparedResult } from './prepared';
