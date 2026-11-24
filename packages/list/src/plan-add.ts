// What putting something on the list writes (docs/rules.md#putting-something-on-the-list): rules
// 4 and 5 applied to the records as they are stored now. Pure: the caller runs it inside one
// atomic change of the collection (the host package's `localChange`), with the clock and the ids
// as input, so that the logic exists once for every app that writes the list.
import { addEntry } from './add-entry';
import { newEntryCategory, type CatalogueMatch } from './category';
import { DEFAULT_PRIORITY, type Priority } from './priority';
import { entriesOf, type StoredRecord } from './record';
import { OTHER_CATEGORY, type Entry, type Origin } from './types';

/** What a person or an app asks to put on the list. */
export interface AddInput {
  name: string;
  priority?: Priority;
  amount?: string;
  note?: string;
  ingredientId?: string;
  /** Given when the person chose one; otherwise rule 4 decides. */
  categoryId?: string;
  /**
   * The catalogue's match for rule 4, step 2. Absent with an `ingredientId`: the ingredient with
   * the category `other` (what Emptio has always passed); absent without one: no match.
   */
  catalogue?: CatalogueMatch;
  /** Why it is on the list; default: typed by a person. */
  origins?: readonly Origin[];
}

export interface PlanDeps {
  /** The current time as `YYYY-MM-DDThh:mm:ss.fffZ`. */
  now: () => string;
  /** A new id, never used before. */
  newId: () => string;
}

/** One record to write. */
export interface Put {
  key: string;
  value: Record<string, unknown>;
}

export interface AddPlan {
  /** The record to write: the new entry, or the open one it joined. */
  put: Put;
  /** The id of that entry. */
  id: string;
  /** Whether an open entry of the same thing was raised instead of a new one made (rule 5). */
  joined: boolean;
  /** The entry as written. */
  entry: Entry;
}

/** A name as stored: no spaces at the ends, runs of spaces as one. */
export const entryName = (name: string): string => name.trim().replace(/\s+/g, ' ');

/** The optional texts of an entry: trimmed, and absent when empty. */
const text = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed === '' ? undefined : trimmed;
};

/** The fields of the data model on top of the stored value; an absent optional field is removed. */
export function valueFor(entry: Entry, stored: unknown): Record<string, unknown> {
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
 * Puts something on the list. What is already open is raised instead (rule 5); the category is
 * the one the household last gave the same thing (rule 4) unless one is given. A field another
 * app wrote into the joined entry's record is kept.
 * @param records - The records of the collection `list` as stored now.
 * @returns The record to write and what it is; null for an empty name.
 */
export function planAdd(
  records: readonly StoredRecord[],
  input: AddInput,
  deps: PlanDeps,
): AddPlan | null {
  const name = entryName(input.name);
  if (name === '') return null;
  const entries = entriesOf(records);
  const amount = text(input.amount);
  const note = text(input.note);
  const catalogue: CatalogueMatch | undefined =
    input.catalogue ??
    (input.ingredientId === undefined
      ? undefined
      : { ingredientId: input.ingredientId, categoryId: OTHER_CATEGORY });
  const add: Entry = {
    id: deps.newId(),
    name,
    ...(input.ingredientId === undefined ? {} : { ingredientId: input.ingredientId }),
    categoryId:
      input.categoryId ??
      newEntryCategory({
        name,
        ...(catalogue === undefined ? {} : { catalogue }),
        earlier: entries,
      }),
    priority: input.priority ?? DEFAULT_PRIORITY,
    ...(amount === undefined ? {} : { amount }),
    ...(note === undefined ? {} : { note }),
    addedAt: deps.now(),
    origins: input.origins === undefined ? [{ kind: 'typed' }] : [...input.origins],
  };
  const { entries: after, joinedWith } = addEntry(entries, add);
  const id = joinedWith ?? add.id;
  const entry = after.find((e) => e.id === id);
  if (entry === undefined) return null;
  const stored = records.find((r) => r.key === id && r.deleted !== true)?.value;
  return {
    put: { key: id, value: valueFor(entry, stored) },
    id,
    joined: joinedWith !== null,
    entry,
  };
}

/**
 * Several things in one change: each through `planAdd` on the records as the ones before left
 * them, so two lines of the same thing make one entry.
 * @returns One put per entry written (the last value of each key) and the plan of each input,
 *   null for an empty name.
 */
export function planAdds(
  records: readonly StoredRecord[],
  inputs: readonly AddInput[],
  deps: PlanDeps,
): { put: Put[]; plans: (AddPlan | null)[] } {
  let current: StoredRecord[] = [...records];
  const puts = new Map<string, Put>();
  const plans: (AddPlan | null)[] = [];
  for (const input of inputs) {
    const plan = planAdd(current, input, deps);
    plans.push(plan);
    if (plan === null) continue;
    puts.set(plan.id, plan.put);
    const record: StoredRecord = { key: plan.id, updatedAt: '', value: plan.put.value };
    // In its place, so that the first open entry of a thing stays the first (rule 5 joins it).
    current = current.some((r) => r.key === plan.id)
      ? current.map((r) => (r.key === plan.id ? record : r))
      : [...current, record];
  }
  return { put: [...puts.values()], plans };
}
