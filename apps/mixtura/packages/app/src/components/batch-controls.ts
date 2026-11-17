// What the batch sheet is made for: a number of drinks or a target volume
// (docs/screens-specs.md#servings-and-batch). A two-way switch, one field and
// a Set button; Enter in the field also sets. A wrong entry is said under the
// field and nothing is redrawn, so what was typed stays.

import { h } from '../dom';
import { MAX_BATCH_DRINKS, parseBatchDrinks, parseBatchVolume } from '../screens/spec/batch-target';
import type { BatchControl } from '../screens/spec/batch-vm';
import { strings } from '../strings';

export interface BatchActions {
  close(): void;
  /** Make the batch for this many drinks. */
  setDrinks(n: number): void;
  /** Make the batch for this volume in ml. */
  setVolume(ml: number): void;
  /** Switch to a volume, starting from `startMl` when known. */
  useVolume(startMl: number | undefined): void;
  /** Switch back to a number of drinks. */
  useDrinks(): void;
}

const DEFAULT_VOLUME_ML = 1000;

export function batchControls(control: BatchControl, actions: BatchActions): HTMLElement {
  const t = strings.batch;
  const volume = control.mode === 'volume';
  const choice = (label: string, on: boolean, pick: () => void, key: string): HTMLElement =>
    h(
      'button',
      { type: 'button', 'aria-pressed': String(on), 'data-focus': key, onclick: pick },
      label,
    );
  const hint = h(
    'span',
    { class: 'hint', id: 'batch-hint' },
    volume ? t.volumeHint : t.drinksHint(MAX_BATCH_DRINKS),
  );
  const input = h('input', {
    type: 'text',
    inputmode: volume ? 'decimal' : 'numeric',
    class: 'input',
    id: 'batch-field',
    'data-focus': 'batch-field',
    'aria-describedby': 'batch-hint',
    autocomplete: 'off',
    value: control.fieldValue,
  });
  const submit = (): void => {
    if (volume) {
      const read = parseBatchVolume(input.value);
      if (read.ok) return actions.setVolume(read.ml);
    } else {
      const n = parseBatchDrinks(input.value);
      if (n !== undefined) return actions.setDrinks(n);
    }
    input.setAttribute('aria-invalid', 'true');
    hint.textContent = volume ? t.volumeInvalid : t.drinksInvalid(MAX_BATCH_DRINKS);
    hint.setAttribute('role', 'alert');
  };
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    submit();
  });
  return h(
    'section',
    { class: 'sheet-group batch-controls', 'aria-label': t.mode },
    h('h3', { id: 'batch-mode' }, t.mode),
    h(
      'div',
      { class: 'segmented', role: 'group', 'aria-labelledby': 'batch-mode' },
      choice(t.byDrinks, !volume, actions.useDrinks, 'batch-drinks'),
      choice(
        t.byVolume,
        volume,
        () => actions.useVolume(control.startMl ?? DEFAULT_VOLUME_ML),
        'batch-volume',
      ),
    ),
    h(
      'div',
      { class: 'field' },
      h('label', { for: 'batch-field' }, volume ? t.volumeField : t.drinksField),
      h(
        'div',
        { class: 'line-volume-row batch-field-row' },
        input,
        h(
          'button',
          { type: 'button', class: 'btn btn--primary', 'data-focus': 'batch-set', onclick: submit },
          t.set,
        ),
      ),
      hint,
    ),
  );
}
