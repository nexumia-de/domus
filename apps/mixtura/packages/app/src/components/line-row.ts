// One ingredient line of the editor, as a card: the ingredient (a button
// that opens the picker), the amount and unit, the line menu, and under them
// what was understood. The drag handle reorders; the menu has the same moves
// for people who do not drag.

import { h } from '../dom';
import { strings } from '../strings';
import { editorStrings as t } from '../screens/editor/strings';
import type { DraftLine } from '../screens/editor/types';
import type { LineRowVM } from '../screens/editor/view-model';
import { amountFields, applyHint, type AmountActions } from './amount-input';
import * as glyph from './glyphs';
import { enableReorder } from './reorder';

export interface LineRowActions extends AmountActions {
  pick(key: string): void;
  menu(key: string): void;
  moveBy(key: string, delta: -1 | 1): void;
  moveTo(key: string, to: number): void;
  optional(key: string): void;
  openNote(key: string): void;
  note(key: string, text: string): void;
  role(key: string, role: string): void;
  remove(key: string): void;
}

const ROLES = Object.keys(strings.spec.roles) as (keyof typeof strings.spec.roles)[];

function menuPanel(
  vm: LineRowVM,
  line: DraftLine,
  name: string,
  actions: LineRowActions,
): HTMLElement {
  const button = (
    label: string,
    focus: string,
    onclick: () => void,
    extra: Record<string, string | boolean> = {},
  ): HTMLElement =>
    h('button', { type: 'button', class: 'btn', 'data-focus': focus, onclick, ...extra }, label);
  return h(
    'div',
    { class: 'line-menu', role: 'group', 'aria-label': t.lineMenu(name) },
    button(t.moveUp, `up-${vm.key}`, () => actions.moveBy(vm.key, -1), {
      disabled: vm.index === 0,
    }),
    button(t.moveDown, `down-${vm.key}`, () => actions.moveBy(vm.key, 1), {
      disabled: vm.index === vm.count - 1,
    }),
    button(t.optional, `optional-${vm.key}`, () => actions.optional(vm.key), {
      'aria-pressed': line.optional ? 'true' : 'false',
      class: line.optional ? 'btn btn--tonal is-on' : 'btn',
    }),
    !vm.noteOpen && button(t.addNote, `addnote-${vm.key}`, () => actions.openNote(vm.key)),
    h(
      'label',
      { class: 'line-role' },
      h('span', {}, t.changeRole),
      h(
        'select',
        {
          class: 'input',
          'data-focus': `role-${vm.key}`,
          onchange: (event) => actions.role(vm.key, (event.target as HTMLSelectElement).value),
        },
        h('option', { value: '' }, t.roleFromIngredient(vm.ownRole)),
        ...ROLES.map((r) =>
          h(
            'option',
            { value: r, ...(line.role === r && { selected: true }) },
            strings.spec.roles[r],
          ),
        ),
      ),
    ),
    button(t.remove, `remove-${vm.key}`, () => actions.remove(vm.key), {
      class: 'btn btn--danger',
    }),
  );
}

export function lineRow(
  vm: LineRowVM,
  line: DraftLine,
  show: boolean,
  actions: LineRowActions,
): HTMLElement {
  const name = vm.ingredient ?? `${t.ingredients} ${vm.index + 1}`;
  const { fields, unit, hintId } = amountFields(line, name, actions);
  const hint = h('p', {
    class: 'line-hint',
    id: hintId,
    'aria-live': 'polite',
    'data-hint': vm.key,
  });
  applyHint(hint, vm.check, show);
  const handle = h(
    'button',
    {
      type: 'button',
      class: 'btn btn--icon reorder',
      'aria-label': t.reorder(name),
      title: t.reorder(name),
      'data-focus': `reorder-${vm.key}`,
    },
    glyph.grip(),
  );
  const card = h(
    'div',
    {
      class: vm.check.status === 'error' && show ? 'edit-line has-error' : 'edit-line',
      role: 'listitem',
      'data-line-card': vm.key,
      'data-index': String(vm.index),
    },
    h(
      'div',
      { class: 'r1' },
      handle,
      h(
        'button',
        {
          type: 'button',
          class: 'input line-ingredient',
          'aria-label': t.ingredientField(vm.index + 1, vm.ingredient),
          'data-focus': `ingredient-${vm.key}`,
          onclick: () => actions.pick(vm.key),
        },
        h(
          'span',
          { class: vm.ingredient ? 'line-ingredient-name' : 'line-ingredient-name is-empty' },
          vm.ingredient ?? (vm.slot ? t.emptySlot : t.chooseIngredient),
        ),
        vm.role && h('span', { class: 'tag', 'data-role': vm.role.id }, vm.role.label),
      ),
    ),
    h(
      'div',
      { class: 'r2' },
      ...fields,
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn--icon',
          'aria-label': t.lineMenu(name),
          title: t.lineMenu(name),
          'aria-expanded': vm.menuOpen ? 'true' : 'false',
          'data-focus': `menu-${vm.key}`,
          onclick: () => actions.menu(vm.key),
        },
        glyph.more(),
      ),
    ),
    hint,
    vm.noteOpen &&
      h('input', {
        type: 'text',
        class: 'input',
        'aria-label': `${t.note}, ${name}`,
        'data-focus': `note-${vm.key}`,
        placeholder: t.notePlaceholder,
        autocomplete: 'off',
        value: line.note,
        oninput: (event) => actions.note(vm.key, (event.target as HTMLInputElement).value),
      }),
  );
  if (vm.menuOpen) card.appendChild(menuPanel(vm, line, name, actions));
  enableReorder(handle, card, {
    drop: (to) => actions.moveTo(vm.key, to),
    step: (delta) => actions.moveBy(vm.key, delta),
  });
  unit.dataset['unit'] = line.unit;
  return card;
}
