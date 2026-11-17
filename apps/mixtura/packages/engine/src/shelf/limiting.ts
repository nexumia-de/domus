// The shelf life that applies to a prepared ingredient: the user's own value on
// it and on the prepared ingredients it is made from, the shortest wins and its
// ingredient is named. Raw parts carry no shelf life in the data, so they say
// nothing here; a part without a value never makes a number up.
import type { IngredientTree } from '../ingredients/tree';
import { resolveProperty } from '../ingredients/properties';
import type { SpecLookup } from '../ingredients/prepared';
import type { Id } from '../ingredients/types';

export type LimitingShelfLife = { known: true; days: number; limitingId: Id } | { known: false };

function collect(
  tree: IngredientTree,
  specs: SpecLookup,
  id: Id,
  stack: readonly Id[],
  out: { days: number; id: Id }[],
): void {
  if (stack.includes(id)) return;
  const own = resolveProperty(tree, id, 'shelfLifeDays');
  if (own.value !== undefined) out.push({ days: own.value, id });
  const item = tree.byId.get(id);
  const spec = item?.prepared ? specs.get(item.prepared.specId) : undefined;
  if (!spec) return;
  for (const line of spec.lines) {
    if (tree.byId.get(line.ingredientId)?.prepared) {
      collect(tree, specs, line.ingredientId, [...stack, id], out);
    }
  }
}

/**
 * The shortest shelf life among a prepared ingredient and the prepared ingredients inside it.
 *
 * @param tree - A validated tree.
 * @param specs - Specs of prepared ingredients by spec id.
 * @param id - The prepared ingredient.
 * @returns Days and the ingredient that sets them (the outer one on a tie, then the first line), or `known: false` when none has a value.
 */
export function limitingShelfLife(
  tree: IngredientTree,
  specs: SpecLookup,
  id: Id,
): LimitingShelfLife {
  const found: { days: number; id: Id }[] = [];
  collect(tree, specs, id, [], found);
  let best: { days: number; id: Id } | undefined;
  for (const c of found) if (!best || c.days < best.days) best = c;
  return best ? { known: true, days: best.days, limitingId: best.id } : { known: false };
}
