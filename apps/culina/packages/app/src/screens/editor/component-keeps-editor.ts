// How long a made component keeps, in the editor: one row per storage place with the days and a
// line on how it is kept. The figures are the user's own (source `user`); the app proposes none.
import type { ComponentForm, KeepForm } from '../../editor/component-form';
import { el } from '../../shell/el';
import { strings } from '../../strings';
import { bareSelect, button, fieldError, textField, type FieldError } from './form-bits';

const t = strings.editor;
const PLACES = ['fridge', 'freezer', 'pantry'] as const;

export interface KeepsEditor {
  element: HTMLElement;
  /** Shows what cannot be saved at the row it concerns (by index). */
  showProblems(rows: ReadonlySet<number>): void;
}

export const keepsEditor = (form: ComponentForm, changed: () => void): KeepsEditor => {
  const element = el('div', 'keeps-editor');
  const list = el('div', 'keep-rows');
  let errors: FieldError[] = [];
  const keeps = (): KeepForm[] => {
    form.keeps ??= [];
    return form.keeps;
  };

  const row = (keep: KeepForm, index: number): HTMLElement => {
    const box = el('fieldset', 'step-card keep-row');
    box.append(el('legend', undefined, t.keepLegend(index + 1)));
    const place = bareSelect(
      t.keepPlace,
      PLACES.map((p) => ({ value: p, label: strings.stock.storage[p] })),
      keep.storage,
    );
    place.addEventListener('change', () => {
      keep.storage = place.value as KeepForm['storage'];
      changed();
    });
    const days = textField(t.keepDays, keep.days, true);
    days.control.inputMode = 'numeric';
    days.control.addEventListener('input', () => {
      keep.days = days.control.value;
      keep.source = 'user';
      changed();
    });
    const amount = el('div', 'line-amount');
    amount.append(days.wrap, place);
    const note = textField(t.keepNote, keep.note);
    note.control.addEventListener('input', () => {
      keep.note = note.control.value;
      changed();
    });
    const error = fieldError(days.control);
    errors.push(error);
    const tools = el('div', 'actions step-tools');
    tools.append(
      button(
        t.remove,
        'quiet',
        () => {
          keeps().splice(index, 1);
          changed();
          draw();
          element.querySelector<HTMLElement>('.keep-add')?.focus();
        },
        t.keepRemove(index + 1),
      ),
    );
    box.append(amount, note.wrap, error.node, tools);
    return box;
  };

  const draw = (): void => {
    errors = [];
    list.replaceChildren(...keeps().map(row));
  };

  const add = button(t.addKeep, 'quiet keep-add', () => {
    // The first place not used yet; the fridge when all are.
    const used = new Set(keeps().map((k) => k.storage));
    const storage = PLACES.find((p) => !used.has(p)) ?? 'fridge';
    keeps().push({ storage, days: '', note: '', source: 'user' });
    changed();
    draw();
    list.querySelector<HTMLElement>('.keep-row:last-child input')?.focus();
  });
  const actions = el('div', 'actions');
  actions.append(add);
  element.append(el('p', 'muted', t.keepsHelp), list, actions);
  draw();

  return {
    element,
    showProblems: (rows) => {
      errors.forEach((error, index) => {
        if (rows.has(index)) error.show(t.needs.keep(index + 1));
        else error.clear();
      });
    },
  };
};
