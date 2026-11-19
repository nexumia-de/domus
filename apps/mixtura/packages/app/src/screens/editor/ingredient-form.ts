// The form that adds or edits one of the user's ingredients: name, where it
// belongs in the tree, role and optional ABV, sugar and acid. A property left
// empty is stored as absent, never as zero (docs/data-model.md). Pure.

import { ancestors, type IngredientTree } from '@mixtura/engine';
import { normalise } from '../browse/normalise';
import type { Ingredient, Role } from '../browse/types';
import { editorStrings as t } from './strings';

export interface IngredientForm {
  /** Empty for a new ingredient. */
  id: string;
  name: string;
  parentId: string;
  role: '' | Role;
  abv: string;
  sugar: string;
  acid: string;
}

export interface FormErrors {
  name?: string;
  parent?: string;
  abv?: string;
  sugar?: string;
  acid?: string;
}

export const blankForm = (name = ''): IngredientForm => ({
  id: '',
  name,
  parentId: '',
  role: '',
  abv: '',
  sugar: '',
  acid: '',
});

export function formOf(ingredient: Ingredient): IngredientForm {
  return {
    id: ingredient.id,
    name: ingredient.name,
    parentId: ingredient.parentId ?? '',
    role: ingredient.role ?? '',
    abv: ingredient.abv === undefined ? '' : String(ingredient.abv),
    sugar: ingredient.sugar === undefined ? '' : String(ingredient.sugar),
    acid: ingredient.acid === undefined ? '' : String(ingredient.acid),
  };
}

/** Places an ingredient can belong: categories and types, with their path, sorted. */
export function parentChoices(tree: IngredientTree): { id: string; label: string }[] {
  return tree.ids
    .filter((id) => tree.byId.get(id)?.level !== 'product')
    .map((id) => {
      const chain = [id, ...(ancestors(tree, id) ?? [])].reverse();
      return { id, label: chain.map((c) => tree.byId.get(c)?.name ?? c).join(' › ') };
    })
    .sort((a, b) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' }));
}

type Parsed = { ok: true; value: number | undefined } | { ok: false };

function number(text: string, min: number, max: number): Parsed {
  const typed = text.trim().replace(',', '.');
  if (typed === '') return { ok: true, value: undefined };
  if (!/^\d+(\.\d+)?$/.test(typed)) return { ok: false };
  const value = Number(typed);
  return value >= min && value <= max ? { ok: true, value } : { ok: false };
}

export interface FormCheck {
  errors: FormErrors;
  ok: boolean;
}

export function checkForm(form: IngredientForm, tree: IngredientTree): FormCheck {
  const errors: FormErrors = {};
  const name = form.name.trim();
  if (name === '') errors.name = t.ingredient.nameRequired;
  else {
    const taken = tree.ids.some(
      (id) => id !== form.id && normalise(tree.byId.get(id)?.name ?? '') === normalise(name),
    );
    if (taken) errors.name = t.ingredient.nameTaken;
  }
  const parent = tree.byId.get(form.parentId);
  if (!parent || parent.level === 'product') errors.parent = t.ingredient.parentRequired;
  if (!number(form.abv, 0, 100).ok) errors.abv = t.ingredient.abvInvalid;
  if (!number(form.sugar, 0, Number.MAX_SAFE_INTEGER).ok) errors.sugar = t.ingredient.sugarInvalid;
  if (!number(form.acid, 0, 100).ok) errors.acid = t.ingredient.acidInvalid;
  return { errors, ok: Object.keys(errors).length === 0 };
}

/** The record to store. `existing` keeps what the form has no field for (cost, notes, shelf life). */
export function formToIngredient(
  form: IngredientForm,
  id: string,
  existing: Ingredient | undefined,
): Ingredient {
  const base: Record<string, unknown> = { ...existing };
  for (const field of ['role', 'abv', 'sugar', 'acid']) Reflect.deleteProperty(base, field);
  const abv = number(form.abv, 0, 100);
  const sugar = number(form.sugar, 0, Number.MAX_SAFE_INTEGER);
  const acid = number(form.acid, 0, 100);
  return {
    source: { name: 'Entered by the user', licence: 'user' },
    ...base,
    id,
    name: form.name.trim(),
    level: 'product',
    parentId: form.parentId,
    ...(form.role !== '' && { role: form.role }),
    ...(abv.ok && abv.value !== undefined && { abv: abv.value }),
    ...(sugar.ok && sugar.value !== undefined && { sugar: sugar.value }),
    ...(acid.ok && acid.value !== undefined && { acid: acid.value }),
  } as Ingredient;
}
