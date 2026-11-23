// What the schema cannot say about a recipe answer: names that must point at a component of the
// same recipe. Each problem names its recipe and the place, so the app writes one sentence each.
import { normaliseName } from '../exchange/match';
import type { RecipeAnswer, RecipeEntry } from './types';

export type RecipeProblemCode =
  /** Two components of one recipe have the same name. */
  | 'duplicate-component'
  /** A slot names a component the recipe does not have. */
  | 'unknown-component'
  /** An alternative names a component the recipe does not have. */
  | 'unknown-alternative'
  /** An alternative is a component that fills a slot itself. */
  | 'alternative-in-slot'
  /** A component is listed as an alternative by two slots. */
  | 'alternative-twice'
  /** A slot filled by an ingredient lists alternatives. */
  | 'alternatives-on-ingredient'
  /** A slot filled by a component states an amount (the dish takes the component's whole run). */
  | 'amount-on-component'
  /** With slots given, a component is in no slot and no slot's alternative. */
  | 'component-unused';

export interface RecipeProblem {
  code: RecipeProblemCode;
  /** Index of the recipe in the answer. */
  recipe: number;
  /** Index of the slot, where the problem is one. */
  slot?: number;
  /** The name concerned, as written. */
  name: string;
}

function checkRecipe(recipe: RecipeEntry, index: number): RecipeProblem[] {
  const problems: RecipeProblem[] = [];
  const add = (code: RecipeProblemCode, name: string, slot?: number): void => {
    problems.push({ code, recipe: index, name, ...(slot === undefined ? {} : { slot }) });
  };
  const names = new Set<string>();
  for (const c of recipe.components) {
    const key = normaliseName(c.name);
    if (names.has(key)) add('duplicate-component', c.name);
    names.add(key);
  }
  const slots = recipe.slots ?? [];
  if (slots.length === 0) return problems;
  const filled = new Set<string>();
  for (const [i, slot] of slots.entries()) {
    if (slot.component === undefined) continue;
    if (slot.amount !== undefined) add('amount-on-component', slot.component, i);
    const key = normaliseName(slot.component);
    if (!names.has(key)) add('unknown-component', slot.component, i);
    filled.add(key);
  }
  const alternative = new Set<string>();
  for (const [i, slot] of slots.entries()) {
    const alternatives = slot.alternatives ?? [];
    if (alternatives.length > 0 && slot.component === undefined) {
      add('alternatives-on-ingredient', slot.ingredient ?? '', i);
      continue;
    }
    for (const name of alternatives) {
      const key = normaliseName(name);
      if (!names.has(key)) add('unknown-alternative', name, i);
      else if (filled.has(key)) add('alternative-in-slot', name, i);
      else if (alternative.has(key)) add('alternative-twice', name, i);
      alternative.add(key);
    }
  }
  for (const c of recipe.components) {
    const key = normaliseName(c.name);
    if (!filled.has(key) && !alternative.has(key)) add('component-unused', c.name);
  }
  return problems;
}

/** The problems of an answer that passed the schema, in recipe order; none when it can be read. */
export const checkRecipes = (answer: RecipeAnswer): RecipeProblem[] =>
  answer.recipes.flatMap((recipe, i) => checkRecipe(recipe, i));
