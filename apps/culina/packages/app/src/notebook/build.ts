// The view logic's Notebook, built from plain record lists. No state, no store.
import type { FactsByIngredient } from '@culina/engine';
import type { ComponentRecord, IngredientRecord, Notebook } from '../records';
import { appLang } from '../shared/locale';
import { displayName } from '../shared/names';

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
    ingredientName: (id) => {
      const record = byId.get(id);
      return record === undefined ? id : displayName(record, appLang);
    },
    ingredientYields: (id) => byId.get(id)?.yields,
  };
};
