// The list as the screens see it, read from the records of a space's
// collections (docs/data-model.md). The collections are shared and may come
// from another device, so nothing is trusted: a record whose value is no entry
// is not shown and is left untouched. The entry and its record (`LIST`,
// `entriesOf`, `isEntryValue`) are the shared list package's (packages/list).
import type { CategoryChange } from '@emptio/engine';
import { LIST, type StoredRecord } from '@nexumia-de/list';

/** The collection of what the household changed about categories. */
export const CATEGORIES = 'list-categories';
/** The collection of the KitchenOwl connection and its links (docs/kitchenowl.md). */
export const KITCHENOWL = 'kitchenowl';
export const COLLECTIONS: readonly string[] = [LIST, CATEGORIES, KITCHENOWL];

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const isOptionalText = (value: unknown): boolean =>
  value === undefined || typeof value === 'string';

/** Whether a stored value is a category record: an optional name, an optional `hidden: true`. */
export function isCategoryValue(value: unknown): value is { name?: string; hidden?: true } {
  return (
    isObject(value) &&
    isOptionalText(value['name']) &&
    (value['hidden'] === undefined || value['hidden'] === true)
  );
}

/** What the household changed about categories, among the records. */
export function categoryChangesOf(records: readonly StoredRecord[]): CategoryChange[] {
  const changes: CategoryChange[] = [];
  for (const record of records) {
    if (record.deleted === true || !isCategoryValue(record.value)) continue;
    const name = record.value.name?.trim();
    changes.push({
      id: record.key,
      ...(name === undefined || name === '' ? {} : { name }),
      ...(record.value.hidden === true ? { hidden: true } : {}),
    });
  }
  return changes;
}
