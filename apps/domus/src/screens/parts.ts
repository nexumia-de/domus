// Pieces the screens share: a field with a label, a secret field with show/hide, a notice, a
// button row. Every interactive element is at least 44 px high (styles/components.css).
import { h } from '../dom';

let counter = 0;
export const uid = (prefix: string): string => `${prefix}-${(counter += 1)}`;

export interface Field {
  element: HTMLElement;
  input: HTMLInputElement;
}

/** A labelled text input; `hint` is read with the label. */
export function textField(
  label: string,
  options: {
    value?: string;
    hint?: string;
    type?: string;
    autocomplete?: string;
    inputmode?: string;
    testid?: string;
  } = {},
): Field {
  const id = uid('f');
  const hintId = `${id}-hint`;
  const input = h('input', {
    id,
    type: options.type ?? 'text',
    autocomplete: options.autocomplete ?? 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
    inputmode: options.inputmode,
    'aria-describedby': options.hint === undefined ? null : hintId,
    'data-testid': options.testid,
  });
  input.value = options.value ?? '';
  const element = h(
    'div',
    { class: 'field' },
    h('label', { for: id }, label),
    options.hint === undefined ? null : h('p', { class: 'hint', id: hintId }, options.hint),
    input,
  );
  return { element, input };
}

/** A password-type input with a Show/Hide button; the value never leaves this element. */
export function secretField(
  label: string,
  options: {
    hint?: string;
    showAria: string;
    hideAria: string;
    show: string;
    hide: string;
    testid?: string;
  },
): Field {
  const field = textField(label, {
    type: 'password',
    autocomplete: 'off',
    ...(options.hint === undefined ? {} : { hint: options.hint }),
    ...(options.testid === undefined ? {} : { testid: options.testid }),
  });
  const toggle = h(
    'button',
    { type: 'button', class: 'button quiet', 'aria-label': options.showAria },
    options.show,
  );
  toggle.addEventListener('click', () => {
    const hidden = field.input.type === 'password';
    field.input.type = hidden ? 'text' : 'password';
    toggle.textContent = hidden ? options.hide : options.show;
    toggle.setAttribute('aria-label', hidden ? options.hideAria : options.showAria);
  });
  const row = h('div', { class: 'input-row' });
  row.append(field.input, toggle);
  field.element.append(row);
  return { element: field.element, input: field.input };
}

/** A message that is read out when it appears. `kind`: how it looks. */
export function notice(
  kind: 'info' | 'warn' | 'error' | 'ok',
  ...children: (Node | string)[]
): HTMLElement {
  return h(
    'div',
    { class: `notice ${kind}`, role: kind === 'error' ? 'alert' : 'status' },
    ...children,
  );
}

export const buttonRow = (...children: Node[]): HTMLElement => {
  const row = h('div', { class: 'actions' });
  row.append(...children);
  return row;
};

export const button = (
  text: string,
  onClick: () => void,
  options: { primary?: boolean; quiet?: boolean; danger?: boolean; testid?: string } = {},
): HTMLButtonElement => {
  const classes = [
    'button',
    options.primary ? 'primary' : '',
    options.quiet ? 'quiet' : '',
    options.danger ? 'danger' : '',
  ];
  const b = h(
    'button',
    { type: 'button', class: classes.filter(Boolean).join(' '), 'data-testid': options.testid },
    text,
  );
  b.addEventListener('click', onClick);
  return b;
};

export const linkButton = (
  text: string,
  href: string,
  options: { primary?: boolean; quiet?: boolean; external?: boolean; testid?: string } = {},
): HTMLAnchorElement =>
  h(
    'a',
    {
      href,
      class: ['button', options.primary ? 'primary' : '', options.quiet ? 'quiet' : '']
        .filter(Boolean)
        .join(' '),
      ...(options.external ? { target: '_blank', rel: 'noopener noreferrer' } : {}),
      'data-testid': options.testid,
    },
    text,
  );

/** Disables a button while a promise runs, so a double tap does not run it twice. */
export async function busy<T>(buttons: HTMLButtonElement[], work: () => Promise<T>): Promise<T> {
  for (const b of buttons) b.disabled = true;
  try {
    return await work();
  } finally {
    for (const b of buttons) b.disabled = false;
  }
}
