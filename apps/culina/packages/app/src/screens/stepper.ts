// A number field with minus and plus buttons of 44 px; the field parses like every number field.
import { parseEntry } from '../shared/parse';
import { el } from '../shell/el';
import { strings } from '../strings';
import { nextId } from './fields';

export interface Stepper {
  wrap: HTMLElement;
  input: HTMLInputElement;
}

/** Calls `onChange` with the new value (a number above 0) after every change that gives one. */
export const stepper = (
  label: string,
  fewer: string,
  more: string,
  value: number,
  onChange: (value: number) => void,
): Stepper => {
  const input = el('input', 'field stepper-input');
  input.type = 'text';
  input.inputMode = 'numeric';
  input.autocomplete = 'off';
  input.id = nextId('stepper');
  input.value = String(value);
  const hint = el('p', 'hint');
  hint.setAttribute('aria-live', 'polite');
  const mark = (kind: 'empty' | 'invalid' | 'ok'): void => {
    if (kind === 'invalid') input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
    hint.textContent = kind === 'invalid' ? strings.notebook.invalidNumber : '';
  };
  const labelNode = el('label', 'field-label', label);
  labelNode.htmlFor = input.id;
  const button = (text: string, name: string, step: number): HTMLButtonElement => {
    const b = el('button', 'step-button', text);
    b.type = 'button';
    b.setAttribute('aria-label', name);
    b.addEventListener('click', () => {
      const entry = parseEntry(input.value);
      const now = entry.kind === 'ok' ? entry.value : value;
      const next = Math.max(1, Math.round(now) + step);
      input.value = String(next);
      mark('empty');
      onChange(next);
    });
    return b;
  };
  input.addEventListener('input', () => {
    const entry = parseEntry(input.value);
    mark(entry.kind);
    if (entry.kind === 'ok') onChange(entry.value);
  });
  const row = el('div', 'stepper-row');
  row.append(button('−', fewer, -1), input, button('+', more, 1));
  const wrap = el('div', 'field-wrap stepper');
  wrap.append(labelNode, row, hint);
  return { wrap, input };
};
