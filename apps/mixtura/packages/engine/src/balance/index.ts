// Balance of a spec (docs/balance.md): lines to ml, totals, dilution by
// method, figures. Pure; the dilution numbers come from data.
import type { UnitOverrides } from '../amounts/index';
import type { SpecLookup } from '../ingredients/prepared';
import type { IngredientTree } from '../ingredients/tree';
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
