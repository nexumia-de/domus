// Create an ingredient from the Stock search when no name matches (#83): the
// shared ingredient form as a sheet over the Stock screen. The sheet is the
// address parameter `sheet=ingredient` (one history entry on a phone, so Back
// closes it); the typed text lives in module memory, and after a reload the
// parameter alone opens a blank form with the search text. Saving stores the
// ingredient, marks it in stock at once and offers Undo for both.

import { ingredientFormSheet } from '../../components/ingredient-form-sheet';
import { back, go, replace } from '../../navigation';
import { formatHash } from '../../router';
import { type ScreenContext } from '../../screen';
import { changeStock, stockState, withPresent } from '../../stock/state';
import { newUserId, StoreError } from '../../store';
import { strings } from '../../strings';
import { showToast } from '../../toast';
import { refreshBrowse } from '../browse/load';
import type { BrowseModel } from '../browse/model';
import {
  blankForm,
  checkForm,
  formToIngredient,
  parentChoices,
  type IngredientForm,
} from '../editor/ingredient-form';
import { editorStrings as t } from '../editor/strings';

interface State {
  form: IngredientForm;
  touched: Set<string>;
  submitted: boolean;
  error: string | null;
  saving: boolean;
}

let state: State | null = null;

const wide = (): boolean => window.matchMedia('(min-width: 840px)').matches;
const redraw = (context: ScreenContext): void =>
  context.store.set({ stockRev: context.store.get().stockRev + 1 });

/** The Stock address with the sheet `sheet` (or none) and the other parameters kept. */
export function stockAddress(context: ScreenContext, sheet: string | null, keepQ = true): string {
  const query = new URLSearchParams(context.route.query);
  query.delete('sheet');
  query.delete('ing');
  if (!keepQ) query.delete('q');
  if (sheet) query.set('sheet', sheet);
  return formatHash(['stock'], query);
}

export const createOpen = (context: ScreenContext): boolean =>
  context.route.query.get('sheet') === 'ingredient';

export function openCreate(context: ScreenContext, name: string): void {
  state = {
    form: blankForm(name.trim()),
    touched: new Set(),
    submitted: false,
    error: null,
    saving: false,
  };
  const address = stockAddress(context, 'ingredient');
  if (wide()) replace(context.store, address);
  else go(context.store, address);
}

export function closeCreate(context: ScreenContext): void {
  state = null;
  const address = stockAddress(context, null);
  if (wide()) replace(context.store, address);
  else back(context.store, address);
}

async function save(context: ScreenContext, model: BrowseModel): Promise<void> {
  const open = state;
  const local = context.data.local();
  const records = stockState(context);
  if (!open || open.saving) return;
  if (!checkForm(open.form, model.tree).ok) {
    state = { ...open, submitted: true };
    return redraw(context);
  }
  if (!local || records.kind !== 'ready' || !records.writable) {
    state = { ...open, error: strings.stock.cannotCreate };
    return redraw(context);
  }
  state = { ...open, saving: true };
  const record = formToIngredient(open.form, newUserId(), undefined);
  try {
    await local.ingredients.put(record);
  } catch (error) {
    state = { ...open, saving: false, error: t.saveFailed((error as Error).message) };
    return redraw(context);
  }
  await refreshBrowse(context.store, context.data.catalog());
  state = null;
  const undo = changeStock(context, [
    { id: record.id, next: withPresent(records.records, record.id, true) },
  ]);
  replace(context.store, stockAddress(context, null, false));
  showToast(context.store, strings.stock.created(record.name), () => {
    changeStock(context, undo);
    void local.ingredients
      .delete(record.id)
      .then(() => refreshBrowse(context.store, context.data.catalog()))
      .catch((error: unknown) => {
        const reason = error instanceof StoreError ? error.message : (error as Error).message;
        showToast(context.store, t.saveFailed(reason));
      });
  });
}

/** The open sheet, or null. A reload with the parameter alone starts a blank form from the search text. */
export function createSheet(context: ScreenContext, model: BrowseModel): HTMLElement | null {
  if (!createOpen(context)) return null;
  state ??= {
    form: blankForm((context.route.query.get('q') ?? '').trim()),
    touched: new Set(),
    submitted: false,
    error: null,
    saving: false,
  };
  const open = state;
  return ingredientFormSheet(
    {
      editing: false,
      form: open.form,
      errors: checkForm(open.form, model.tree).errors,
      shown: open.touched,
      submitted: open.submitted,
      error: open.error,
      parents: parentChoices(model.tree),
      usedIn: 0,
    },
    {
      close: () => closeCreate(context),
      field: (field, value) => {
        if (state) state = { ...state, form: { ...state.form, [field]: value }, error: null };
      },
      left: (field) => {
        if (!state) return;
        state = { ...state, touched: new Set([...state.touched, field]) };
        redraw(context);
      },
      save: () => void save(context, model),
      remove: () => undefined,
    },
  );
}
