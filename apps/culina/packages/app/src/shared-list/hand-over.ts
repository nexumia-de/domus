// Handing what a dish lacks to the household's shopping list (roadmap goal 11): the entries go
// into the collection `list` of the space Culina uses, in one atomic change (all lines or none).
// That is not always the space Emptio shows: each app keeps its own choice of space, so with two
// spaces the result names the space written to, for the screen to say. The list's rules are the shared list package's (`planAdds`: rule 4 for the
// category, rule 5 for what is already open); Culina adds only two of its own: a line whose open
// entry already names this dish is not handed again, and Undo works from the stored values, so an
// entry ticked or edited in Emptio in between is left as it is. No screen uses it yet.
import {
  LIST,
  entryName,
  entriesOf,
  planAdds,
  sameThing,
  type AddInput,
  type Origin,
} from '@nexumia-de/list';
import type { LocalEdit } from '@nexumia-de/hospes';
import { liveValue, type Decision, type SyncRecord } from '../shared-stock/edits';
import type { ChangeResult, StockSpace } from '../shared-stock/space';

/**
 * What happened to one line: a new entry, joined to an open one, already there for this dish, or
 * nothing because its name is empty.
 */
export type HandOverOutcome = 'added' | 'joined' | 'already' | 'empty';

/** One line of a hand-over as the screen reads it. */
export interface HandOverLine {
  name: string;
  outcome: HandOverOutcome;
  /** The entry the line is on the list as; absent for `empty`. */
  id?: string;
  /**
   * For `already`: the amount on the list now and the amount this hand-over asked for, so that
   * the screen can say when they differ (the dish handed again at other portions).
   */
  listed?: string;
  asked?: string;
}

/** One record the hand-over wrote: its value before (undefined: none) and the value written. */
export interface ListWrite {
  key: string;
  before: unknown;
  after: unknown;
}

/** What Undo needs: the space and the records written. */
export interface ListUndo {
  spaceId: string;
  writes: ListWrite[];
}

export interface HandOver {
  /** Per input, in order: its name, what happened, and the entry it is on the list as. */
  lines: HandOverLine[];
  /** The space written to, for the screen to name (it may not be the one Emptio shows). */
  space: { id: string; name: string };
  undo: ListUndo;
}

/** Whether two stored values are the same, whatever the order of their fields. */
export function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b))
    return a.length === b.length && a.every((x, i) => sameValue(x, b[i]));
  const ka = Object.keys(a).filter((k) => (a as Record<string, unknown>)[k] !== undefined);
  const kb = Object.keys(b).filter((k) => (b as Record<string, unknown>)[k] !== undefined);
  return (
    ka.length === kb.length &&
    ka.every((k) => sameValue((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
  );
}

const recipes = (origins: readonly Origin[] | undefined) =>
  (origins ?? []).flatMap((o) => (o.kind === 'recipe' ? [o] : []));

/**
 * Whether a stored origin is the dish an input names: by the dish key where both carry one (the
 * same dish in any language, and two dishes of one title apart), else by the title.
 */
const sameDish = (stored: Origin, asked: Extract<Origin, { kind: 'recipe' }>): boolean => {
  if (stored.kind !== 'recipe' || stored.app !== asked.app) return false;
  const a = typeof stored.dish === 'string' ? stored.dish : undefined;
  const b = typeof asked.dish === 'string' ? asked.dish : undefined;
  return a !== undefined && b !== undefined ? a === b : stored.title === asked.title;
};

/**
 * The change of a hand-over, decided from the records as stored now. A line whose open entry is
 * the same thing and already carries this line's recipe origin is `already` and not written, so
 * handing a dish twice changes nothing.
 */
export const handOverEdit = (
  records: readonly SyncRecord[],
  inputs: readonly AddInput[],
  deps: { now: () => string; newId: () => string },
): Decision<{ lines: HandOverLine[]; writes: ListWrite[] }> => {
  const open = entriesOf(records).filter((e) => e.bought === undefined);
  const lines: HandOverLine[] = [];
  const toPlan: AddInput[] = [];
  const planned: number[] = [];
  inputs.forEach((input, i) => {
    if (entryName(input.name) === '') {
      lines.push({ name: input.name, outcome: 'empty' });
      return;
    }
    const asked = recipes(input.origins);
    const there = open.find(
      (e) =>
        sameThing(e, input) &&
        asked.length > 0 &&
        asked.every((a) => e.origins.some((o) => sameDish(o, a))),
    );
    if (there === undefined) {
      lines.push({ name: input.name, outcome: 'added' });
      toPlan.push(input);
      planned.push(i);
      return;
    }
    lines.push({
      name: input.name,
      outcome: 'already',
      id: there.id,
      ...(there.amount === undefined ? {} : { listed: there.amount }),
      ...(input.amount === undefined ? {} : { asked: input.amount.trim() }),
    });
  });
  const { put, plans } = planAdds(records, toPlan, deps);
  plans.forEach((plan, j) => {
    const at = planned[j] as number;
    const line = lines[at];
    if (line === undefined) return;
    // Names were checked above; a plan of nothing is an empty name all the same.
    if (plan === null) {
      lines[at] = { name: line.name, outcome: 'empty' };
      return;
    }
    // A line joined to an entry this same hand-over made counts as added with it.
    const made = plans.slice(0, j).some((p) => p !== null && !p.joined && p.id === plan.id);
    lines[at] = {
      name: line.name,
      outcome: plan.joined && !made ? 'joined' : 'added',
      id: plan.id,
    };
  });
  const writes = put.map((p) => ({
    key: p.key,
    before: liveValue(records, p.key),
    after: p.value,
  }));
  const edit: LocalEdit = put.length === 0 ? {} : { put };
  return { edit, outcome: { lines, writes } };
};

/** What Undo did, by the keys of the entries the hand-over wrote. */
export interface UndoOutcome {
  /** Taken back: removed from the list, or put back as it was (`restored`). */
  undone: string[];
  /** Left: ticked, edited or removed since (`gone`: no longer on the list at all). */
  kept: string[];
  /** Of `undone`: entries that were there before the hand-over and are again as they were. */
  restored: string[];
  /** Of `kept`: entries no longer on the list (removed in the shopping list since). */
  gone: string[];
  /** Of `kept`: entries ticked as bought since. */
  bought: string[];
}

/**
 * What several Undos of one page did, per entry: the outcome of the oldest hand-over that wrote
 * it, which is the last to be taken back and leaves the entry as it ends. An entry the newer one
 * put back as it was and the older one then removed is removed.
 * @param outcomes - Newest first, in the order the Undos ran.
 */
export const finalOutcome = (outcomes: readonly UndoOutcome[]): UndoOutcome => {
  const last = new Map<string, 'removed' | 'restored' | 'changed' | 'gone' | 'bought'>();
  for (const o of outcomes) {
    const restored = new Set(o.restored);
    const gone = new Set(o.gone);
    const bought = new Set(o.bought);
    for (const key of o.undone) last.set(key, restored.has(key) ? 'restored' : 'removed');
    for (const key of o.kept)
      last.set(key, gone.has(key) ? 'gone' : bought.has(key) ? 'bought' : 'changed');
  }
  const out: UndoOutcome = { undone: [], kept: [], restored: [], gone: [], bought: [] };
  for (const [key, state] of last) {
    if (state === 'removed' || state === 'restored') out.undone.push(key);
    else out.kept.push(key);
    if (state === 'restored') out.restored.push(key);
    if (state === 'gone') out.gone.push(key);
    if (state === 'bought') out.bought.push(key);
  }
  return out;
};

/**
 * Undo of a hand-over, from the stored values: a record that is still exactly what the
 * hand-over wrote goes back (a new entry is removed, a joined one gets its value before); one
 * that was ticked, edited or removed since is left as it is.
 */
export const undoHandOverEdit = (
  records: readonly SyncRecord[],
  writes: readonly ListWrite[],
): Decision<UndoOutcome> => {
  const put: { key: string; value: unknown }[] = [];
  const remove: string[] = [];
  const outcome: UndoOutcome = { undone: [], kept: [], restored: [], gone: [], bought: [] };
  for (const write of writes) {
    const now = liveValue(records, write.key);
    if (now === undefined || !sameValue(now, write.after)) {
      outcome.kept.push(write.key);
      if (now === undefined) outcome.gone.push(write.key);
      else if ((now as { bought?: unknown }).bought !== undefined) outcome.bought.push(write.key);
      continue;
    }
    outcome.undone.push(write.key);
    if (write.before === undefined) remove.push(write.key);
    else {
      put.push({ key: write.key, value: write.before });
      outcome.restored.push(write.key);
    }
  }
  return { edit: { put, remove }, outcome };
};

/**
 * Puts what a dish lacks on the list of the space Culina uses, all lines in one atomic change.
 * @returns Per line whether it was added, joined an open entry or was already there for this
 *   dish, and what Undo needs; `unavailable` when there is no space or the write failed (then
 *   nothing was written).
 */
export const handOver = (
  space: StockSpace,
  inputs: readonly AddInput[],
  deps: { now: () => string; newId: () => string },
): Promise<ChangeResult<HandOver>> =>
  space
    .change((records) => handOverEdit(records, inputs, deps), { collection: LIST })
    .then((result) => {
      if (!result.ok) return result;
      const { lines, writes } = result.outcome;
      return {
        ok: true,
        spaceId: result.spaceId,
        spaceName: result.spaceName,
        outcome: {
          lines,
          space: { id: result.spaceId, name: result.spaceName },
          undo: { spaceId: result.spaceId, writes },
        },
      };
    });

/** Takes a hand-over back as far as the list still holds what it wrote (`undoHandOverEdit`). */
export const undoHandOver = (
  space: StockSpace,
  undo: ListUndo,
): Promise<ChangeResult<UndoOutcome>> =>
  space.change((records) => undoHandOverEdit(records, undo.writes), {
    collection: LIST,
    spaceId: undo.spaceId,
  });
