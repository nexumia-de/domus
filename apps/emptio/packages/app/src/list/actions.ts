// What a person does to the list, each as one atomic change of the space's
// collection (the host package's `localChange`): the change is worked out from
// the records as they are stored at that moment, never from what a screen read
// earlier, so a sync cycle or another tab in between is not overwritten. A
// value is changed on a copy of the stored one: fields this app does not know
// are kept.
import { localChange, type Store } from '@nexumia-de/hospes';
import {
  DEFAULT_PRIORITY,
  OTHER_CATEGORY,
  addEntry,
  newEntryCategory,
  type Entry,
  type Priority,
} from '@emptio/engine';
import { CATEGORIES, LIST, entriesOf, isCategoryValue, isEntryValue } from './model';

export interface ListDeps {
  store: Store;
  /** The current time as `YYYY-MM-DDThh:mm:ss.fffZ`. */
  now: () => string;
  /** A new id, never used before. */
  newId: () => string;
}

export interface NewEntry {
  name: string;
  priority?: Priority;
  amount?: string;
  note?: string;
  ingredientId?: string;
  /** Given when the person chose one; otherwise rule 4 decides. */
  categoryId?: string;
}

/** The optional texts of an entry: trimmed, and absent when empty. */
const text = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed === '' ? undefined : trimmed;
};

/** The fields of the data model on top of the stored value; an absent optional field is removed. */
function valueFor(entry: Entry, stored: unknown): Record<string, unknown> {
  const optional = new Set(['ingredientId', 'amount', 'note', 'bought', 'notAt']);
  const foreign =
    stored !== null && typeof stored === 'object'
      ? Object.entries(stored).filter(([field]) => !optional.has(field))
      : [];
  const { id: _id, ...fields } = entry;
  void _id;
  return { ...Object.fromEntries(foreign), ...fields };
}

/**
 * Puts something on the list. What is already open is raised instead (rule 5); the category
 * is the one the household last gave the same thing (rule 4) unless one is given.
 * @returns The id of the entry and whether an open one was raised; null for an empty name.
 */
export async function addToList(
  deps: ListDeps,
  spaceId: string,
  input: NewEntry,
): Promise<{ id: string; joined: boolean } | null> {
  const name = input.name.trim().replace(/\s+/g, ' ');
  if (name === '') return null;
  let result: { id: string; joined: boolean } | null = null;
  await localChange(deps.store, spaceId, LIST, deps.now, (records) => {
    const entries = entriesOf(records);
    const amount = text(input.amount);
    const note = text(input.note);
    const add: Entry = {
      id: deps.newId(),
      name,
      ...(input.ingredientId === undefined ? {} : { ingredientId: input.ingredientId }),
      categoryId:
        input.categoryId ??
        newEntryCategory({
          name,
          ...(input.ingredientId === undefined
            ? {}
            : {
                catalogue: { ingredientId: input.ingredientId, categoryId: OTHER_CATEGORY },
              }),
          earlier: entries,
        }),
      priority: input.priority ?? DEFAULT_PRIORITY,
      ...(amount === undefined ? {} : { amount }),
      ...(note === undefined ? {} : { note }),
      addedAt: deps.now(),
      origins: [{ kind: 'typed' }],
    };
    const { entries: after, joinedWith } = addEntry(entries, add);
    const id = joinedWith ?? add.id;
    const entry = after.find((e) => e.id === id);
    if (entry === undefined) return {};
    result = { id, joined: joinedWith !== null };
    const stored = records.find((r) => r.key === id && r.deleted !== true)?.value;
    return { put: [{ key: id, value: valueFor(entry, stored) }] };
  });
  return result;
}

/** Changes one entry by `change`, which gets the entry as stored now; nothing when it is gone. */
async function changeEntry(
  deps: ListDeps,
  spaceId: string,
  id: string,
  change: (entry: Entry) => Entry | null,
): Promise<boolean> {
  let done = false;
  await localChange(deps.store, spaceId, LIST, deps.now, (records) => {
    const record = records.find((r) => r.key === id && r.deleted !== true);
    if (record === undefined || !isEntryValue(record.value)) return {};
    const changed = change({ ...record.value, id });
    if (changed === null) return {};
    done = true;
    return { put: [{ key: id, value: valueFor(changed, record.value) }] };
  });
  return done;
}

/** Ticks an entry as bought now, or takes the tick away. */
export const setBought = (
  deps: ListDeps,
  spaceId: string,
  id: string,
  bought: boolean,
): Promise<boolean> =>
  changeEntry(deps, spaceId, id, (entry) => {
    if (bought === (entry.bought !== undefined)) return null;
    const { bought: _was, ...open } = entry;
    void _was;
    return bought ? { ...open, bought: { at: deps.now() } } : open;
  });

export interface EntryEdit {
  name: string;
  amount: string;
  note: string;
  priority: Priority;
  categoryId: string;
}

/** Stores what the entry screen holds; an empty name changes nothing. */
export const editEntry = (
  deps: ListDeps,
  spaceId: string,
  id: string,
  edit: EntryEdit,
): Promise<boolean> =>
  changeEntry(deps, spaceId, id, (entry) => {
    const name = edit.name.trim().replace(/\s+/g, ' ');
    if (name === '') return null;
    const { amount: _a, note: _n, ...rest } = entry;
    void _a;
    void _n;
    const amount = text(edit.amount);
    const note = text(edit.note);
    return {
      ...rest,
      name,
      priority: edit.priority,
      categoryId: edit.categoryId,
      ...(amount === undefined ? {} : { amount }),
      ...(note === undefined ? {} : { note }),
    };
  });

export const setPriority = (
  deps: ListDeps,
  spaceId: string,
  id: string,
  priority: Priority,
): Promise<boolean> =>
  changeEntry(deps, spaceId, id, (entry) =>
    entry.priority === priority ? null : { ...entry, priority },
  );

/** Removes entries; their records stay as removal markers. */
export async function removeEntries(
  deps: ListDeps,
  spaceId: string,
  ids: readonly string[],
): Promise<void> {
  if (ids.length === 0) return;
  await localChange(deps.store, spaceId, LIST, deps.now, () => ({ remove: [...ids] }));
}

/**
 * Removes every bought entry, as stored now: one that another device ticked a moment ago
 * goes too, one that was un-ticked meanwhile stays.
 * @returns The removed entries, so the screen can offer to put them back.
 */
export async function clearBought(deps: ListDeps, spaceId: string): Promise<Entry[]> {
  let removed: Entry[] = [];
  await localChange(deps.store, spaceId, LIST, deps.now, (records) => {
    removed = entriesOf(records).filter((entry) => entry.bought !== undefined);
    return { remove: removed.map((entry) => entry.id) };
  });
  return removed;
}

/** Puts removed entries back as they were (Undo); an id that is live again is left alone. */
export async function restoreEntries(
  deps: ListDeps,
  spaceId: string,
  entries: readonly Entry[],
): Promise<void> {
  if (entries.length === 0) return;
  await localChange(deps.store, spaceId, LIST, deps.now, (records) => {
    const live = new Set(records.filter((r) => r.deleted !== true).map((r) => r.key));
    return {
      put: entries
        .filter((entry) => !live.has(entry.id))
        .map((entry) => ({ key: entry.id, value: valueFor(entry, undefined) })),
    };
  });
}

/** Changes the record of a category by `change`, which gets the value as stored now. */
async function changeCategory(
  deps: ListDeps,
  spaceId: string,
  id: string,
  change: (value: Record<string, unknown>) => Record<string, unknown> | null,
): Promise<void> {
  await localChange(deps.store, spaceId, CATEGORIES, deps.now, (records) => {
    const record = records.find((r) => r.key === id && r.deleted !== true);
    const stored =
      record !== undefined && isCategoryValue(record.value)
        ? { ...(record.value as Record<string, unknown>) }
        : {};
    const value = change(stored);
    if (value === null) return {};
    // A starting category that is as shipped again needs no record.
    return Object.keys(value).length === 0 ? { remove: [id] } : { put: [{ key: id, value }] };
  });
}

/** Makes a category of the household's own; null for an empty name. */
export async function addCategory(
  deps: ListDeps,
  spaceId: string,
  name: string,
): Promise<string | null> {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (trimmed === '') return null;
  const id = deps.newId();
  await changeCategory(deps, spaceId, id, () => ({ name: trimmed }));
  return id;
}

/** Gives a category the household's name; an empty name gives a starting one its own back. */
export const renameCategory = (
  deps: ListDeps,
  spaceId: string,
  id: string,
  name: string,
  starting: boolean,
): Promise<void> =>
  changeCategory(deps, spaceId, id, (value) => {
    const trimmed = name.trim().replace(/\s+/g, ' ');
    if (trimmed === '') {
      if (!starting) return null;
      delete value['name'];
      return value;
    }
    return { ...value, name: trimmed };
  });

/** Hides a category from the list and the choices, or shows it again; `other` stays. */
export const setCategoryHidden = (
  deps: ListDeps,
  spaceId: string,
  id: string,
  hidden: boolean,
): Promise<void> =>
  changeCategory(deps, spaceId, id, (value) => {
    if (id === OTHER_CATEGORY) return null;
    if (hidden) return { ...value, hidden: true };
    delete value['hidden'];
    return value;
  });

/**
 * Removes a category of the household's own. Its entries are not touched: an entry whose
 * category is gone counts as `other` (rule 1).
 */
export async function removeCategory(deps: ListDeps, spaceId: string, id: string): Promise<void> {
  await localChange(deps.store, spaceId, CATEGORIES, deps.now, () => ({ remove: [id] }));
}
