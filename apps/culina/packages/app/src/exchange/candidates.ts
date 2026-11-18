// The one place that says which ingredients an import may point a name at. Today that is the
// notebook's own list; a shipped ingredient catalogue is added here later, after the notebook's
// ingredients (the engine's `matchIngredients` prefers earlier candidates).
import type { Candidate } from '@culina/engine';
import { listComponents, listIngredients } from '../notebook';

export const candidateIngredients = (): Candidate[] =>
  listIngredients().map((i) => ({
    id: i.id,
    name: i.name,
    origin: 'notebook',
    ...(i.parentId === undefined ? {} : { parentId: i.parentId }),
  }));

/** The components a recipe reference (`@./path`) may mean. */
export const candidateComponents = (): Candidate[] =>
  listComponents().map((c) => ({ id: c.id, name: c.name, origin: 'notebook' }));
