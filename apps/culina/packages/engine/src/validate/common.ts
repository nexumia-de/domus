// Helpers shared by the per-kind checks: finding builder, first occurrences,
// the sets of known ids and the check of one reference.
import type { ComponentRef } from '../components/types';
import type { EntityKind, Finding } from './types';

/** The ids that exist, by collection. */
export interface Known {
  ingredients: ReadonlySet<string>;
  templates: ReadonlySet<string>;
  components: ReadonlySet<string>;
  dishes: ReadonlySet<string>;
}

type Extra = Partial<Omit<Finding, 'code' | 'kind' | 'id'>>;

export const finding = (
  code: Finding['code'],
  kind: EntityKind,
  id: string,
  extra: Extra = {},
): Finding => ({ code, kind, id, ...extra });

/** The records whose id has not occurred before; later ones are duplicates. */
export function firstOccurrences<T extends { id: string }>(records: readonly T[]): T[] {
  const seen = new Set<string>();
  return records.filter((r) => !seen.has(r.id) && seen.add(r.id));
}

/** A finding when the reference points to nothing. */
export function checkRef(
  known: Known,
  kind: EntityKind,
  id: string,
  ref: ComponentRef,
  path: string,
): Finding[] {
  const isIngredient = ref.kind === 'ingredient';
  if ((isIngredient ? known.ingredients : known.components).has(ref.id)) return [];
  const code = isIngredient ? 'unknown-ingredient' : 'unknown-component';
  return [finding(code, kind, id, { path, ref: ref.id })];
}

/** A finding when an ingredient id does not exist. */
export function checkIngredientId(
  known: Known,
  kind: EntityKind,
  id: string,
  ingredientId: string,
  path: string,
): Finding[] {
  if (known.ingredients.has(ingredientId)) return [];
  return [finding('unknown-ingredient', kind, id, { path, ref: ingredientId })];
}

/** Groups cycles by their first id, so each is reported with its record. */
export function cyclesByFirst(cycles: readonly string[][]): Map<string, string[][]> {
  const out = new Map<string, string[][]>();
  for (const ids of cycles) {
    const first = ids[0] as string;
    out.set(first, [...(out.get(first) ?? []), ids]);
  }
  return out;
}
