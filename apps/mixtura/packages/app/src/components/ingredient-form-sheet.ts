// The sheet that adds or edits one of the user's ingredients: name, where it
// belongs, role and optional ABV, sugar and acid. Errors stand next to their
// field in words, after Save was pressed or the field was left.

import { h } from '../dom';
import { strings } from '../strings';
import type { FormErrors, IngredientForm } from '../screens/editor/ingredient-form';
import { editorStrings as t } from '../screens/editor/strings';
import * as glyph from './glyphs';

export interface FormSheetActions {
  close(): void;
  field(field: keyof IngredientForm, value: string): void;
  left(field: string): void;
  save(): void;
  remove(): void;
}

export interface FormSheetVM {
  editing: boolean;
  form: IngredientForm;
  errors: FormErrors;
  /** Fields whose error may show. */
  shown: ReadonlySet<string>;
  submitted: boolean;
  error: string | null;
  parents: { id: string; label: string }[];
  usedIn: number;
}

const ROLES = Object.keys(strings.spec.roles) as (keyof typeof strings.spec.roles)[];

function field(
  id: string,
  label: string,
  control: HTMLElement,
  error: string | undefined,
  hint?: string,
): HTMLElement {
  return h(
    'div',
    { class: error ? 'field has-error' : 'field' },
    h('label', { for: id }, label),
    control,
    hint && h('span', { class: 'hint', id: `${id}-hint` }, hint),
    error && h('span', { class: 'field-error', role: 'alert', id: `${id}-error` }, error),
  );
}

export function ingredientFormSheet(vm: FormSheetVM, actions: FormSheetActions): HTMLElement {
  const show = (name: keyof FormErrors): string | undefined =>
    vm.submitted || vm.shown.has(name) ? vm.errors[name] : undefined;
  const text = (name: keyof IngredientForm, errorKey: keyof FormErrors, inputmode?: string) => {
    const error = show(errorKey);
    return h('input', {
      type: 'text',
      class: 'input',
      id: `f-${name}`,
      name,
      ...(inputmode && { inputmode }),
      'data-focus': `f-${name}`,
      autocomplete: 'off',
      autocapitalize: name === 'name' ? 'sentences' : 'off',
      spellcheck: 'false',
      ...(error && { 'aria-invalid': 'true', 'aria-describedby': `f-${name}-error` }),
      value: vm.form[name],
      oninput: (event) => actions.field(name, (event.target as HTMLInputElement).value),
      onchange: () => actions.left(errorKey),
    });
  };
  const parent = h(
    'select',
    {
      class: 'input',
      id: 'f-parentId',
      name: 'parentId',
      'data-focus': 'f-parentId',
      ...(show('parent') && { 'aria-invalid': 'true', 'aria-describedby': 'f-parentId-error' }),
      onchange: (event) => {
        actions.field('parentId', (event.target as HTMLSelectElement).value);
        actions.left('parent');
      },
    },
    h('option', { value: '' }, t.ingredient.parentNone),
    ...vm.parents.map((p) => h('option', { value: p.id }, p.label)),
  );
  parent.value = vm.form.parentId;
  const role = h(
    'select',
    {
      class: 'input',
      id: 'f-role',
      name: 'role',
      'data-focus': 'f-role',
      onchange: (event) => actions.field('role', (event.target as HTMLSelectElement).value),
    },
    h('option', { value: '' }, t.ingredient.roleNone),
    ...ROLES.map((r) => h('option', { value: r }, strings.spec.roles[r])),
  );
  role.value = vm.form.role;
  const sheet = h(
    'div',
    {
      class: 'sheet swap-sheet ingredient-sheet',
      role: 'dialog',
      'aria-label': vm.editing ? t.ingredient.titleEdit : t.ingredient.titleNew,
      'aria-modal': 'true',
      tabindex: '-1',
      'data-sheet': 'ingredient',
    },
    h(
      'div',
      { class: 'sheet-head' },
      h('h2', {}, vm.editing ? t.ingredient.titleEdit : t.ingredient.titleNew),
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn--icon',
          'aria-label': t.picker.close,
          title: t.picker.close,
          'data-focus': 'back',
          onclick: actions.close,
        },
        glyph.close(),
      ),
    ),
    h(
      'div',
      { class: 'sheet-scroll' },
      field('f-name', t.ingredient.name, text('name', 'name'), show('name')),
      field('f-parentId', t.ingredient.parent, parent, show('parent')),
      field('f-role', t.ingredient.role, role, undefined),
      h('p', { class: 'note' }, t.ingredient.optionalHint),
      field('f-abv', t.ingredient.abv, text('abv', 'abv', 'decimal'), show('abv')),
      field('f-sugar', t.ingredient.sugar, text('sugar', 'sugar', 'decimal'), show('sugar')),
      field('f-acid', t.ingredient.acid, text('acid', 'acid', 'decimal'), show('acid')),
      vm.editing && vm.usedIn > 0 && h('p', { class: 'note' }, t.ingredient.usedBy(vm.usedIn)),
      vm.error &&
        h('p', { class: 'banner banner--error', role: 'alert', 'data-form-error': '' }, vm.error),
      vm.editing &&
        h(
          'button',
          {
            type: 'button',
            class: 'btn btn--danger',
            'data-focus': 'f-delete',
            onclick: actions.remove,
          },
          t.ingredient.delete,
        ),
    ),
    h(
      'div',
      { class: 'sheet-bar' },
      h('button', { type: 'button', class: 'btn', onclick: actions.close }, t.ingredient.cancel),
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn--primary',
          'data-focus': 'f-save',
          onclick: actions.save,
        },
        t.ingredient.save,
      ),
    ),
  );
  sheet.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    actions.close();
  });
  return h(
    'div',
    {
      class: 'sheet-backdrop sheet-backdrop--fixed swap-backdrop',
      onclick: (event) => {
        if (event.target === event.currentTarget) actions.close();
      },
    },
    sheet,
  );
}
