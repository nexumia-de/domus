// The save path. Everything the editor writes goes through `saveDraft`, and
// the spec itself through a `SpecSaver`: here a save replaces the stored
// spec in place; the versions issue (#26) swaps in a saver that appends a
// version instead, without the editor changing. A prepared ingredient is
// written as its spec first and its ingredient record second, so the record
// never points at a spec that does not exist (the stores cannot share one
// transaction); a failure between the two leaves an ordinary drink and the
// next save finishes the job.

import type { Ingredient, LocalStore, Repo, Spec } from '../../store';
import { draftToIngredient, draftToSpec, idsFor } from './build-spec';
import type { DraftCheck } from './check';
import type { Draft } from './types';

export interface SpecSaver {
  /** Writes `spec`; `previous` is the stored spec it replaces, when there is one. */
  write(spec: Spec, previous: Spec | undefined): Promise<void>;
}

/** The saver of this issue: the stored spec is replaced. */
export const replaceInPlace = (specs: Repo<Spec>): SpecSaver => ({
  write: (spec) => specs.put(spec),
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
}

export async function saveDraft(draft: Draft, check: DraftCheck, deps: SaveDeps): Promise<Saved> {
  const { local } = deps;
  const ids = idsFor(draft, deps.newId);
  const previous = draft.target.kind === 'edit' ? await local.specs.get(ids.specId) : undefined;
  const wasPrepared = draft.prepared.ingredientId !== '';
  // Turning a prepared ingredient into a plain drink removes its record first; a
  // refusal ("still used by ...") then stops the save before anything changes.
  if (wasPrepared && !draft.prepared.on)
    await local.ingredients.delete(draft.prepared.ingredientId);
  const spec = draftToSpec(draft, check, ids, deps.now());
  await deps.saver.write(spec, previous);
  if (draft.prepared.on) {
    const id = draft.prepared.ingredientId || deps.newId();
    const existing: Ingredient | undefined = wasPrepared
      ? await local.ingredients.get(draft.prepared.ingredientId)
      : undefined;
    await local.ingredients.put(draftToIngredient(draft, check, spec.id, id, existing));
  }
  return { specId: spec.id, lineageId: spec.lineageId, name: spec.name, status: spec.status };
}
