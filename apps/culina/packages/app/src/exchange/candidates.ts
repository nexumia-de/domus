// The one place that says which ingredients an import may point a name at: the notebook's own
// list first, then the entries of the shipped catalogue when the caller has them (the engine's
// `matchIngredients` prefers earlier candidates, so an exact name in the notebook wins).
import type { Candidate, FactsByIngredient } from '@culina/engine';
import { factsByIngredient, listComponents, listIngredients } from '../notebook';
import { factsOf } from '../notebook/build';
import type { IngredientRecord } from '../records';

const candidateOf = (i: IngredientRecord, origin: string): Candidate => ({
  id: i.id,
  name: i.name,
  origin,
  ...(i.parentId === undefined ? {} : { parentId: i.parentId }),
});

/**
 * @param catalogue - The catalogue's entries (parents and foods); an entry already in the notebook
 *   (adopted before) is listed once, as the notebook's.
 */
export const candidateIngredients = (catalogue: readonly IngredientRecord[] = []): Candidate[] => {
  const mine = listIngredients();
  const held = new Set(mine.map((i) => i.id));
  return [
    ...mine.map((i) => candidateOf(i, 'notebook')),
    ...catalogue.filter((e) => !held.has(e.id)).map((e) => candidateOf(e, 'catalogue')),
  ];
};

/** The components a recipe reference (`@./path`) may mean. */
export const candidateComponents = (): Candidate[] =>
  listComponents().map((c) => ({ id: c.id, name: c.name, origin: 'notebook' }));

/** What the ingredients of an import are known to weigh: the notebook's, else the catalogue's. */
export const importFacts = (catalogue: readonly IngredientRecord[] = []): FactsByIngredient => ({
  ...factsOf(catalogue),
  ...factsByIngredient(),
});
