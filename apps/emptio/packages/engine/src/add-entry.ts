// Rule 5, twice the same (docs/engine-rules.md#5-twice-the-same).
import { sameThing } from './category';
import { PRIORITIES } from './priority';
import type { Entry, Origin } from './types';

/** Free texts are never added up: one, the same, or both side by side. */
function joinText(old: string | undefined, added: string | undefined): string | undefined {
  if (old === undefined || old === '') return added === '' ? undefined : added;
  if (added === undefined || added === '' || added === old) return old;
  return `${old} + ${added}`;
}

const originKey = (origin: Origin): string =>
  origin.kind === 'recipe' ? `recipe\0${origin.app}\0${origin.title}` : origin.kind;

function joinOrigins(old: readonly Origin[], added: readonly Origin[]): Origin[] {
  const seen = new Set<string>();
  const out: Origin[] = [];
  for (const origin of [...old, ...added]) {
    const key = originKey(origin);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(origin);
  }
  return out;
}

/**
 * Adds an entry. When an open entry is the same thing no second one is made: the open one is
 * kept with the more pressing priority, both amounts, both notes and the origins of both.
 * @returns The entries after adding, and the id of the entry that was raised, or null.
 */
export function addEntry(
  entries: readonly Entry[],
  add: Entry,
): { entries: Entry[]; joinedWith: string | null } {
  const at = entries.findIndex((entry) => entry.bought === undefined && sameThing(entry, add));
  const open = entries[at];
  if (open === undefined) return { entries: [...entries, add], joinedWith: null };
  const joined: Entry = { ...open };
  if (PRIORITIES.indexOf(add.priority) < PRIORITIES.indexOf(open.priority)) {
    joined.priority = add.priority;
  }
  const amount = joinText(open.amount, add.amount);
  if (amount === undefined) delete joined.amount;
  else joined.amount = amount;
  const note = joinText(open.note, add.note);
  if (note === undefined) delete joined.note;
  else joined.note = note;
  joined.origins = joinOrigins(open.origins, add.origins);
  return { entries: entries.map((entry, i) => (i === at ? joined : entry)), joinedWith: open.id };
}
