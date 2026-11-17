// What ends an edit: save, discard, delete. Save and delete write through the
// store and refresh the browse model before the screen moves on, so the next
// screen already shows the new data. A refusal or a failure keeps everything
// on screen and says why in words (docs/screens-specs.md#spec-editor).

import { back, replace } from '../../navigation';
import { showToast } from '../../toasts';
import {
  asDiffSpec,
  newUserId,
  StoreError,
  systemClock,
  type Ingredient,
  type Spec,
} from '../../store';
import { refreshBrowse } from '../browse/load';
import { diffSpecs, type DiffSpec } from '@mixtura/engine';
import { draftToSpec, idsFor } from './build-spec';
import { checkDraft, type DraftCheck } from './check';
import { newestOfLineage } from './newest';
import { riffNote, saveDraft, versionSaver } from './save';
import { editorStrings as t } from './strings';
import { bump, changed, dirty, dropSession, draftKeyOf, type Ctx } from './session';

const reasonOf = (error: unknown): string =>
  error instanceof StoreError ? error.message : (error as Error).message;

const specAddress = (lineage: string): string => `#/drinks/${encodeURIComponent(lineage)}`;

/** Whether saving would change what the drink is (lines, method, glass, ...), as opposed to its status alone. */
function contentChanged(ctx: Ctx, check: DraftCheck): boolean {
  const target = ctx.session.draft.target;
  if (target.kind !== 'edit') return true;
  const prior = newestOfLineage(ctx.model, target.lineageId)?.spec;
  if (!prior) return true;
  const draft = ctx.session.draft;
  const next = draftToSpec(
    draft,
    check,
    idsFor(draft, () => 'x'),
    'x',
  );
  return !diffSpecs(prior as DiffSpec, asDiffSpec(next)).empty;
}

export function closeSaveSheet(ctx: Ctx): void {
  ctx.session.saveSheet = null;
  ctx.session.focus = 'save';
  bump(ctx.store);
}

/**
 * Save. A changed drink of the user's own first asks for one optional line of
 * note in a sheet (`confirmed` is the sheet's Save); a first save, a riff and
 * a change of status alone do not ask. Nothing changed: nothing is written.
 */
export async function save(ctx: Ctx, confirmed = false): Promise<void> {
  const { session, store, data } = ctx;
  if (session.saving) return;
  const check = checkDraft(ctx.model, session.draft, ctx.imperial);
  if (!check.ok) {
    session.showErrors = true;
    bump(store);
    return;
  }
  const local = data.local();
  if (!local) {
    session.error = t.cannotSave;
    bump(store);
    return;
  }
  const target = session.draft.target;
  if (target.kind === 'edit') {
    if (!dirty(session)) {
      showToast(store, t.nothingToSave);
      return;
    }
    if (!confirmed && contentChanged(ctx, check)) {
      session.saveSheet = { note: session.saveNote };
      session.focus = 'save-note';
      bump(store);
      return;
    }
  }
  if (confirmed) session.saveNote = session.saveSheet?.note ?? session.saveNote;
  session.saveSheet = null;
  const parent = target.kind === 'copy' ? ctx.model.specById.get(target.fromId) : undefined;
  const note = target.kind === 'edit' ? session.saveNote : riffNote(parent);
  session.saving = true;
  session.error = null;
  session.errorRetry = false;
  bump(store);
  try {
    const at = systemClock();
    const saved = await saveDraft(session.draft, check, {
      local,
      saver: versionSaver(local, { ...(note && { note }), at, newId: newUserId }),
      now: () => at,
      newId: newUserId,
    });
    await local.drafts.delete(draftKeyOf(session.key)).catch(() => undefined);
    dropSession(session);
    await refreshBrowse(store, data.catalog());
    showToast(
      store,
      saved.outcome === 'version'
        ? t.savedVersion(saved.name, saved.version)
        : saved.outcome === 'status'
          ? t.statusSaved(saved.name, t.statusValues[saved.status].toLowerCase())
          : saved.outcome === 'nothing'
            ? t.nothingToSave
            : t.saved(saved.name),
    );
    const address = saved.status === 'retired' ? '#/drinks' : specAddress(saved.lineageId);
    if (target.kind === 'edit') back(store, address);
    else replace(store, address);
    bump(store);
  } catch (error) {
    session.saving = false;
    session.errorRetry = true;
    session.error =
      error instanceof StoreError && error.kind === 'referenced'
        ? t.prepared.offRefused(session.draft.name, error.details.join(', '))
        : t.saveFailed(reasonOf(error));
    bump(store);
  }
}

/** Back to the saved drink; Undo brings the changes back (within the session). */
export function discard(ctx: Ctx): void {
  const { session, store, data } = ctx;
  const previous = session.draft;
  session.draft = session.base;
  session.restored = false;
  session.showErrors = false;
  session.error = null;
  session.menu = null;
  session.notes = new Set();
  clearTimeout(session.timer);
  void data
    .local()
    ?.drafts.delete(draftKeyOf(session.key))
    .catch(() => undefined);
  bump(store);
  showToast(store, t.discarded, () => {
    session.draft = previous;
    changed(ctx, true);
  });
}

/** Deletes the drink (and its ingredient record when it is a prepared ingredient). */
export async function deleteDrink(ctx: Ctx): Promise<void> {
  const { session, store, data } = ctx;
  const target = session.draft.target;
  const local = data.local();
  if (target.kind !== 'edit' || !local) return;
  const versions: Spec[] = await local.specs.versionsOf(target.lineageId);
  const ingredientId = session.draft.prepared.ingredientId;
  const ingredient: Ingredient | undefined =
    ingredientId === '' ? undefined : await local.ingredients.get(ingredientId);
  const name = session.draft.name || versions.at(-1)?.name || '';
  let ingredientGone = false;
  try {
    if (ingredient) {
      await local.ingredients.delete(ingredient.id);
      ingredientGone = true;
    }
    await local.specs.deleteLineage(target.lineageId);
  } catch (error) {
    if (ingredient && ingredientGone) await local.ingredients.put(ingredient);
    session.errorRetry = false;
    session.error =
      error instanceof StoreError && error.kind === 'referenced'
        ? t.deleteRefused(name, error.details.join(', '))
        : t.saveFailed(reasonOf(error));
    bump(store);
    return;
  }
  await local.drafts.delete(draftKeyOf(session.key)).catch(() => undefined);
  dropSession(session);
  await refreshBrowse(store, data.catalog());
  replace(store, '#/drinks');
  showToast(store, t.deleted(name), () => {
    void (async () => {
      for (const version of versions) await local.specs.put(version);
      if (ingredient) await local.ingredients.put(ingredient);
      await refreshBrowse(store, data.catalog());
    })();
  });
  bump(store);
}
