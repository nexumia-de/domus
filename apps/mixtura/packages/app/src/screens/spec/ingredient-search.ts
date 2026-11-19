// Searching the ingredient tree by name and showing where an ingredient
// sits in it; the swap sheet and the editor's picker share this.

import { ancestors } from '@mixtura/engine';
import { normalise } from '../browse/normalise';
import type { BrowseModel } from '../browse/model';

/** The place in the tree, "Spirits › Rum". */
export function pathOf(model: BrowseModel, id: string): string {
  const chain = (ancestors(model.tree, id) ?? []).slice().reverse();
  return chain.map((a) => model.ingredientName(a) ?? a).join(' › ');
}

/**
 * Ingredient ids whose name contains every word of `query` (accents and case
 * ignored), names starting with the first word first, then alphabetical.
 */
export function searchIngredients(model: BrowseModel, query: string): string[] {
  const words = normalise(query).split(' ').filter(Boolean);
  if (words.length === 0) return [];
  const nameOf = (id: string): string => model.ingredientName(id) ?? id;
  const rank = (id: string): number => (normalise(nameOf(id)).startsWith(words[0] ?? '') ? 0 : 1);
  return model.tree.ids
    .filter((id) => {
      const text = normalise(nameOf(id));
      return words.every((w) => text.includes(w));
    })
    .sort(
      (a, b) =>
        rank(a) - rank(b) || nameOf(a).localeCompare(nameOf(b), 'en', { sensitivity: 'base' }),
    );
}
