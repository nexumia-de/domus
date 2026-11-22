// The list as the screens see it, read from the records of a space's
// collections (docs/data-model.md). The collections are shared and may come
// from another device, so nothing is trusted: a record whose value is no entry
// is not shown and is left untouched.
import { isPriority, type CategoryChange, type Entry, type Origin } from '@emptio/engine';

/** One record of a collection, as the shared database keeps it. */
export interface StoredRecord {
  key: string;
  updatedAt: string;
  deleted?: true;
  value?: unknown;
}

/** The collection of the entries: the file `list.json` of a space. */
export const LIST = 'list';
/** The collection of what the household changed about categories. */
export const CATEGORIES = 'list-categories';
/** The collection of the KitchenOwl connection and its links (docs/kitchenowl.md). */
export const KITCHENOWL = 'kitchenowl';
export const COLLECTIONS: readonly string[] = [LIST, CATEGORIES, KITCHENOWL];

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const isText = (value: unknown): value is string => typeof value === 'string';
const isOptionalText = (value: unknown): boolean => value === undefined || isText(value);

const TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
const isTime = (value: unknown): value is string => isText(value) && TIME.test(value);

function isOrigin(value: unknown): value is Origin {
  if (!isObject(value)) return false;
  if (value['kind'] === 'typed' || value['kind'] === 'staple') return true;
  return value['kind'] === 'recipe' && isText(value['app']) && isText(value['title']);
}

/** Whether a stored value is an entry of the data model; unknown fields do not matter. */
export function isEntryValue(value: unknown): value is Omit<Entry, 'id'> {
  if (!isObject(value)) return false;
  const bought = value['bought'];
  const notAt = value['notAt'];
  return (
    isText(value['name']) &&
    value['name'].trim() !== '' &&
    isText(value['categoryId']) &&
    isPriority(value['priority']) &&
    isTime(value['addedAt']) &&
    Array.isArray(value['origins']) &&
    value['origins'].length > 0 &&
    value['origins'].every(isOrigin) &&
    isOptionalText(value['ingredientId']) &&
    isOptionalText(value['amount']) &&
    isOptionalText(value['note']) &&
    (bought === undefined ||
      (isObject(bought) && isTime(bought['at']) && isOptionalText(bought['storeId']))) &&
    (notAt === undefined || (Array.isArray(notAt) && notAt.every(isText)))
  );
}

/** The entries among the records: live ones with a valid value. */
export function entriesOf(records: readonly StoredRecord[]): Entry[] {
  const entries: Entry[] = [];
  for (const record of records) {
    if (record.deleted === true || !isEntryValue(record.value)) continue;
    entries.push({ ...record.value, id: record.key });
  }
  return entries;
}

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
