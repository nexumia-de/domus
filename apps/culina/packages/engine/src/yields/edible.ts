// As purchased versus edible portion: yield = edible / purchased. The yield
// of an ingredient comes from user entry or sourced data; an ingredient with
// none for a state is "unknown", never 100 %.

/** One recorded yield of an ingredient (the resolved `yields` entry). */
export interface IngredientYield {
  state: 'raw' | 'cooked' | 'prepared';
  /** Weight in that state as percent of the weight as purchased; above 100 is possible. */
  percent: number;
  source: string;
}

/** Why a yield function failed. */
export interface YieldError {
  code: 'unknown-yield' | 'invalid-value' | 'duplicate-state';
  state?: string;
  field?: string;
}

/** Result of `yieldFor`. */
export type YieldLookup =
  | { ok: true; known: true; percent: number; source: string }
  | { ok: true; known: false }
  | { ok: false; error: YieldError };

/** Result of `toEdible` and `toPurchased`. */
export type EdibleResult = { ok: true; g: number } | { ok: false; error: YieldError };

const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

/**
 * The recorded yield of an ingredient for a state.
 *
 * @param yields - The ingredient's resolved `yields`; absent or empty means none recorded.
 * @param state - The state wanted.
 * @returns `known: true` with percent and source, `known: false` when none is recorded for the state, `duplicate-state` when two entries share the state, or `invalid-value` (field `percent`) when the percent is not finite and greater than 0.
 */
export function yieldFor(
  yields: readonly IngredientYield[] | undefined,
  state: IngredientYield['state'],
): YieldLookup {
  const found = (yields ?? []).filter((y) => y.state === state);
  if (found.length > 1) return { ok: false, error: { code: 'duplicate-state', state } };
  const entry = found[0];
  if (entry === undefined) return { ok: true, known: false };
  if (!finite(entry.percent) || entry.percent <= 0) {
    return { ok: false, error: { code: 'invalid-value', state, field: 'percent' } };
  }
  return { ok: true, known: true, percent: entry.percent, source: entry.source };
}

function convertWith(
  g: number,
  yields: readonly IngredientYield[] | undefined,
  state: IngredientYield['state'],
  apply: (g: number, percent: number) => number,
): EdibleResult {
  if (!finite(g) || g < 0) return { ok: false, error: { code: 'invalid-value', field: 'g' } };
  const found = yieldFor(yields, state);
  if (!found.ok) return found;
  if (!found.known) return { ok: false, error: { code: 'unknown-yield', state } };
  return { ok: true, g: apply(g, found.percent) };
}

/**
 * Edible weight from purchased weight: purchased x percent / 100.
 *
 * @param purchasedG - Weight as purchased in grams (finite, not negative).
 * @param yields - The ingredient's resolved `yields`.
 * @param state - The state of the edible part.
 * @returns `g`, or `unknown-yield` (with the state) when none is recorded, `duplicate-state` or `invalid-value`.
 */
export function toEdible(
  purchasedG: number,
  yields: readonly IngredientYield[] | undefined,
  state: IngredientYield['state'],
): EdibleResult {
  return convertWith(purchasedG, yields, state, (g, percent) => (g * percent) / 100);
}

/**
 * Purchased weight needed for an edible weight: edible x 100 / percent.
 *
 * @param edibleG - Edible weight in grams (finite, not negative).
 * @param yields - The ingredient's resolved `yields`.
 * @param state - The state of the edible part.
 * @returns `g`, or `unknown-yield` (with the state) when none is recorded, `duplicate-state` or `invalid-value`.
 */
export function toPurchased(
  edibleG: number,
  yields: readonly IngredientYield[] | undefined,
  state: IngredientYield['state'],
): EdibleResult {
  return convertWith(edibleG, yields, state, (g, percent) => (g * 100) / percent);
}
