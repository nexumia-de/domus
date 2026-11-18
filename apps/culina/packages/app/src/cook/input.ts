// The one adapter from the notebook to the engine's finder: the ingredient tree, every version of
// the components and dishes, the seed ratio templates, the stock as stored, the facts for
// conversion and today. No arithmetic and no rule here: every number and status on the screens
// comes from the engine's result.
import { SEED_TEMPLATES } from '@culina/engine';
import type { MakeableInput, MakeableOptions } from '@culina/engine';
import { factsOf } from '../notebook/build';
import type { ComponentRecord, DishRecord, IngredientRecord, StockRecord } from '../records';

/** The records the finder reads: the notebook cache, or a fixture. */
export interface CookSource {
  ingredients: readonly IngredientRecord[];
  /** Every version of every component. */
  components: readonly ComponentRecord[];
  /** Every version of every dish. */
  dishes: readonly DishRecord[];
  stock: readonly StockRecord[];
}

/**
 * The engine's input. A `parentId` that names no ingredient of the notebook is left out, so one
 * stale link does not stop the finder; the validation of the notebook reports it elsewhere.
 */
export const cookInput = (
  source: CookSource,
  today: string,
  options?: MakeableOptions,
): MakeableInput => {
  const known = new Set(source.ingredients.map((i) => i.id));
  return {
    ingredients: source.ingredients.map((i) => ({
      id: i.id,
      ...(i.parentId !== undefined && known.has(i.parentId) ? { parentId: i.parentId } : {}),
      ...(i.roles !== undefined ? { roles: i.roles } : {}),
    })),
    components: source.components,
    dishes: source.dishes,
    templates: SEED_TEMPLATES,
    stock: source.stock,
    today,
    facts: factsOf(source.ingredients),
    ...(options === undefined ? {} : { options }),
  };
};
