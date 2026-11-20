// Rule 4, the category of a new entry (docs/engine-rules.md#4-category-of-a-new-entry),
// and the order of the categories that rule 1 takes as input.
import { compareText, sortKey } from './sort-key';
import { OTHER_CATEGORY } from './types';

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
 * the catalogue's, otherwise `other`.
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
  return latest?.categoryId ?? input.catalogue?.categoryId ?? OTHER_CATEGORY;
}

/** A category the household made or changed; a starting category has no name of its own. */
export interface CategoryChange {
  id: string;
  name?: string;
  hidden?: boolean;
}

/**
 * The order of the categories: the starting order without the hidden ones, the household's
 * own before `other`, by the sort key of their names and then by id. `other` is always there
 * and always last.
 */
export function categoryOrder(
  starting: readonly string[],
  changes: readonly CategoryChange[],
): string[] {
  const start = new Set(starting);
  const hidden = new Set(
    changes.filter((c) => c.hidden === true && c.id !== OTHER_CATEGORY).map((c) => c.id),
  );
  const own = changes
    .filter((c) => !start.has(c.id) && c.id !== OTHER_CATEGORY && c.hidden !== true)
    .map((c) => ({ id: c.id, key: sortKey(c.name ?? '') }))
    .sort((a, b) => compareText(a.key, b.key) || compareText(a.id, b.id))
    .map((c) => c.id);
  return [
    ...starting.filter((id) => id !== OTHER_CATEGORY && !hidden.has(id)),
    ...own,
    OTHER_CATEGORY,
  ];
}
