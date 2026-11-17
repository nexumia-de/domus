// The save path. Everything the editor writes goes through `saveDraft`, and
// the spec itself through a `SpecSaver`: the editor's saver appends a
// version (#26), the older "replace in place" saver is gone. A prepared ingredient is
// written as its spec first and its ingredient record second, so the record
// never points at a spec that does not exist (the stores cannot share one
// transaction); a failure between the two leaves an ordinary drink and the
// next save finishes the job.

import { diffSpecs } from '@mixtura/engine';
import {
  appendVersion,
  asDiffSpec,
  setStatus,
  type Ingredient,
  type LocalStore,
  type Spec,
} from '../../store';
import { draftToIngredient, draftToSpec, idsFor } from './build-spec';
import type { DraftCheck } from './check';
import { editorStrings } from './strings';
import type { Draft } from './types';

export interface SpecSaver {
  /** Writes `spec`; `previous` is the stored newest version it follows, when there is one. Returns what is stored. */
  write(spec: Spec, previous: Spec | undefined): Promise<Spec>;
}

/** The note a first version of a riff or of the user's copy of a built-in drink starts with. */
export const riffNote = (
  parent: { name: string; version: number } | undefined,
): string | undefined => (parent ? editorStrings.riffNote(parent.name, parent.version) : undefined);

/**
 * The saver of the editor: a first save writes version 1 with the status log
 * started; a save that changed the content appends the next version with the
 * user's note; a save that changed only the status sets it on the newest
 * version (not a new version); a save with nothing changed writes nothing.
 */
export const versionSaver = (
  local: LocalStore,
  options: { note?: string; at: string; newId(): string },
): SpecSaver => ({
  async write(spec, previous) {
    if (!previous) {
      return appendVersion(local, spec, {
        id: spec.id,
        at: options.at,
        ...(options.note && { note: options.note }),
      });
    }
    const diff = diffSpecs(asDiffSpec(previous), asDiffSpec(spec));
    if (diff.empty) {
      if (previous.status === spec.status) return previous;
      return (await setStatus(local, previous.lineageId, spec.status, options.at)) ?? previous;
    }
    return appendVersion(local, spec, {
      id: options.newId(),
      at: options.at,
      ...(options.note && { note: options.note }),
    });
  },
});

export interface SaveDeps {
  local: LocalStore;
  saver: SpecSaver;
  now(): string;
  newId(): string;
}

export interface Saved {
  specId: string;
  lineageId: string;
  name: string;
  status: Spec['status'];
  version: number;
  /** What the save did: wrote a first version, appended one, changed only the status, or wrote nothing. */
  outcome: 'created' | 'version' | 'status' | 'nothing';
}

export async function saveDraft(draft: Draft, check: DraftCheck, deps: SaveDeps): Promise<Saved> {
  const { local } = deps;
  const ids = idsFor(draft, deps.newId);
  const previous =
    draft.target.kind === 'edit' ? (await local.specs.versionsOf(ids.lineageId)).at(-1) : undefined;
  const wasPrepared = draft.prepared.ingredientId !== '';
  // Turning a prepared ingredient into a plain drink removes its record first; a
  // refusal ("still used by ...") then stops the save before anything changes.
  if (wasPrepared && !draft.prepared.on)
    await local.ingredients.delete(draft.prepared.ingredientId);
  const spec = await deps.saver.write(draftToSpec(draft, check, ids, deps.now()), previous);
  if (draft.prepared.on) {
    const id = draft.prepared.ingredientId || deps.newId();
    const existing: Ingredient | undefined = wasPrepared
      ? await local.ingredients.get(draft.prepared.ingredientId)
      : undefined;
    await local.ingredients.put(draftToIngredient(draft, check, spec.id, id, existing));
  }
  const outcome: Saved['outcome'] = !previous
    ? 'created'
    : spec.id !== previous.id
      ? 'version'
      : previous.status !== draft.status
        ? 'status'
        : 'nothing';
  return {
    specId: spec.id,
    lineageId: spec.lineageId,
    name: spec.name,
    status: spec.status,
    version: spec.version,
    outcome,
  };
}
