// The detail of one stock item, #/stock/<id>/edit: amount and unit, state, date prepared, use by
// (with suggestions from a recorded shelf life), always there and a note, all optional; plus
// "Use some" to subtract an amount, and Remove. Nothing is focused on open.
import { stockExpiry, useBySuggestions } from '@culina/engine';
import type { FoodState, StoragePlace, UnitId } from '@culina/engine';
import { AMOUNT_UNITS } from '../../editor/units';
import { getStockItem, saveStockItem, stockName, today } from '../../notebook';
import { hashFor } from '../../router';
import { appLang, withDecimalMark } from '../../shared/locale';
import { el } from '../../shell/el';
import { applyForm, formOf, type StockForm } from '../../stock/form';
import { strings } from '../../strings';
import { selectField, type Option } from '../fields';
import { bareSelect, button, mark, textField } from '../editor/form-bits';
import { storeText } from '../editor/store-text';
import { shelfLifeOf } from './lookup';
import { removeWithUndo } from './stock-screen';
import { useSome } from './use-some';

const t = strings.stock;
const STATES: Option[] = [
  { value: '', label: t.stateNone },
  { value: 'raw', label: t.state.raw },
  { value: 'cooked', label: t.state.cooked },
  { value: 'prepared', label: t.state.prepared },
];
const PLACES: Option[] = [
  { value: '', label: t.storageNone },
  { value: 'pantry', label: t.storage.pantry },
  { value: 'fridge', label: t.storage.fridge },
  { value: 'freezer', label: t.storage.freezer },
];
const UNITS: Option[] = AMOUNT_UNITS.map((u) => ({ value: u, label: u }));

const dateField = (label: string, value: string) => {
  const field = textField(label, value);
  field.control.type = 'date';
  return field;
};

export const stockEditScreen = (id: string | undefined): HTMLElement => {
  const section = el('section', 'screen stock-edit editor');
  const item = id === undefined ? undefined : getStockItem(id);
  const back = el('a', 'btn quiet new-link', t.back);
  back.href = hashFor('stock');
  if (item === undefined) {
    section.append(el('h1', undefined, t.title), back, el('p', 'empty', t.notFound));
    return section;
  }
  const name = stockName(item) ?? t.gone;
  section.append(el('h1', undefined, t.editTitle(name)), back, el('p', 'note-quiet', t.detailHint));

  const form = el('form', 'stock-form');
  form.noValidate = true;
  const values = formOf(item);
  const amount = textField(t.amountLabel, values.amount, true);
  const unit = bareSelect(t.unitLabel, UNITS, values.unit);
  const amountRow = el('div', 'line-amount');
  amountRow.append(amount.wrap, unit);
  const state = selectField(t.stateLabel, STATES, values.state);
  const place = selectField(t.storageLabel, PLACES, values.storage);
  const prepared = dateField(t.preparedLabel, values.preparedOn);
  const preparedRow = el('div', 'stock-date-row');
  preparedRow.append(
    prepared.wrap,
    button(t.preparedToday, 'quiet', () => {
      prepared.control.value = today();
      suggestions();
    }),
  );
  const useBy = dateField(t.useByLabel, values.useBy);
  const useByRow = el('div', 'stock-date-row');
  useByRow.append(
    useBy.wrap,
    button(t.useByClear, 'quiet', () => {
      useBy.control.value = '';
      suggestions();
    }),
  );
  const suggest = el('div', 'stock-suggest');
  const derivedNote = el('p', 'note-quiet');
  const always = el('button', 'btn quiet stock-always', t.alwaysOn);
  always.type = 'button';
  let isAlways = values.always;
  const showAlways = (): void => always.setAttribute('aria-pressed', String(isAlways));
  always.addEventListener('click', () => {
    isAlways = !isAlways;
    showAlways();
  });
  showAlways();
  const note = textField(t.noteLabel, values.note);
  const status = el('p', 'hint');
  status.setAttribute('role', 'status');

  const read = (): StockForm => ({
    amount: amount.control.value,
    unit: unit.value as UnitId,
    state: state.control.value as FoodState | '',
    storage: place.control.value as StoragePlace | '',
    always: isAlways,
    preparedOn: prepared.control.value,
    useBy: useBy.control.value,
    note: note.control.value,
  });

  /** Offers the dates the recorded shelf life allows; shows the date derived when none is entered. */
  const suggestions = (): void => {
    suggest.replaceChildren();
    derivedNote.textContent = '';
    const current = read();
    const shelf = shelfLifeOf(item.ref);
    const offered = useBySuggestions(
      {
        ...(current.state === '' ? {} : { state: current.state }),
        ...(current.storage === '' ? {} : { storage: current.storage }),
        ...(current.preparedOn === '' ? {} : { preparedOn: current.preparedOn }),
      },
      shelf,
    );
    if (offered.ok && offered.suggestions.length > 0) {
      suggest.append(el('p', 'note-quiet', t.suggestHeading));
      for (const s of offered.suggestions) {
        suggest.append(
          button(t.suggest(s.useBy, t.storage[s.storage], s.days), 'quiet', () => {
            useBy.control.value = s.useBy;
            suggestions();
          }),
        );
      }
      suggest.append(el('p', 'note-quiet', t.suggestNote));
    }
    if (current.useBy === '' && current.preparedOn !== '') {
      const e = stockExpiry(
        {
          preparedOn: current.preparedOn,
          ...(current.state === '' ? {} : { state: current.state }),
          ...(current.storage === '' ? {} : { storage: current.storage }),
        },
        today(),
        shelf,
      );
      if (e.ok && e.basis === 'shelf-life' && e.useBy !== undefined) {
        derivedNote.textContent = t.derived(e.useBy);
      }
    }
  };
  for (const control of [prepared.control, state.control, place.control, useBy.control]) {
    control.addEventListener('input', suggestions);
    control.addEventListener('change', suggestions);
  }

  const save = async (): Promise<void> => {
    const result = applyForm(getStockItem(item.id) ?? item, read());
    mark(amount.control, !result.ok);
    if (!result.ok) {
      status.textContent = t.amountNotNumber;
      return;
    }
    const done = await saveStockItem(result.record);
    if (!done.ok) {
      status.textContent = storeText(done.error.code);
      return;
    }
    window.location.hash = hashFor('stock');
  };
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void save();
  });
  const submit = el('button', 'btn primary', t.save);
  submit.type = 'submit';
  const actions = el('div', 'actions editor-end');
  actions.append(
    submit,
    button(t.remove, 'quiet', () => {
      void removeWithUndo(item.id, name, t.removed(name)).then((done) => done && leave());
    }),
  );
  form.append(
    amountRow,
    state.wrap,
    place.wrap,
    preparedRow,
    useByRow,
    suggest,
    derivedNote,
    always,
    note.wrap,
    status,
    actions,
  );
  section.append(form);
  const use = useSome(item.id, name, (left) => {
    amount.control.value = left === undefined ? '' : withDecimalMark(String(left.value), appLang);
    if (left !== undefined) unit.value = left.unit;
  });
  if (use !== undefined) section.append(use);
  suggestions();
  return section;
};

const leave = (): void => {
  window.location.hash = hashFor('stock');
};
