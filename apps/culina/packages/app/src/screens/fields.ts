// Form pieces shared by the ratio screens: a labelled text field and a labelled select.
import { el } from '../shell/el';

let counter = 0;
export const nextId = (prefix: string): string => `${prefix}-${++counter}`;

export interface Labelled<T extends HTMLElement> {
  wrap: HTMLElement;
  label: HTMLLabelElement;
  control: T;
}

/** A text field for a number: decimal keypad, no autocomplete, label above it. */
export const numberField = (label: string): Labelled<HTMLInputElement> => {
  const control = el('input', 'field');
  control.type = 'text';
  control.inputMode = 'decimal';
  control.autocomplete = 'off';
  control.spellcheck = false;
  control.id = nextId('field');
  const wrap = el('div', 'field-wrap');
  const labelNode = el('label', 'field-label', label);
  labelNode.htmlFor = control.id;
  wrap.append(labelNode, control);
  return { wrap, label: labelNode, control };
};

export interface Option {
  value: string;
  label: string;
}

/** A select with a label above it. */
export const selectField = (
  label: string,
  options: readonly Option[],
  value: string,
): Labelled<HTMLSelectElement> => {
  const control = el('select', 'field');
  control.id = nextId('select');
  for (const option of options) {
    const node = el('option', undefined, option.label);
    node.value = option.value;
    control.append(node);
  }
  control.value = value;
  const wrap = el('div', 'field-wrap');
  const labelNode = el('label', 'field-label', label);
  labelNode.htmlFor = control.id;
  wrap.append(labelNode, control);
  return { wrap, label: labelNode, control };
};
