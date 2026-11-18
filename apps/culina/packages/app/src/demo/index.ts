// The example set as plain data, with the same reading functions the notebook has. The screens
// do not use it: it reaches the store through "Add example data" (src/notebook/examples.ts), and
// the tests and the browser fixture read the examples from here.
import type { FactsByIngredient } from '@culina/engine';
import { buildNotebook, factsOf } from '../notebook/build';
import type { ComponentRecord, DishRecord, IngredientRecord, Notebook } from '../records';
import { COMPONENTS } from './components';
import { DISHES } from './dishes';
import { INGREDIENTS } from './ingredients';

export const listComponents = (): readonly ComponentRecord[] => COMPONENTS;
export const getComponent = (id: string): ComponentRecord | undefined =>
  COMPONENTS.find((c) => c.id === id);
export const listDishes = (): readonly DishRecord[] => DISHES;
export const getDish = (id: string): DishRecord | undefined => DISHES.find((d) => d.id === id);
export const listIngredients = (): readonly IngredientRecord[] => INGREDIENTS;
export const getIngredient = (id: string): IngredientRecord | undefined =>
  INGREDIENTS.find((i) => i.id === id);

/** The name of an ingredient; the id itself when the record is not there. */
export const ingredientName = (id: string): string => getIngredient(id)?.name ?? id;

export const factsByIngredient = (): FactsByIngredient => factsOf(INGREDIENTS);

export const notebook = (): Notebook => buildNotebook(INGREDIENTS, COMPONENTS);
