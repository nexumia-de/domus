// What the screens read: the same functions the example data module had.
import type { FactsByIngredient } from '@culina/engine';
import type { ComponentRecord, DishRecord, IngredientRecord, Notebook } from '../records';
import { buildNotebook, factsOf } from './build';
import { state } from './state';

export const listComponents = (): readonly ComponentRecord[] => state.components;
export const getComponent = (id: string): ComponentRecord | undefined =>
  state.components.find((c) => c.id === id);
export const listDishes = (): readonly DishRecord[] => state.dishes;
export const getDish = (id: string): DishRecord | undefined =>
  state.dishes.find((d) => d.id === id);
export const listIngredients = (): readonly IngredientRecord[] => state.ingredients;
export const getIngredient = (id: string): IngredientRecord | undefined =>
  state.ingredients.find((i) => i.id === id);

/** The name of an ingredient; the id itself when the record is not there. */
export const ingredientName = (id: string): string => getIngredient(id)?.name ?? id;

export const factsByIngredient = (): FactsByIngredient => factsOf(state.ingredients);

/** What the view logic reads. */
export const notebook = (): Notebook => buildNotebook(state.ingredients, state.components);

/** True when there is nothing in the notebook yet (and the store is fine). */
export const isEmpty = (): boolean =>
  state.ingredients.length + state.components.length + state.dishes.length === 0;

/** The code of the problem that kept the store closed, if any. */
export const storeProblem = (): string | undefined => state.problem;
