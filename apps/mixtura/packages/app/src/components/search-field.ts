// A search field with a clear button, for the drinks and the templates list.
// Typing is debounced; the address is rewritten by the caller. The field is
// never focused by the app (docs/behaviour.md#interaction-rules).

import { h } from '../dom';
import * as glyph from './glyphs';

const DEBOUNCE_MS = 200;

export function searchField(options: {
  value: string;
  label: string;
  hint: string;
  clearLabel: string;
  onChange: (value: string) => void;
  /** Enter in the field, with the text as typed (quick entry on the Stock screen). */
  onEnter?: (value: string) => void;
}): HTMLElement {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const input = h('input', {
    class: 'input-bare',
    type: 'search',
    name: 'q',
    value: options.value,
    placeholder: options.hint,
    'aria-label': options.label,
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
    'data-focus': 'search',
    onkeydown: (event) => {
      if ((event as KeyboardEvent).key !== 'Enter' || !options.onEnter) return;
      event.preventDefault();
      clearTimeout(timer);
      options.onEnter(input.value.trim());
    },
    oninput: () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        // What this field has handed to the address; a redraw keeps newer typing (shell/render.ts).
        input.dataset['sent'] = input.value.trim();
        options.onChange(input.value.trim());
      }, DEBOUNCE_MS);
    },
  });
  // A redraw replaces this field; its pending hand-over must not fire later with stale text
  // (shell/render.ts cancels it and restarts it on the new field).
  input.addEventListener('search-cancel', () => clearTimeout(timer));
  const clear = h(
    'button',
    {
      class: 'btn btn--icon',
      type: 'button',
      'aria-label': options.clearLabel,
      title: options.clearLabel,
      onclick: () => options.onChange(''),
    },
    glyph.close(),
  );
  return h('div', { class: 'input search-input' }, input, options.value ? clear : glyph.search());
}
