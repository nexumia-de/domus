// Reads every record of the store into the cache. Used at startup and after an import.
import type { SkillRecord } from '@culina/engine';
import type { Store } from '../store';
import type { ComponentRecord, DishRecord, IngredientRecord, TastingRecord } from '../records';
import { emit, sorted, state } from './state';

export const load = async (store: Store): Promise<boolean> => {
  // Stock is not read here: it is the shared collection of a space (src/shared-stock).
  const [ingredients, components, dishes, tastings, skills] = await Promise.all([
    store.list('ingredients'),
    store.list('components'),
    store.list('dishes'),
    store.list('tastings'),
    store.list('skills'),
  ]);
  if (!ingredients.ok) return false;
  if (!components.ok || !dishes.ok || !tastings.ok || !skills.ok) return false;
  state.ingredients = sorted(ingredients.records as unknown as IngredientRecord[]);
  state.components = sorted(components.records as unknown as ComponentRecord[]);
  state.dishes = sorted(dishes.records as unknown as DishRecord[]);
  state.tastings = tastings.records as unknown as TastingRecord[];
  state.skills = skills.records as unknown as SkillRecord[];
  return true;
};

/** Reads the cache again from the store (after an import or its Undo) and tells the screens. */
export const reloadNotebook = async (): Promise<boolean> => {
  if (state.store === undefined) return false;
  const done = await load(state.store);
  emit();
  return done;
};
