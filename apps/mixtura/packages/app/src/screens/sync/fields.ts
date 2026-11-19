// Form pieces of the Sync sheets: a labelled input, a password input with
// Show/Hide, a storage choice, a value with Copy, and a text that is never
// told by colour alone. Secrets are only ever in inputs and in memory.

import { h, type Child } from '../../dom';
import { type Storage } from '../../store';
import { syncStrings } from './strings';

export interface InputOptions {
  id: string;
  label: string;
  value: string;
  hint?: string;
  type?: 'text' | 'password';
  autocomplete?: string;
  inputmode?: string;
  oninput: (value: string) => void;
  onenter?: () => void;
  disabled?: boolean;
  /** The element to put after the input (a Show button). */
  after?: Child;
}

/** A labelled text input; typing changes the draft and does not redraw. */
export function textField(o: InputOptions): HTMLElement {
  const input = h('input', {
    type: o.type ?? 'text',
    class: 'input',
    id: o.id,
    name: o.id,
    value: o.value,
    autocomplete: o.autocomplete ?? 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
    inputmode: o.inputmode,
    disabled: o.disabled,
    'aria-describedby': o.hint ? `${o.id}-hint` : undefined,
    'data-focus': o.id,
    oninput: (event) => o.oninput((event.target as HTMLInputElement).value),
    onkeydown: (event) => {
      if ((event as KeyboardEvent).key !== 'Enter' || !o.onenter) return;
      event.preventDefault();
      o.onenter();
    },
  });
  return h(
    'div',
    { class: 'field' },
    h('label', { for: o.id }, o.label),
    o.after ? h('div', { class: 'field-with-button' }, input, o.after) : input,
    o.hint && h('span', { class: 'hint', id: `${o.id}-hint` }, o.hint),
  );
}

/** The Show/Hide button of a password field; redraws through `toggle`. */
export function showButton(id: string, shown: boolean, toggle: () => void): HTMLElement {
  const t = syncStrings.form;
  return h(
    'button',
    {
      type: 'button',
      class: 'btn btn--tonal',
      'aria-pressed': shown ? 'true' : 'false',
      'aria-label': shown ? t.hideAria : t.showAria,
      'data-focus': `${id}-show`,
      onclick: toggle,
    },
    shown ? t.hide : t.show,
  );
}

/** A choice of storage; empty list gives `null` so the caller says what to do. */
export function storageSelect(
  id: string,
  label: string,
  storages: readonly Storage[],
  value: string,
  pick: (id: string) => void,
): HTMLElement | null {
  if (storages.length === 0) return null;
  const select = h(
    'select',
    {
      class: 'input',
      id,
      name: id,
      'data-focus': id,
      onchange: (event) => pick((event.target as HTMLSelectElement).value),
    },
    ...storages.map((s) =>
      h('option', { value: s.id, selected: s.id === value }, `${s.label} · ${s.baseUrl}`),
    ),
  );
  return h('div', { class: 'field' }, h('label', { for: id }, label), select);
}

/** A problem as text with a warning sign (never colour alone), announced when it appears. */
export function problemLine(text: string | null, testid: string): HTMLElement | null {
  return text ? h('p', { class: 'field-error', role: 'alert', 'data-testid': testid }, text) : null;
}
