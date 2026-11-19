// Total yield and loss of one component: input weight against the weighed
// output, derived every time. No yield recorded means unknown, never a default.
import { toGrams } from '../amounts/convert';
import { unitKind } from '../amounts/units';
import { componentLineGrams } from './lines';
import type { Component, ComponentFail, FactsByIngredient, YieldResult } from './types';

/**
 * The recorded yield of a component in grams.
 *
 * @param component - The component.
 * @returns `g` (absent when no yield is recorded), or `invalid-value` with field `yield` when the amount is not a positive mass.
 */
export function yieldGrams(component: Component): { ok: true; g?: number } | ComponentFail {
  const recorded = component.yield;
  if (recorded === undefined) return { ok: true };
  const { amount } = recorded;
  const grams =
    typeof amount?.unit === 'string' && unitKind(amount.unit as 'g') === 'mass'
      ? toGrams(amount)
      : undefined;
  if (grams?.ok !== true) {
    return {
      ok: false,
      error: { code: 'invalid-value', componentId: component.id, field: 'yield' },
    };
  }
  return { ok: true, g: grams.g };
}

/**
 * Input weight, output weight and loss of one component. The input is the
 * sum of the component's own measured lines (a sub-component line counts
 * with the mass used). The loss is input minus output and is negative when
 * weight is gained. Lines without amount are listed in `unmeasured`; the
 * input then lacks them.
 *
 * @param component - The component.
 * @param factsByIngredient - Density and unit weight per ingredient id.
 * @returns `inputG`, `unmeasured` and `yield`: `{ known: true, outputG, lossG, yieldPct }` or `{ known: false }`; or the errors of `componentLineGrams`, `invalid-value` (yield) or `zero-input` (a yield is recorded and the input is 0).
 */
export function componentYield(
  component: Component,
  factsByIngredient: FactsByIngredient = {},
): YieldResult {
  const lines = componentLineGrams(component, factsByIngredient);
  if (!lines.ok) return lines;
  const out = yieldGrams(component);
  if (!out.ok) return out;
  const { inputG, unmeasured } = lines;
  if (out.g === undefined) return { ok: true, inputG, unmeasured, yield: { known: false } };
  if (inputG === 0) {
    return { ok: false, error: { code: 'zero-input', componentId: component.id } };
  }
  const figures = {
    known: true as const,
    outputG: out.g,
    lossG: inputG - out.g,
    yieldPct: (100 * out.g) / inputG,
  };
  return { ok: true, inputG, unmeasured, yield: figures };
}
