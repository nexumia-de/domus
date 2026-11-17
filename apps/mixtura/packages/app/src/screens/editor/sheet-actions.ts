// The two sheets over the editor: the ingredient picker and the form that
// adds or edits one of the user's ingredients. A sheet is the address
// parameter `sheet` (`pick`, `ingredient`): one history entry on a phone, so
// Back closes it; a replace on a wide screen. What is open is kept in the
// session; after a reload the parameter alone opens nothing.

import { back, go, replace } from '../../navigation';
import { formatHash, type Route } from '../../router';
import { showToast } from '../../toasts';
import { newUserId, StoreError, type Ingredient } from '../../store';
import { refreshBrowse } from '../browse/load';
import { usedInCount } from './view-model';
import {
  blankForm,
  checkForm,
  formOf,
  formToIngredient,
  type IngredientForm,
} from './ingredient-form';
import { editorStrings as t } from './strings';
import { bump, changed, type Ctx } from './session';
import { updateLine } from './draft';

const wide = (): boolean => window.matchMedia('(min-width: 840px)').matches;

export function sheetAddress(route: Route, kind: string | null): string {
  const query = new URLSearchParams(route.query);
  query.delete('sheet');
  if (kind) query.set('sheet', kind);
  return formatHash(route.path, query);
}

function open(ctx: Ctx, kind: string, replacing: boolean): void {
  const address = sheetAddress(ctx.route, kind);
  if (replacing || wide()) replace(ctx.store, address);
  else go(ctx.store, address);
  bump(ctx.store);
}

export function closeSheet(ctx: Ctx): void {
  ctx.session.picker = null;
  ctx.session.form = null;
  const without = sheetAddress(ctx.route, null);
  if (wide()) replace(ctx.store, without);
  else back(ctx.store, without);
  bump(ctx.store);
}

export function openPicker(ctx: Ctx, lineKey: string, substitute = false): void {
  ctx.session.menu = null;
  ctx.session.picker = {
    lineKey,
    query: '',
    path: null,
    focus: true,
    ...(substitute && { substitute: true }),
  };
  open(ctx, 'pick', false);
}

export function setQuery(ctx: Ctx, query: string): void {
  if (!ctx.session.picker) return;
  ctx.session.picker = { ...ctx.session.picker, query, focus: false };
  bump(ctx.store);
}

export function browseTo(ctx: Ctx, path: string | null): void {
  if (!ctx.session.picker) return;
  ctx.session.picker = { ...ctx.session.picker, path, query: '', focus: false };
  bump(ctx.store);
}

/** The picker handed over an ingredient for a substitute: the line lists it, the line's menu button has the focus. */
function pickSubstitute(ctx: Ctx, lineKey: string, ingredientId: string): void {
  const line = ctx.session.draft.lines.find((l) => l.key === lineKey);
  const name = ctx.model.ingredientName(ingredientId) ?? ingredientId;
  if (!line) return closeSheet(ctx);
  if (line.ingredientId === ingredientId) showToast(ctx.store, t.substitute.same);
  else if ((line.substitutes ?? []).some((s) => s.ingredientId === ingredientId)) {
    showToast(ctx.store, t.substitute.already(name));
  } else {
    ctx.session.draft = updateLine(ctx.session.draft, lineKey, (l) => ({
      ...l,
      substitutes: [...(l.substitutes ?? []), { ingredientId, amountText: '' }],
    }));
    ctx.session.focus = `menu-${lineKey}`;
    changed(ctx, false);
    showToast(ctx.store, t.substitute.added(name));
  }
  closeSheet(ctx);
}

/** The picker handed over an ingredient: the line takes it, the amount field is next. */
export function pick(ctx: Ctx, lineKey: string, ingredientId: string, substitute = false): void {
  if (substitute) return pickSubstitute(ctx, lineKey, ingredientId);
  ctx.session.draft = {
    ...ctx.session.draft,
    lines: updateLine(ctx.session.draft, lineKey, (line) => ({ ...line, ingredientId })).lines,
  };
  ctx.session.focus = `amount-${lineKey}`;
  changed(ctx, false);
  closeSheet(ctx);
}

export function startCreate(ctx: Ctx, name: string): void {
  const lineKey = ctx.session.picker?.lineKey ?? null;
  const substitute = ctx.session.picker?.substitute === true;
  ctx.session.picker = null;
  ctx.session.form = {
    lineKey,
    ...(substitute && { substitute: true }),
    form: blankForm(name.trim()),
    submitted: false,
    touched: new Set(),
    error: null,
  };
  open(ctx, 'ingredient', true);
}

export function startEdit(ctx: Ctx, id: string): void {
  const item = ctx.model.tree.byId.get(id) as Ingredient | undefined;
  if (!item) return;
  const lineKey = ctx.session.picker?.lineKey ?? null;
  ctx.session.picker = null;
  ctx.session.form = {
    lineKey,
    form: formOf(item),
    submitted: false,
    touched: new Set(),
    error: null,
  };
  open(ctx, 'ingredient', true);
}

export function setFormField(ctx: Ctx, field: keyof IngredientForm, value: string): void {
  const state = ctx.session.form;
  if (!state) return;
  ctx.session.form = { ...state, form: { ...state.form, [field]: value }, error: null };
}

/** A field was left: its error may show now. */
export function touchFormField(ctx: Ctx, field: string): void {
  const state = ctx.session.form;
  if (!state) return;
  ctx.session.form = { ...state, touched: new Set([...state.touched, field]) };
  bump(ctx.store);
}

export function formUsedIn(ctx: Ctx): number {
  const id = ctx.session.form?.form.id ?? '';
  return usedInCount(ctx.model, id);
}

const reasonOf = (error: unknown): string =>
  error instanceof StoreError ? error.message : (error as Error).message;

export async function saveForm(ctx: Ctx): Promise<void> {
  const state = ctx.session.form;
  const local = ctx.data.local();
  if (!state) return;
  const checked = checkForm(state.form, ctx.model.tree);
  if (!checked.ok) {
    ctx.session.form = { ...state, submitted: true };
    bump(ctx.store);
    return;
  }
  if (!local) {
    ctx.session.form = { ...state, error: t.cannotSave };
    bump(ctx.store);
    return;
  }
  const existing = state.form.id === '' ? undefined : await local.ingredients.get(state.form.id);
  const record = formToIngredient(state.form, state.form.id || newUserId(), existing);
  try {
    await local.ingredients.put(record);
  } catch (error) {
    ctx.session.form = { ...state, error: t.saveFailed(reasonOf(error)) };
    bump(ctx.store);
    return;
  }
  await refreshBrowse(ctx.store, ctx.data.catalog());
  if (state.form.id === '' && state.lineKey) {
    pick(ctx, state.lineKey, record.id, state.substitute === true);
    showToast(ctx.store, t.ingredient.created(record.name));
  } else {
    closeSheet(ctx);
    showToast(ctx.store, t.ingredient.savedEdit(record.name));
  }
}

/** Deletes the open user ingredient, unless a drink or ingredient still uses it. */
export async function deleteIngredient(ctx: Ctx): Promise<void> {
  const state = ctx.session.form;
  const local = ctx.data.local();
  if (!state || !local || state.form.id === '') return;
  const record = await local.ingredients.get(state.form.id);
  if (!record) return;
  try {
    await local.ingredients.delete(record.id);
  } catch (error) {
    const message =
      error instanceof StoreError && error.kind === 'referenced'
        ? t.ingredient.deleteRefused(record.name, error.details.join(', '))
        : t.saveFailed(reasonOf(error));
    ctx.session.form = { ...state, error: message };
    bump(ctx.store);
    return;
  }
  await refreshBrowse(ctx.store, ctx.data.catalog());
  closeSheet(ctx);
  showToast(ctx.store, t.ingredient.deleted(record.name), () => {
    void local.ingredients.put(record).then(() => refreshBrowse(ctx.store, ctx.data.catalog()));
  });
}
