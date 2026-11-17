// The ingredient picker: a sheet with a search field (focused on open, the
// one place where it is, because the user tapped for it), rows with the
// place in the tree, tags for prepared and the user's own ingredients, a
// Create row, and browsing the tree by category. The same sheet on a phone
// and on desktop; Enter picks the first row.

import { h } from '../dom';
import type { PickerVM, PickRow } from '../screens/editor/picker-vm';
import { editorStrings as t } from '../screens/editor/strings';
import * as glyph from './glyphs';

export interface PickerActions {
  close(): void;
  search(query: string): void;
  choose(id: string): void;
  open(id: string | null): void;
  edit(id: string): void;
  create(name: string): void;
}

function row(r: PickRow, actions: PickerActions, browsing: boolean): HTMLElement {
  return h(
    'div',
    { class: 'pick-row' },
    h(
      'button',
      {
        type: 'button',
        class: 'offer',
        'data-offer': r.id,
        onclick: () => actions.choose(r.id),
      },
      h(
        'span',
        { class: 'offer-text' },
        h('span', { class: 'offer-name' }, r.name),
        r.path && h('span', { class: 'offer-path' }, r.path),
      ),
      (r.prepared || r.user) &&
        h(
          'span',
          { class: 'pick-tags' },
          r.prepared && h('span', { class: 'tag' }, t.picker.prepared),
          r.user && h('span', { class: 'tag' }, t.picker.user),
        ),
    ),
    r.editable &&
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn--text pick-edit',
          'aria-label': t.picker.edit(r.name),
          onclick: () => actions.edit(r.id),
        },
        glyph.edit(),
      ),
    browsing &&
      r.hasChildren &&
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn--icon pick-open',
          'aria-label': t.picker.open(r.name),
          title: t.picker.open(r.name),
          onclick: () => actions.open(r.id),
        },
        glyph.chevron(),
      ),
  );
}

export function ingredientPicker(vm: PickerVM, actions: PickerActions): HTMLElement {
  const input = h('input', {
    type: 'search',
    class: 'input',
    name: 'ingredient-search',
    'aria-label': t.picker.search,
    'data-focus': 'pick-search',
    placeholder: t.picker.search,
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
    enterkeyhint: 'go',
    value: vm.query,
    oninput: (event) => actions.search((event.target as HTMLInputElement).value),
  });
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const first = vm.rows[0];
    if (first && vm.mode === 'search') actions.choose(first.id);
    else if (vm.create) actions.create(vm.create);
  });
  // After the page is drawn (this microtask runs behind the draw), not a frame later: a later
  // focus would take the focus from whatever the user did in between.
  if (vm.focus) queueMicrotask(() => input.focus());
  const browsing = vm.mode !== 'search';
  const scroll = h(
    'div',
    { class: 'sheet-scroll' },
    h('div', { class: 'search-line' }, input),
    vm.up &&
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn--text pick-up',
          'data-focus': 'pick-up',
          onclick: () => actions.open(vm.up?.id ?? null),
        },
        glyph.back(),
        `${t.picker.up}: ${vm.up.name}`,
      ),
    vm.create &&
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn--tonal pick-create',
          'data-focus': 'pick-create',
          onclick: () => actions.create(vm.create ?? ''),
        },
        glyph.plus(),
        t.picker.create(vm.create),
      ),
    vm.none && h('p', { class: 'note' }, t.picker.none),
    vm.recent.length > 0 &&
      h(
        'section',
        { class: 'sheet-group', 'aria-label': t.picker.recent },
        h('h3', {}, t.picker.recent),
        ...vm.recent.map((r) => row(r, actions, false)),
      ),
    h(
      'section',
      { class: 'sheet-group', 'aria-label': vm.heading },
      h('h3', {}, vm.heading),
      ...vm.rows.map((r) => row(r, actions, browsing)),
    ),
    !vm.create &&
      vm.mode === 'start' &&
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn--tonal pick-create',
          onclick: () => actions.create(''),
        },
        glyph.plus(),
        t.picker.createEmpty,
      ),
  );
  const sheet = h(
    'div',
    {
      class: 'sheet swap-sheet picker-sheet',
      role: 'dialog',
      'aria-label': t.picker.title,
      'aria-modal': 'true',
      tabindex: '-1',
      'data-sheet': 'pick',
    },
    h(
      'div',
      { class: 'sheet-head' },
      h('h2', {}, t.picker.title),
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
    scroll,
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
