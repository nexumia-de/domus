// Rule 1, order at home (docs/engine-rules.md#1-order-at-home).
import { OTHER_CATEGORY, PRIORITIES, compareText, sortKey, type Priority } from '@nexumia-de/list';

/** What the order reads of an entry. */
export interface OrderEntry {
  id: string;
  name: string;
  categoryId: string;
  priority: Priority;
  bought?: { at: string };
}

/**
 * The position of a category in the order; one that is not in it counts as `other`, and
 * when `other` is missing too it comes after everything.
 */
export function categoryPosition(categoryOrder: readonly string[], categoryId: string): number {
  const at = categoryOrder.indexOf(categoryId);
  if (at >= 0) return at;
  const other = categoryOrder.indexOf(OTHER_CATEGORY);
  return other >= 0 ? other : categoryOrder.length;
}

/**
 * The entries in the order of the list at home: open ones by priority, category, name and
 * id; bought ones after them, the latest first.
 */
export function homeOrder<T extends OrderEntry>(
  entries: readonly T[],
  categoryOrder: readonly string[],
): T[] {
  const open = entries
    .filter((entry) => entry.bought === undefined)
    .map((entry) => ({
      entry,
      priority: PRIORITIES.indexOf(entry.priority),
      category: categoryPosition(categoryOrder, entry.categoryId),
      key: sortKey(entry.name),
    }))
    .sort(
      (a, b) =>
        a.priority - b.priority ||
        a.category - b.category ||
        compareText(a.key, b.key) ||
        compareText(a.entry.id, b.entry.id),
    )
    .map(({ entry }) => entry);
  const bought = entries
    .filter((entry) => entry.bought !== undefined)
    .sort((a, b) => compareText(b.bought?.at ?? '', a.bought?.at ?? '') || compareText(a.id, b.id));
  return [...open, ...bought];
}
