// What the quick entry offers to tick: the notebook's own ingredients and components (heads),
// filtered by the search text. The catalogue is a section of its own (screens/editor).
import type { ComponentRef } from '@culina/engine';
import { appLang } from '../shared/locale';
import { displayName, type NamesByLanguage } from '../shared/names';
import { filterByName } from '../shared/search';

export interface Candidate {
  ref: ComponentRef;
  name: string;
}

const byName = (a: Candidate, b: Candidate): number =>
  a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }) || (a.name < b.name ? -1 : 1);

export const candidates = (
  ingredients: readonly { id: string; name: string; names?: NamesByLanguage }[],
  components: readonly { id: string; name: string }[],
  query: string,
): Candidate[] =>
  filterByName(
    [
      ...ingredients.map((i): Candidate => ({
        ref: { kind: 'ingredient', id: i.id },
        name: displayName(i, appLang),
      })),
      ...components.map((c): Candidate => ({ ref: { kind: 'component', id: c.id }, name: c.name })),
    ],
    query,
  ).sort(byName);
