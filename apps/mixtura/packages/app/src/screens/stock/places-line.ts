// The quiet line above the Stock summary: the places that count and the button
// that opens the Places sheet (docs/screens-stock-settings.md#places-131).

import { h } from '../../dom';
import { type ScreenContext } from '../../screen';
import { countingNames } from '../../stock/places-rules';
import { type StockState } from '../../stock/state';
import { syncView } from '../../sync/view';
import { strings } from '../../strings';
import { openSheet, stockAddress } from './sheet-address';

export function placesLine(
  context: ScreenContext,
  state: Extract<StockState, { kind: 'ready' }>,
): HTMLElement {
  // Read the sync view now, so the Places sheet opens with it and does not redraw when it arrives.
  syncView(context);
  return h(
    'div',
    { class: 'places-line' },
    h(
      'span',
      { class: 'places-names', 'data-places-line': '' },
      countingNames(state.selection).join(' · '),
    ),
    h(
      'button',
      {
        type: 'button',
        class: 'btn btn--text',
        'data-focus': 'places',
        onclick: () => openSheet(context, stockAddress(context, 'places')),
      },
      strings.places.button,
    ),
  );
}
