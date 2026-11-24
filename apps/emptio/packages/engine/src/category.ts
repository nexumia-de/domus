// The order of the categories that rule 1 takes as input
// (docs/engine-rules.md#the-order-of-the-categories). The category of a new entry (rule 4) is in
// the shared list package (packages/list).
import { OTHER_CATEGORY, compareText, sortKey } from '@nexumia-de/list';

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
