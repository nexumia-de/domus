// Writes an import to the store in one transaction and keeps what Undo needs. Nothing is written
// unless every record is valid; the notebook cache is read again afterwards.
import { EXPORT_KINDS, mergeWrites } from '@culina/engine';
import type { Choice, ExportKind, FullRecordSets, MergePlan } from '@culina/engine';
import { reloadNotebook } from '../notebook';
import { state } from '../notebook/state';
import type { Change } from '../store';
import { fail, type Result } from '../store/types';

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
  const writes = mergeWrites(plan, choices);
  const entries = writes.map((w) => ({ kind: w.kind, record: w.record }));
  const done = await state.store.bulk.putMany(entries);
  if (!done.ok) return done;
  lastChanges = writes.map((w) => priorOf(prior, w.kind, w.record.id));
  await reloadNotebook();
  const added = writes.filter((w) => !prior[w.kind].some((r) => r.id === w.record.id)).length;
  return { ok: true, added, taken: writes.length - added };
}

/** Makes the notebook exactly the file's records; the old ones stay reachable through Undo. */
export async function applyReplace(file: FullRecordSets, prior: FullRecordSets): Promise<Result> {
  if (state.store === undefined) return fail({ code: 'unavailable' });
  const done = await state.store.bulk.replaceAll(file);
  if (!done.ok) return done;
  lastChanges = EXPORT_KINDS.flatMap((kind) => [
    ...prior[kind].map((r) => priorOf(prior, kind, r.id)),
    ...file[kind]
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
