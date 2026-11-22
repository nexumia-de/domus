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

/** A message at the field it concerns. It is always in the page, empty; the text is announced when it is put in (role alert) and the field points at it. */
export interface FieldError {
  node: HTMLElement;
  show(text: string): void;
  clear(): void;
}

export const fieldError = (control?: HTMLElement): FieldError => {
  const node = el('p', 'hint field-error');
  node.id = nextId('error');
  node.setAttribute('role', 'alert');
  return {
    node,
    show(text) {
      node.textContent = text;
      if (control === undefined) return;
      control.setAttribute('aria-describedby', node.id);
      control.dataset.hasError = '';
      if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) {
        mark(control, true);
      }
    },
    clear() {
      node.textContent = '';
      if (control === undefined) return;
      control.removeAttribute('aria-describedby');
      delete control.dataset.hasError;
    },
  };
};

/** What a row of lines or slots can say at its fields: at the picker button or at the amount. */
export interface RowProblem {
  target: 'pick' | 'amount';
  text: string;
}

/** Puts the problems of one row under it, each pointing from its field. */
export const showRowProblems = (
  row: HTMLElement,
  problems: readonly RowProblem[],
  controls: Record<RowProblem['target'], HTMLElement>,
): void => {
  for (const problem of problems) {
    const error = fieldError(controls[problem.target]);
    error.node.dataset.target = problem.target;
    error.show(problem.text);
    row.append(error.node);
  }
};

/** Takes away the messages of one field of a row, when the user has changed it. */
export const clearRowProblems = (
  row: HTMLElement,
  target: RowProblem['target'],
  control: HTMLElement,
): void => {
  row.querySelectorAll(`.field-error[data-target="${target}"]`).forEach((n) => n.remove());
  control.removeAttribute('aria-describedby');
  delete control.dataset.hasError;
};

/** Moves the focus to the first field that has a message, so it scrolls into view and is read out. */
export const focusFirstError = (root: HTMLElement): void => {
  root.querySelector<HTMLElement>('[data-has-error]')?.focus();
};
