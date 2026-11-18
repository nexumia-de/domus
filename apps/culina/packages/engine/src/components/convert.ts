// Converts the lines of one component between weight and percent of its base.
import { componentLineGrams } from './lines';
import type { Component, ComponentFail, ComponentLine, FactsByIngredient } from './types';

/** The direction of `convertComponentLines`. */
export type LineEntry = 'weight' | 'percent';

/** Result of `convertComponentLines`. */
export type ConvertLinesResult = { ok: true; lines: ComponentLine[] } | ComponentFail;

/** Trims binary noise (10 significant digits) and keeps a positive number positive. */
const clean = (n: number): number => Number(n.toPrecision(10));

/**
 * Rewrites the amounts of a component's lines for the other way of entry; the
 * grams of every line stay the same (`componentLineGrams` before and after agree).
 * `to: 'percent'` turns every measured line that is not a base line (role =
 * `percentBase`) into percent of the base mass; base lines keep their amount,
 * or become grams where they were percent. `to: 'weight'` turns every percent
 * line into grams and keeps the other lines as entered. Lines without amount
 * stay without. Numbers are trimmed to 10 significant digits.
 *
 * @param component - Read: `id`, `percentBase`, `lines`.
 * @param to - `percent` or `weight`.
 * @param factsByIngredient - Density and unit weight per ingredient id.
 * @returns The new lines in order, or the errors of `componentLineGrams`; `no-percent-base` for `to: 'percent'` without a `percentBase`.
 */
export function convertComponentLines(
  component: Component,
  to: LineEntry,
  factsByIngredient: FactsByIngredient = {},
): ConvertLinesResult {
  const base = component.percentBase;
  if (to === 'percent' && base === undefined) {
    return { ok: false, error: { code: 'no-percent-base', componentId: component.id } };
  }
  const grams = componentLineGrams(component, factsByIngredient);
  if (!grams.ok) return grams;
  const byIndex = new Map(grams.lines.map((l) => [l.index, l.g]));
  let baseG = 0;
  for (const [index, line] of component.lines.entries()) {
    if (line.role === base && line.amount?.unit !== 'percent') baseG += byIndex.get(index) ?? 0;
  }
  if (to === 'percent' && baseG === 0) {
    return { ok: false, error: { code: 'no-percent-base', componentId: component.id } };
  }
  const lines = component.lines.map((line, index): ComponentLine => {
    const g = byIndex.get(index);
    if (line.amount === undefined || g === undefined) return line;
    const isBase = base !== undefined && line.role === base;
    if (to === 'percent' && !isBase) {
      return { ...line, amount: { value: clean((100 * g) / baseG), unit: 'percent' } };
    }
    if (line.amount.unit === 'percent') {
      return { ...line, amount: { value: clean(g), unit: 'g' } };
    }
    return line;
  });
  return { ok: true, lines };
}
