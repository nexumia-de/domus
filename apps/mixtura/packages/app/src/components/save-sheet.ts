// The sheet that asks for the one optional line of note when a changed drink
// is saved as a new version (docs/screens-specs.md#save-version-and-notes).
// The note never blocks the save: Save Without Note is as near as Save Version.

import { h } from '../dom';
import { editorStrings as t } from '../screens/editor/strings';
import * as glyph from './glyphs';

export interface SaveSheetActions {
  note(text: string): void;
  save(): void;
  close(): void;
}

export function saveSheet(
  next: number,
  note: string,
  saving: boolean,
  actions: SaveSheetActions,
): HTMLElement {
  const s = t.saveSheet;
  const input = h('input', {
    type: 'text',
    class: 'input',
    id: 'save-note',
    name: 'note',
    value: note,
    placeholder: s.placeholder,
    maxlength: 200,
    autocomplete: 'off',
    enterkeyhint: 'done',
    'data-focus': 'save-note',
    oninput: (event) => actions.note((event.target as HTMLInputElement).value),
    onkeydown: (event) => {
      if ((event as KeyboardEvent).key === 'Enter') {
        event.preventDefault();
        actions.save();
      }
    },
  });
  input.value = note;
  const sheet = h(
    'div',
    {
      class: 'sheet save-sheet',
      role: 'dialog',
      'aria-label': s.title,
      'aria-modal': 'true',
      tabindex: '-1',
      'data-sheet': 'save',
    },
    h(
      'div',
      { class: 'sheet-head' },
      h('h2', {}, s.title),
      h(
        'button',
        {
          class: 'btn btn--icon',
          type: 'button',
          'aria-label': s.close,
          title: s.close,
          onclick: actions.close,
        },
        glyph.close(),
      ),
    ),
    h(
      'div',
      { class: 'sheet-scroll' },
      h(
        'div',
        { class: 'field' },
        h('label', { for: 'save-note' }, s.note),
        input,
        h('span', { class: 'hint' }, s.hint(next)),
      ),
    ),
    h(
      'div',
      { class: 'sheet-bar' },
      h(
        'button',
        {
          type: 'button',
          class: 'btn',
          'data-action': 'save-skip',
          disabled: saving,
          onclick: () => {
            actions.note('');
            actions.save();
          },
        },
        s.skip,
      ),
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn--primary',
          'data-action': 'save-confirm',
          disabled: saving,
          onclick: actions.save,
        },
        s.save,
      ),
    ),
  );
  sheet.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') actions.close();
  });
  return h(
    'div',
    {
      class: 'sheet-backdrop sheet-backdrop--fixed',
      onclick: (event) => {
        if (event.target === event.currentTarget) actions.close();
      },
    },
    sheet,
  );
}
