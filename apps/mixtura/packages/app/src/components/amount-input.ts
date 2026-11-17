// The amount of one editor line: a text field that takes the grammar of
// docs/units.md as typed, a unit selector as the fallback for a bare number,
// and the line under it that says what was understood or why not. A `top`
// line has no amount; its field asks for the volume to count instead.

import { h } from '../dom';
import { UNIT_CHOICES } from '../screens/editor/amount-entry';
import type { LineCheck } from '../screens/editor/check';
import { editorStrings as t } from '../screens/editor/strings';
import type { DraftLine } from '../screens/editor/types';

export interface AmountActions {
  text(key: string, text: string): void;
  unit(key: string, unit: string): void;
  top(key: string, text: string): void;
  /** The amount field was left: an error may show now. */
  left(key: string): void;
}

/** The line under the field: what was understood, or the reason when it may be shown. */
export function hintOf(check: LineCheck, show: boolean): { text: string; error: boolean } {
  if (check.status === 'ok' && check.hint) return { text: check.hint, error: false };
  if (check.status === 'error' && show && check.error) return { text: check.error, error: true };
  return { text: '', error: false };
}

export function applyHint(el: Element, check: LineCheck, show: boolean): void {
  const hint = hintOf(check, show);
  el.textContent = hint.text;
  el.classList.toggle('is-error', hint.error);
  if (hint.error) el.setAttribute('role', 'alert');
  else el.removeAttribute('role');
}

export function amountFields(
  line: DraftLine,
  name: string,
  actions: AmountActions,
): { fields: HTMLElement[]; amount?: HTMLInputElement; unit: HTMLSelectElement; hintId: string } {
  const hintId = `hint-${line.key}`;
  const unit = h(
    'select',
    {
      class: 'input w-unit',
      'aria-label': `${t.unit}, ${name}`,
      'data-focus': `unit-${line.key}`,
      onchange: (event) => actions.unit(line.key, (event.target as HTMLSelectElement).value),
    },
    h('option', { value: '' }, t.unit),
    ...UNIT_CHOICES.map((u) =>
      h('option', { value: u.id, ...(u.id === line.unit && { selected: true }) }, u.label),
    ),
  );
  unit.value = line.unit;
  if (line.unit === 'top') {
    const volume = h('input', {
      type: 'text',
      inputmode: 'decimal',
      class: 'input grow',
      name: 'volume',
      'aria-label': `${t.volume}, ${name}`,
      'aria-describedby': hintId,
      'data-focus': `amount-${line.key}`,
      placeholder: t.volumePlaceholder,
      autocomplete: 'off',
      value: line.topText,
      oninput: (event) => actions.top(line.key, (event.target as HTMLInputElement).value),
      onchange: () => actions.left(line.key),
    });
    return { fields: [volume, unit], unit, hintId };
  }
  const amount = h('input', {
    type: 'text',
    class: 'input num w-amount',
    name: 'amount',
    'aria-label': `${t.amount}, ${name}`,
    'aria-describedby': hintId,
    'data-focus': `amount-${line.key}`,
    placeholder: t.amountPlaceholder,
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
    enterkeyhint: 'next',
    value: line.amountText,
    oninput: (event) => actions.text(line.key, (event.target as HTMLInputElement).value),
    onchange: () => actions.left(line.key),
  });
  return { fields: [amount, unit], amount, unit, hintId };
}
