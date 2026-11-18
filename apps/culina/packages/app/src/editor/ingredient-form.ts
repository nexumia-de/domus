// A new ingredient made inline in the picker: name, optional role, optional yield, optional shelf life.
// Every number is the user's own entry and says so in its source; nothing is looked up.
import type { FoodState } from '@culina/engine';
import type { IngredientRecord } from '../records';
import { parseEntry } from '../shared/parse';

export interface IngredientForm {
  name: string;
  role: string;
  yieldPercent: string;
  yieldState: FoodState;
  shelfDays: string;
  shelfStorage: 'pantry' | 'fridge' | 'freezer';
}

export const emptyIngredientForm = (name = ''): IngredientForm => ({
  name,
  role: '',
  yieldPercent: '',
  yieldState: 'raw',
  shelfDays: '',
  shelfStorage: 'pantry',
});

export type IngredientProblem = 'name' | 'role' | 'yield' | 'shelf';

const ROLE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
/** "Fresh herb" becomes `fresh-herb`; text that cannot be a role id gives ''. */
export const roleId = (text: string): string => {
  const id = text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return ROLE.test(id) ? id : '';
};

export const ingredientProblems = (form: IngredientForm): IngredientProblem[] => {
  const out: IngredientProblem[] = [];
  if (form.name.trim() === '') out.push('name');
  if (form.role.trim() !== '' && roleId(form.role) === '') out.push('role');
  if (parseEntry(form.yieldPercent).kind === 'invalid') out.push('yield');
  const days = form.shelfDays.trim();
  if (days !== '' && !/^\d+$/.test(days)) out.push('shelf');
  return out;
};

export const ingredientFromForm = (
  form: IngredientForm,
  id: string,
): IngredientRecord | undefined => {
  if (ingredientProblems(form).length > 0) return undefined;
  const yielded = parseEntry(form.yieldPercent);
  const days = form.shelfDays.trim();
  return {
    id,
    name: form.name.trim(),
    ...(form.role.trim() === '' ? {} : { roles: [roleId(form.role)] }),
    ...(yielded.kind === 'ok'
      ? { yields: [{ state: form.yieldState, percent: yielded.value, source: 'user' }] }
      : {}),
    ...(days === ''
      ? {}
      : {
          shelfLife: [
            {
              state: form.yieldState,
              storage: form.shelfStorage,
              days: Number(days),
              source: 'user',
            },
          ],
        }),
  };
};
