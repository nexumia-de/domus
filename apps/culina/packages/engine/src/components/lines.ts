// Grams of every line of one component. A line without amount is kept and
// listed as unmeasured, never an error and never guessed.
import { toGrams } from '../amounts/convert';
import { unitKind } from '../amounts/units';
import type { Component, ComponentError, FactsByIngredient, LineGrams, LinesResult } from './types';

const positive = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;

const fail = (component: Component, error: Omit<ComponentError, 'componentId'>): LinesResult => ({
  ok: false,
  error: { ...error, componentId: component.id },
});

/**
 * Grams of every line of one component, in line order. Mass, volume and
 * count lines go through `toGrams` with the facts of the line's
 * ingredient. A `percent` line is its percent of the summed grams of the
 * lines that are not in percent and whose role is `percentBase`. A line
 * that refers to a component must be a mass or a percent. A formula
 * written entirely in percent has no mass: give it one first, for example
 * with `fromBakersPercent`.
 *
 * @param component - The component; only `id`, `percentBase` and `lines` are read.
 * @param factsByIngredient - Density and unit weight per ingredient id.
 * @returns Lines with grams, the indexes of lines without amount and the summed grams; or `cannot-convert` (`index`, `cause`), `component-needs-mass`, `no-percent-base` or `invalid-value` (`index`), each with `componentId`.
 */
export function componentLineGrams(
  component: Component,
  factsByIngredient: FactsByIngredient = {},
): LinesResult {
  const lines: LineGrams[] = [];
  const unmeasured: number[] = [];
  const percents: LineGrams[] = [];
  let baseG = 0;
  let inputG = 0;
  for (const [index, line] of component.lines.entries()) {
    const amount = line.amount;
    if (amount === undefined) {
      unmeasured.push(index);
      continue;
    }
    if (amount.unit === 'percent') {
      if (!positive(amount.value))
        return fail(component, { code: 'invalid-value', index, field: 'amount' });
      const entry = { index, ref: line.ref, ...rest(line), g: amount.value };
      percents.push(entry);
      lines.push(entry);
      continue;
    }
    if (line.ref.kind === 'component' && unitKind(amount.unit) !== 'mass') {
      return fail(component, { code: 'component-needs-mass', index });
    }
    const facts = line.ref.kind === 'ingredient' ? factsByIngredient[line.ref.id] : undefined;
    const grams = toGrams(amount, facts);
    if (!grams.ok) return fail(component, { code: 'cannot-convert', index, cause: grams.error });
    lines.push({ index, ref: line.ref, ...rest(line), g: grams.g });
    inputG += grams.g;
    if (component.percentBase !== undefined && line.role === component.percentBase)
      baseG += grams.g;
  }
  for (const entry of percents) {
    if (component.percentBase === undefined || baseG === 0) {
      return fail(component, { code: 'no-percent-base', index: entry.index });
    }
    entry.g = (entry.g / 100) * baseG;
    inputG += entry.g;
  }
  return { ok: true, lines, unmeasured, inputG };
}

/** Role and state of a line, only the ones that are set. */
function rest(line: Component['lines'][number]): Pick<LineGrams, 'role' | 'state'> {
  return {
    ...(line.role !== undefined ? { role: line.role } : {}),
    ...(line.state !== undefined ? { state: line.state } : {}),
  };
}
