// Writes an import to the store in one transaction and keeps what Undo needs. Nothing is written
// unless every record is valid; the notebook cache is read again afterwards.
import { EXPORT_KINDS, KIND_SINCE, mergeWrites } from '@culina/engine';
import type { Choice, ExportKind, FullRecordSets, MergePlan } from '@culina/engine';
import { reloadNotebook } from '../notebook';
import { state } from '../notebook/state';
import type { Change } from '../store';
import { fail, type Result } from '../store/types';
import { daysOfLiveDishes, dishFamilies } from './orphan-days';

/** The kinds a file of `fileVersion` can hold; "replace everything" touches these only. */
export const heldKinds = (fileVersion: number): ExportKind[] =>
  EXPORT_KINDS.filter((kind) => (KIND_SINCE[kind] ?? 1) <= fileVersion);

/** What the last import changed, to put right while the Undo toast is on screen. */
let lastChanges: Change[] | undefined;

const priorOf = (prior: FullRecordSets, kind: ExportKind, id: string): Change => {
  const before = prior[kind].find((r) => r.id === id);
  return { kind, id, ...(before === undefined ? {} : { before }) };
};

/** Adds the file's new records and the file's side of the conflicts the user chose. */
export async function applyMerge(
  plan: MergePlan,
  choices: ReadonlyMap<string, Choice>,
  prior: FullRecordSets,
): Promise<Result<{ added: number; taken: number }>> {
  if (state.store === undefined) return fail({ code: 'unavailable' });
  // A day of cooking is taken only for a dish that is here or comes with the file.
  const merged = mergeWrites(plan, choices);
  const families = dishFamilies([
    ...prior.dishes,
    ...merged.filter((w) => w.kind === 'dishes').map((w) => w.record),
  ]);
  const writes = merged.filter(
    (w) => w.kind !== 'cooked' || daysOfLiveDishes([w.record], families).length === 1,
  );
  const entries = writes.map((w) => ({ kind: w.kind, record: w.record }));
  const done = await state.store.bulk.putMany(entries);
  if (!done.ok) return done;
  lastChanges = writes.map((w) => priorOf(prior, w.kind, w.record.id));
  await reloadNotebook();
  const added = writes.filter((w) => !prior[w.kind].some((r) => r.id === w.record.id)).length;
  return { ok: true, added, taken: writes.length - added };
}

/**
 * Makes the notebook exactly the file's records; the old ones stay reachable through Undo. Kinds
 * the file's version could not hold (`heldKinds`) are left as they are: an older file has no skills.
 * The days of cooking are the exception: whatever the file's version, only the days of the dishes
 * the notebook then has stay (the file's own from format 4, the notebook's before), so that a
 * replace leaves no day of a dish it removed.
 */
export async function applyReplace(
  file: FullRecordSets,
  prior: FullRecordSets,
  fileVersion: number,
): Promise<Result> {
  if (state.store === undefined) return fail({ code: 'unavailable' });
  const held = heldKinds(fileVersion);
  const kinds: ExportKind[] = held.includes('cooked') ? held : [...held, 'cooked'];
  const given = Object.fromEntries(kinds.map((kind) => [kind, file[kind]])) as FullRecordSets;
  given.cooked = daysOfLiveDishes(
    held.includes('cooked') ? file.cooked : prior.cooked,
    dishFamilies(file.dishes),
  );
  const done = await state.store.bulk.replaceAll(given);
  if (!done.ok) return done;
  lastChanges = kinds.flatMap((kind) => [
    ...prior[kind].map((r) => priorOf(prior, kind, r.id)),
    ...given[kind]
      .filter((r) => !prior[kind].some((p) => p.id === r.id))
      .map((r) => priorOf(prior, kind, r.id)),
  ]);
  await reloadNotebook();
  return { ok: true };
}

/** Records the changes of a Cooklang import (new ingredients and the component) for Undo. */
export const rememberChanges = (changes: Change[]): void => {
  lastChanges = changes;
};

/** Undo of the last import; false when there is nothing to undo or the store refused. */
export async function undoImport(): Promise<Result> {
  if (state.store === undefined || lastChanges === undefined) return fail({ code: 'unavailable' });
  const changes = lastChanges;
  const done = await state.store.bulk.revert(changes);
  if (done.ok) {
    lastChanges = undefined;
    await reloadNotebook();
  }
  return done;
}
