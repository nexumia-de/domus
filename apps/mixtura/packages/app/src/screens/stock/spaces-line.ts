// The quiet line above the Stock summary: the spaces that count and the button
// that opens the Spaces sheet (docs/screens-stock-settings.md#spaces).

import { h } from '../../dom';
import { type ScreenContext } from '../../screen';
import { countingNames } from '../../stock/spaces-rules';
import { type StockState } from '../../stock/state';
import { strings } from '../../strings';
import { openSheet, stockAddress } from './sheet-address';

export function spacesLine(
  context: ScreenContext,
  state: Extract<StockState, { kind: 'ready' }>,
): HTMLElement {
  return h(
    'div',
    { class: 'spaces-line' },
    h(
      'span',
      { class: 'spaces-names', 'data-spaces-line': '' },
      countingNames(state.selection).join(' · '),
    ),
    h(
      'button',
      {
        type: 'button',
        class: 'btn btn--text',
        'data-focus': 'spaces',
        onclick: () => openSheet(context, stockAddress(context, 'spaces')),
      },
      strings.spaces.button,
    ),
  );
}
