// What the screens read: the same functions the example data module had.
import type { FactsByIngredient } from '@culina/engine';
import type { ComponentRecord, DishRecord, IngredientRecord, Notebook } from '../records';
import { buildNotebook, factsOf } from './build';
import { state } from './state';
import { headsOf, versionRecord } from './versions';

/** Lists show the head of every family; `getComponent` and `getDish` find any version. */
export const listComponents = (): readonly ComponentRecord[] => headsOf('components');
export const getComponent = (id: string): ComponentRecord | undefined =>
  versionRecord('components', id);
export const listDishes = (): readonly DishRecord[] => headsOf('dishes');
export const getDish = (id: string): DishRecord | undefined => versionRecord('dishes', id);
export const listIngredients = (): readonly IngredientRecord[] => state.ingredients;
export const getIngredient = (id: string): IngredientRecord | undefined =>
  state.ingredients.find((i) => i.id === id);

/** The name of an ingredient; the id itself when the record is not there. */
export const ingredientName = (id: string): string => getIngredient(id)?.name ?? id;

export const factsByIngredient = (): FactsByIngredient => factsOf(state.ingredients);

/**
 * What the view logic reads. A stored reference keeps the id it was given; here every version
 * id of a component stands for the head of its family, so a reference follows the current
 * version. `shown` is an older version that is on screen: its id stands for its own content.
 */
export const notebook = (shown?: ComponentRecord): Notebook =>
  buildNotebook(state.ingredients, resolvedComponents(shown));

/** The component list the engine reads: every version id answers with the family's head. */
export const resolvedComponents = (shown?: ComponentRecord): ComponentRecord[] => {
  const heads = new Map(headsOf('components').map((h) => [h.version.family, h]));
  return state.components.map((r) =>
    r.id === shown?.id ? r : { ...(heads.get(r.version.family) ?? r), id: r.id },
  );
};

/** True when there is nothing in the notebook yet (and the store is fine). */
export const isEmpty = (): boolean =>
  state.ingredients.length + state.components.length + state.dishes.length === 0;

/** The code of the problem that kept the store closed, if any. */
export const storeProblem = (): string | undefined => state.problem;
