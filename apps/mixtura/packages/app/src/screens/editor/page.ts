// The editor page: the form on one side, the balance on the other, the
// compact balance bar above the bottom bar on a phone. `live` refreshes the
// parts that follow typing (balance, what was understood under each amount,
// the Save button and its reason) without drawing the page again, so the
// field being typed in keeps its focus and caret.

import { balancePanel } from '../../components/balance-panel';
import { applyHint } from '../../components/amount-input';
import { compactBar } from '../../components/compact-balance';
import { ingredientFormSheet, type FormSheetVM } from '../../components/ingredient-form-sheet';
import { ingredientPicker } from '../../components/ingredient-picker';
import { saveSheet } from '../../components/save-sheet';
import { lineRow, type LineRowActions } from '../../components/line-row';
import * as glyph from '../../components/glyphs';
import { h } from '../../dom';
import {
  addEmptyLine,
  move,
  moveBy,
  openNote,
  remove,
  setAmount,
  setNote,
  setRole,
  setTemplate,
  setTop,
  setUnit,
  toggleMenu,
  toggleOptional,
} from './actions';
import { checkDraft, type DraftCheck } from './check';
import { dirty, type Ctx } from './session';
import { checkForm, parentChoices } from './ingredient-form';
import { pickerVM } from './picker-vm';
import {
  detailFields,
  nameField,
  preparedFigures,
  preparedSection,
  templateField,
} from './page-fields';
import {
  browseTo,
  closeSheet,
  deleteIngredient,
  formUsedIn,
  openPicker,
  pick,
  saveForm,
  setFormField,
  setQuery,
  startCreate,
  startEdit,
  touchFormField,
} from './sheet-actions';
import { editorStrings as t } from './strings';
import { editorVM, type EditorVM } from './view-model';
import { closeSaveSheet, discard, deleteDrink, save } from './commit';
import type { Role } from '../browse/types';

export interface Page {
  body: HTMLElement;
  actions: HTMLElement;
  /** The "Draft kept" tag for the header. */
  tag: HTMLElement;
}

function lineActions(ctx: Ctx): LineRowActions {
  const key = (k: string): void => {
    openPicker(ctx, k);
  };
  return {
    text: (k, text) => setAmount(ctx, k, text),
    unit: (k, unit) => setUnit(ctx, k, unit),
    top: (k, text) => setTop(ctx, k, text),
    left(k) {
      ctx.session.touched = new Set([...ctx.session.touched, k]);
      ctx.session.live?.();
    },
    pick: key,
    menu: (k) => toggleMenu(ctx, k),
    moveBy: (k, delta) => moveBy(ctx, k, delta),
    moveTo: (k, to) => move(ctx, k, to),
    optional: (k) => toggleOptional(ctx, k),
    openNote: (k) => openNote(ctx, k),
    note: (k, text) => setNote(ctx, k, text),
    role: (k, role) => setRole(ctx, k, role as '' | Role),
    remove: (k) => remove(ctx, k),
  };
}

function suggestion(ctx: Ctx, vm: EditorVM): HTMLElement {
  const s = vm.suggestion;
  return h(
    'div',
    { class: 'suggestion', 'data-region': 'suggestion' },
    s &&
      h(
        'p',
        { class: 'note suggest' },
        `${t.suggest(s.name)} `,
        h(
          'button',
          { type: 'button', class: 'btn btn--text', onclick: () => setTemplate(ctx, s.id) },
          t.useTemplate(s.name),
        ),
      ),
  );
}

function actionBar(ctx: Ctx, check: DraftCheck, vm: EditorVM): HTMLElement {
  const saving = ctx.session.saving;
  return h(
    'div',
    { class: 'editor-bar' },
    h(
      'p',
      { class: 'save-reason', id: 'save-reason', 'data-region': 'reason' },
      !check.ok ? (vm.saveReason ?? '') : '',
    ),
    h(
      'div',
      { class: 'editor-buttons' },
      h(
        'button',
        {
          type: 'button',
          class: 'btn',
          'aria-label': t.discardAria,
          'data-focus': 'discard',
          'data-action': 'discard',
          disabled: !dirty(ctx.session),
          onclick: () => discard(ctx),
        },
        t.discard,
      ),
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn--primary',
          'data-focus': 'save',
          'data-action': 'save',
          'aria-describedby': 'save-reason',
          disabled: !check.ok || saving || !ctx.writable,
          onclick: () => void save(ctx),
        },
        saving ? t.saving : t.save,
      ),
    ),
  );
}

function draftTag(ctx: Ctx): HTMLElement {
  return h(
    'span',
    { class: 'tag draft-tag', 'data-region': 'tag', hidden: !dirty(ctx.session) },
    t.draftKept,
  );
}

function formSheet(ctx: Ctx): HTMLElement | null {
  const state = ctx.session.form;
  if (!state) return null;
  const vm: FormSheetVM = {
    editing: state.form.id !== '',
    form: state.form,
    errors: checkForm(state.form, ctx.model.tree).errors,
    shown: state.touched,
    submitted: state.submitted,
    error: state.error,
    parents: parentChoices(ctx.model.tree),
    usedIn: formUsedIn(ctx),
  };
  return ingredientFormSheet(vm, {
    close: () => closeSheet(ctx),
    field: (f, v) => setFormField(ctx, f, v),
    left: (f) => touchFormField(ctx, f),
    save: () => void saveForm(ctx),
    remove: () => void deleteIngredient(ctx),
  });
}

function pickerSheet(ctx: Ctx): HTMLElement | null {
  const state = ctx.session.picker;
  if (!state) return null;
  const vm = pickerVM(ctx.model, state, {
    search: t.picker.top,
    browse: t.picker.browse,
    start: t.picker.top,
  });
  ctx.session.picker = { ...state, focus: false };
  return ingredientPicker(vm, {
    close: () => closeSheet(ctx),
    search: (q) => setQuery(ctx, q),
    choose: (id) => pick(ctx, state.lineKey, id),
    open: (id) => browseTo(ctx, id),
    edit: (id) => startEdit(ctx, id),
    create: (name) => startCreate(ctx, name),
  });
}

function versionSheet(ctx: Ctx): HTMLElement | null {
  const state = ctx.session.saveSheet;
  const target = ctx.session.draft.target;
  if (!state || target.kind !== 'edit') return null;
  return saveSheet(target.version + 1, state.note, ctx.session.saving, {
    note: (text) => {
      if (ctx.session.saveSheet) ctx.session.saveSheet = { note: text };
    },
    save: () => void save(ctx, true),
    close: () => closeSaveSheet(ctx),
  });
}

export function editorPage(ctx: Ctx): Page {
  const { session } = ctx;
  const draft = () => session.draft;
  const compute = (): { check: DraftCheck; vm: EditorVM } => {
    const check = checkDraft(ctx.model, draft(), ctx.imperial);
    return {
      check,
      vm: editorVM(ctx.model, draft(), check, ctx.units, session.notes, session.menu),
    };
  };
  const { check, vm } = compute();
  const actions = lineActions(ctx);
  const show = (key: string): boolean => session.showErrors || session.touched.has(key);

  const lines = h(
    'div',
    { role: 'list', class: 'edit-lines', 'aria-label': t.ingredients },
    ...vm.lines.flatMap((row, i) => {
      const line = draft().lines[i];
      return line ? [lineRow(row, line, show(row.key), actions)] : [];
    }),
  );
  const balance = h('div', { class: 'stack', 'data-region': 'balance' }, balancePanel(vm.balance));
  const compact = h('div', { 'data-region': 'compact' }, compactBar(vm.compact));
  const bar = actionBar(ctx, check, vm);
  const tag = draftTag(ctx);
  const suggest = suggestion(ctx, vm);
  const note = h('p', { class: 'note', 'data-region': 'template-note' }, vm.templateNote);

  const body = h(
    'div',
    { class: 'editor' },
    session.restored &&
      dirty(session) &&
      h(
        'div',
        { class: 'notice', role: 'status', 'data-restored': '' },
        h('span', {}, t.restored),
        h(
          'button',
          {
            type: 'button',
            class: 'btn btn--text',
            'data-focus': 'discard-draft',
            onclick: () => discard(ctx),
          },
          t.discardDraft,
        ),
      ),
    !ctx.writable &&
      h(
        'div',
        { class: 'notice', role: 'status', 'data-read-only': '' },
        h('span', {}, t.cannotSave),
      ),
    session.error !== null &&
      h(
        'div',
        { class: 'banner banner--error', role: 'alert', 'data-editor-error': '' },
        h('span', {}, session.error),
        session.errorRetry &&
          h(
            'button',
            { type: 'button', class: 'btn btn--text', onclick: () => void save(ctx) },
            t.tryAgain,
          ),
      ),
    vm.copyNote && h('p', { class: 'note', 'data-copy-note': '' }, vm.copyNote),
    h(
      'div',
      { class: 'two-col' },
      h(
        'div',
        { class: 'stack' },
        nameField(ctx),
        templateField(ctx, vm),
        suggest,
        h(
          'section',
          { class: 'stack', 'aria-labelledby': 'ingredients-title' },
          h('h2', { class: 'section-title', id: 'ingredients-title' }, t.ingredients),
          lines,
          h(
            'button',
            {
              type: 'button',
              class: 'btn btn--tonal add-line',
              'data-focus': 'add-ingredient',
              onclick: () => openPicker(ctx, addEmptyLine(ctx)),
            },
            glyph.plus(),
            t.addIngredient,
          ),
        ),
      ),
      h(
        'div',
        { class: 'stack' },
        balance,
        note,
        ...detailFields(ctx, vm),
        preparedSection(ctx, vm),
      ),
    ),
    ctx.session.draft.target.kind === 'edit' &&
      h(
        'div',
        { class: 'danger-zone' },
        h(
          'button',
          {
            type: 'button',
            class: 'btn btn--danger',
            'data-focus': 'delete-drink',
            onclick: () => void deleteDrink(ctx),
          },
          t.deleteDrink,
        ),
      ),
    compact,
    pickerSheet(ctx),
    formSheet(ctx),
    versionSheet(ctx),
  );

  // Refresh what follows typing in place.
  session.live = () => {
    const now = compute();
    balance.replaceChildren(balancePanel(now.vm.balance));
    compact.replaceChildren(compactBar(now.vm.compact));
    suggest.replaceWith(suggestion(ctx, now.vm));
    note.textContent = now.vm.templateNote ?? '';
    now.vm.lines.forEach((row) => {
      const hint = body.querySelector(`[data-hint="${row.key}"]`);
      if (hint) applyHint(hint, row.check, show(row.key));
      const card = body.querySelector(`[data-line-card="${row.key}"]`);
      card?.classList.toggle('has-error', row.check.status === 'error' && show(row.key));
      const unit = card?.querySelector<HTMLSelectElement>('select.w-unit');
      const line = draft().lines.find((l) => l.key === row.key);
      if (unit && line && unit.value !== line.unit) unit.value = line.unit;
    });
    const reason = bar.querySelector('[data-region="reason"]');
    if (reason) reason.textContent = now.check.ok ? '' : (now.vm.saveReason ?? '');
    const saveButton = bar.querySelector<HTMLButtonElement>('[data-action="save"]');
    if (saveButton) saveButton.disabled = !now.check.ok || session.saving || !ctx.writable;
    const discardButton = bar.querySelector<HTMLButtonElement>('[data-action="discard"]');
    if (discardButton) discardButton.disabled = !dirty(session);
    tag.hidden = !dirty(session);
    const figures = body.querySelector('[data-region="prepared-figures"]');
    if (figures) figures.replaceWith(preparedFigures(now.vm));
    for (const [id, message] of [
      ['yield', now.vm.prepared.yieldError],
      ['shelf', now.vm.prepared.shelfError],
    ] as const) {
      const wrap = body.querySelector(`#${id}`)?.closest('.field');
      wrap?.querySelector('.field-error')?.remove();
      wrap?.classList.toggle('has-error', message !== undefined);
      if (message)
        wrap?.appendChild(
          h('span', { class: 'field-error', role: 'alert', id: `${id}-error` }, message),
        );
    }
  };
  return { body, actions: bar, tag };
}
