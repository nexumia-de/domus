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
    oninput: () => {
      clearTimeout(timer);
      timer = setTimeout(() => options.onChange(input.value.trim()), DEBOUNCE_MS);
    },
  });
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
