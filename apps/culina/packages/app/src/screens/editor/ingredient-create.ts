// Creating an ingredient inline: name, optional role, optional yield and shelf life. The
// numbers are the user's own and are stored with the source "user"; nothing is looked up.
import type { ComponentRef, FoodState } from '@culina/engine';
import {
  emptyIngredientForm,
  ingredientFromForm,
  ingredientProblems,
  type IngredientForm,
} from '../../editor/ingredient-form';
import { newId, saveRecord } from '../../notebook';
import { el } from '../../shell/el';
import { strings } from '../../strings';
import { bareSelect, button, mark, textField } from './form-bits';
import { storeText } from './store-text';

const t = strings.editor;
const STATES: { value: FoodState; label: string }[] = [
  { value: 'raw', label: t.stateRaw },
  { value: 'cooked', label: t.stateCooked },
  { value: 'prepared', label: t.statePrepared },
];
const STORAGES = [
  { value: 'pantry', label: t.storagePantry },
  { value: 'fridge', label: t.storageFridge },
  { value: 'freezer', label: t.storageFreezer },
];

export const ingredientCreate = (
  name: string,
  onCreated: (ref: ComponentRef) => void,
  onCancel: () => void,
): HTMLElement => {
  const form: IngredientForm = emptyIngredientForm(name);
  const box = el('form', 'create');
  box.noValidate = true;
  const nameField = textField(t.createName, form.name);
  const roleField = textField(t.createRole, form.role);
  const yieldField = textField(t.createYield, form.yieldPercent, true);
  const state = bareSelect(t.createState, STATES, form.yieldState);
  const shelf = textField(t.createShelf, form.shelfDays, true);
  const storage = bareSelect(t.createStorage, STORAGES, form.shelfStorage);
  const note = el('p', 'hint');
  note.setAttribute('role', 'status');

  const read = (): void => {
    form.name = nameField.control.value;
    form.role = roleField.control.value;
    form.yieldPercent = yieldField.control.value;
    form.yieldState = state.value as FoodState;
    form.shelfDays = shelf.control.value;
    form.shelfStorage = storage.value as IngredientForm['shelfStorage'];
    const problems = ingredientProblems(form);
    mark(nameField.control, problems.includes('name'));
    mark(roleField.control, problems.includes('role'));
    mark(yieldField.control, problems.includes('yield'));
    mark(shelf.control, problems.includes('shelf'));
  };
  const save = async (): Promise<void> => {
    read();
    const id = newId();
    const record = ingredientFromForm(form, id);
    if (record === undefined) {
      note.textContent = ingredientProblems(form).includes('name')
        ? strings.editor.needs.name
        : strings.notebook.invalidNumber;
      return;
    }
    const done = await saveRecord('ingredients', record);
    if (!done.ok) {
      note.textContent = storeText(done.error.code);
      return;
    }
    onCreated({ kind: 'ingredient', id });
  };
  box.addEventListener('submit', (event) => {
    event.preventDefault();
    void save();
  });
  box.addEventListener('input', read);
  const actions = el('div', 'actions');
  const submit = el('button', 'btn primary', t.createSave);
  submit.type = 'submit';
  actions.append(submit, button(t.pickerClose, 'quiet', onCancel));
  box.append(
    nameField.wrap,
    roleField.wrap,
    yieldField.wrap,
    state,
    shelf.wrap,
    storage,
    note,
    actions,
  );
  return box;
};
