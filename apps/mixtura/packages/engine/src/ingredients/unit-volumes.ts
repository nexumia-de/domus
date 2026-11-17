// The volume of one counted unit of an ingredient, read from its own data.
// Never inherited and never guessed: no entry means no volume.
import { UNITS } from '../amounts/table';
import type { IngredientTreeOf } from './tree';
import type { Id, UnitVolume } from './types';

const counted = new Set<string>(UNITS.filter((u) => u.kind === 'count').map((u) => u.id));

/**
 * The volume of a counted line.
 *
 * @param tree - A validated tree; the ingredient's own `unitVolumes` are read, never an ancestor's.
 * @param id - Ingredient id.
 * @param unit - A counted unit id (`whole`, `slice`, ...).
 * @param amount - Number of units, zero or more.
 * @returns Volume in ml with the evidence of the per-unit number, or undefined when none is known as data.
 */
export function countedVolume(
  tree: IngredientTreeOf,
  id: Id,
  unit: string,
  amount: number,
): { ml: number; evidence: UnitVolume['evidence'] } | undefined {
  if (!counted.has(unit)) return undefined;
  const uv = tree.byId.get(id)?.unitVolumes?.[unit];
  if (!uv || !(uv.ml > 0) || !Number.isFinite(amount) || amount < 0) return undefined;
  return { ml: amount * uv.ml, evidence: uv.evidence };
}
