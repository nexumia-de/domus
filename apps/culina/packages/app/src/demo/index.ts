// The one access point of the screens to the notebook's records. Today it serves hand-written
// example data; the local store replaces this module without touching the screens.
import type { FactsByIngredient } from '@culina/engine';
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

/** Density and piece weight per ingredient id, for the engine's conversions. */
export const factsByIngredient = (): FactsByIngredient =>
  Object.fromEntries(
    INGREDIENTS.map((i) => [
      i.id,
      {
        ...(i.densityGPerMl === undefined ? {} : { densityGPerMl: i.densityGPerMl.value }),
        ...(i.unitWeightG === undefined ? {} : { unitWeightG: i.unitWeightG.value }),
      },
    ]),
  );

/** What the view logic reads, all from this module. */
export const notebook = (): Notebook => ({
  components: COMPONENTS,
  facts: factsByIngredient(),
  ingredientName,
  ingredientYields: (id) => getIngredient(id)?.yields,
});
