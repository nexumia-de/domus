// Small builders shared by the editors: text and number fields, buttons of 44 px, hints.
import { el } from '../../shell/el';
import { nextId, type Labelled, type Option } from '../fields';

export const textField = (
  label: string,
  value: string,
  numeric = false,
): Labelled<HTMLInputElement> => {
  const control = el('input', 'field');
  control.type = 'text';
  if (numeric) control.inputMode = 'decimal';
  control.autocomplete = 'off';
  control.spellcheck = false;
  control.id = nextId('field');
  control.value = value;
  const wrap = el('div', 'field-wrap');
  const labelNode = el('label', 'field-label', label);
  labelNode.htmlFor = control.id;
  wrap.append(labelNode, control);
  return { wrap, label: labelNode, control };
};

export const areaField = (label: string, value: string): Labelled<HTMLTextAreaElement> => {
  const control = el('textarea', 'field area');
  control.id = nextId('field');
  control.rows = 3;
  control.value = value;
  const wrap = el('div', 'field-wrap');
  const labelNode = el('label', 'field-label', label);
  labelNode.htmlFor = control.id;
  wrap.append(labelNode, control);
  return { wrap, label: labelNode, control };
};

/** A select without a visible label above it (the label is its accessible name). */
export const bareSelect = (
  name: string,
  options: readonly Option[],
  value: string,
): HTMLSelectElement => {
  const control = el('select', 'field');
  control.setAttribute('aria-label', name);
  for (const option of options) {
    const node = el('option', undefined, option.label);
    node.value = option.value;
    control.append(node);
  }
  control.value = value;
  return control;
};

export const button = (
  text: string,
  className: string,
  onClick: () => void,
  name?: string,
): HTMLButtonElement => {
  const node = el('button', `btn ${className}`, text);
  node.type = 'button';
  if (name !== undefined) node.setAttribute('aria-label', name);
  node.addEventListener('click', onClick);
  return node;
};

/** Marks a field the way the number fields elsewhere do: aria-invalid, no alarm colour. */
export const mark = (control: HTMLElement, on: boolean): void => {
  if (on) control.setAttribute('aria-invalid', 'true');
  else control.removeAttribute('aria-invalid');
};
