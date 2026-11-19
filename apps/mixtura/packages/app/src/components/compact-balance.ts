// The compact balance bar of Try a Swap: the three figures with their
// position word (when the range allows one) and the difference to the saved
// drink, kept in view above the bottom bar while lines are edited. Hidden
// where the balance panel is beside the lines (docs/screens-browse.md#swap-mode).

import { h } from '../dom';
import type { CompactItem } from '../screens/spec/balance-vm';
import { swapStrings } from '../screens/spec/swap-strings';
import * as glyph from './glyphs';

const ICON = { Within: glyph.within, Below: glyph.below, Above: glyph.above } as const;

export function compactBar(items: readonly CompactItem[]): HTMLElement {
  return h(
    'div',
    {
      class: 'compact-balance',
      role: 'status',
      'aria-label': swapStrings.compact,
      'data-compact': '',
    },
    ...items.map((item) => {
      const icon = item.positionShort ? ICON[item.positionShort as keyof typeof ICON] : undefined;
      return h(
        'span',
        { class: 'compact-item' },
        `${item.name} `,
        h('strong', { class: 'num' }, item.value),
        item.deltaShort && h('span', { class: 'compact-delta num' }, ` ${item.deltaShort}`),
        icon && icon(),
        item.positionShort,
      );
    }),
  );
}
