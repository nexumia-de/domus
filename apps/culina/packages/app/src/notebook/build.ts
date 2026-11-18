// The view logic's Notebook, built from plain record lists. No state, no store.
import type { FactsByIngredient } from '@culina/engine';
import type { ComponentRecord, IngredientRecord, Notebook } from '../records';

/** Density and piece weight per ingredient id, for the engine's conversions. */
export const factsOf = (ingredients: readonly IngredientRecord[]): FactsByIngredient =>
  Object.fromEntries(
    ingredients.map((i) => [
      i.id,
      {
        ...(i.densityGPerMl === undefined ? {} : { densityGPerMl: i.densityGPerMl.value }),
        ...(i.unitWeightG === undefined ? {} : { unitWeightG: i.unitWeightG.value }),
      },
    ]),
  );

export const buildNotebook = (
  ingredients: readonly IngredientRecord[],
  components: readonly ComponentRecord[],
): Notebook => {
  const byId = new Map(ingredients.map((i) => [i.id, i]));
  return {
    components,
    facts: factsOf(ingredients),
    ingredientName: (id) => byId.get(id)?.name ?? id,
    ingredientYields: (id) => byId.get(id)?.yields,
  };
};
