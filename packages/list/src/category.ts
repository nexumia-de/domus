// Rule 4, the category of a new entry (docs/rules.md#4-category-of-a-new-entry), and when two
// things to buy are the same thing (rule 5 reads it too).
import { sortKey } from './sort-key';
import { OTHER_CATEGORY } from './types';
import { usualCategory } from './usual-items';

export interface EarlierEntry {
  id: string;
  name: string;
  ingredientId?: string;
  categoryId: string;
  addedAt: string;
}

export interface CatalogueMatch {
  ingredientId: string;
  categoryId: string;
}

/** Whether two things to buy are the same thing: one ingredient, or free names with one key. */
export function sameThing(
  a: { name: string; ingredientId?: string },
  b: { name: string; ingredientId?: string },
): boolean {
  if (a.ingredientId !== undefined || b.ingredientId !== undefined) {
    return a.ingredientId === b.ingredientId;
  }
  return sortKey(a.name) === sortKey(b.name);
}

/**
 * The category a new entry gets: the one the household last gave the same thing, otherwise
 * the catalogue's, otherwise the one of the usual item the name means, otherwise `other`.
 */
export function newEntryCategory(input: {
  name: string;
  catalogue?: CatalogueMatch;
  earlier: readonly EarlierEntry[];
}): string {
  const wanted =
    input.catalogue === undefined
      ? { name: input.name }
      : { name: input.name, ingredientId: input.catalogue.ingredientId };
  let latest: EarlierEntry | undefined;
  for (const entry of input.earlier) {
    if (!sameThing(wanted, entry)) continue;
    if (
      latest === undefined ||
      entry.addedAt > latest.addedAt ||
      (entry.addedAt === latest.addedAt && entry.id > latest.id)
    ) {
      latest = entry;
    }
  }
  return (
    latest?.categoryId ?? input.catalogue?.categoryId ?? usualCategory(input.name) ?? OTHER_CATEGORY
  );
}
