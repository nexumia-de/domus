// Servings stepper (1 to 12 drinks) and the button that opens the batch
// sheet, a row at the top of the ingredients card
// (docs/screens-specs.md#servings-and-batch). Targets are 44 px; the number
// is announced politely when it changes.

import { h } from '../dom';
import { MAX_SERVINGS, MIN_SERVINGS } from '../screens/spec/servings';
import { strings } from '../strings';
import * as glyph from './glyphs';

export interface StepperActions {
  setServings(n: number): void;
  openBatch(): void;
}

export function servingsStepper(servings: number, actions: StepperActions): HTMLElement {
  return h(
    'div',
    { class: 'servings', role: 'group', 'aria-label': strings.spec.servings },
    h(
      'button',
      {
        class: 'btn btn--icon',
        type: 'button',
        'aria-label': strings.spec.fewerServings,
        title: strings.spec.fewerServings,
        disabled: servings <= MIN_SERVINGS,
        'data-focus': 'servings-down',
        onclick: () => actions.setServings(servings - 1),
      },
      glyph.none(),
    ),
    h(
      'output',
      { class: 'servings-value num', 'aria-live': 'polite' },
      strings.spec.servingsValue(servings),
    ),
    h(
      'button',
      {
        class: 'btn btn--icon',
        type: 'button',
        'aria-label': strings.spec.moreServings,
        title: strings.spec.moreServings,
        disabled: servings >= MAX_SERVINGS,
        'data-focus': 'servings-up',
        onclick: () => actions.setServings(servings + 1),
      },
      glyph.plus(),
    ),
    h(
      'button',
      {
        class: 'btn btn--tonal servings-batch',
        type: 'button',
        'aria-label': strings.spec.batchOpen,
        'data-focus': 'batch',
        onclick: actions.openBatch,
      },
      strings.spec.batch,
    ),
  );
}
