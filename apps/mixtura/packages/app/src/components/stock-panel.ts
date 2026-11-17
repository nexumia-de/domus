// The Makeable tag and the stock panel of the spec screen (#82): one row per
// line with a word and a shape (check, swap, dash), never colour alone.

import { h } from '../dom';
import * as glyph from './glyphs';
import { stockStrings as t } from '../screens/spec/stock-strings';
import type { StockPanelVM, StockRowVM } from '../screens/spec/stock-panel-vm';

export interface StockPanelActions {
  /** Marks an ingredient as in stock (with Undo); absent while the stock cannot be written. */
  mark?: (id: string, name: string) => void;
}

const shape = (state: StockRowVM['state']): SVGElement =>
  state === 'have' || state === 'prepared'
    ? glyph.check()
    : state === 'substitute'
      ? glyph.swap()
      : glyph.none();

/** The tag above the lines; empty while nothing is in stock. */
export function stockTag(vm: StockPanelVM | undefined): HTMLElement | null {
  if (!vm || vm.kind === 'none') return null;
  return h(
    'span',
    {
      class: vm.kind === 'makeable' ? 'tag tag--strong tag--row-free' : 'tag tag--row-free',
      'data-stock-tag': vm.kind,
    },
    vm.kind === 'makeable' ? glyph.check() : vm.kind === 'substitute' ? glyph.swap() : glyph.none(),
    vm.tag,
  );
}

function row(vm: StockRowVM, actions: StockPanelActions): HTMLElement {
  return h(
    'li',
    { class: `stock-row stock-row--${vm.state}`, 'data-stock-row': vm.state },
    h('span', { class: 'stock-row-text' }, shape(vm.state), h('span', {}, vm.text)),
    vm.missingId !== undefined &&
      vm.missingName !== undefined &&
      h(
        'span',
        { class: 'stock-row-actions' },
        actions.mark &&
          h(
            'button',
            {
              type: 'button',
              class: 'btn btn--tonal',
              'aria-label': t.mark(vm.missingName),
              'data-action': 'mark-stock',
              'data-ingredient': vm.missingId,
              onclick: () => actions.mark?.(vm.missingId as string, vm.missingName as string),
            },
            t.markShort,
          ),
        h(
          'a',
          {
            class: 'btn btn--tonal',
            href: `#/stock/buy-next?open=${encodeURIComponent(vm.missingId)}`,
            'aria-label': t.buyNextAria(vm.missingName),
          },
          t.buyNext,
        ),
      ),
  );
}

export function stockPanel(
  vm: StockPanelVM | undefined,
  actions: StockPanelActions,
): HTMLElement | null {
  if (!vm) return null;
  return h(
    'section',
    { class: 'card stock-panel', 'aria-labelledby': 'stock-title', 'data-stock-panel': vm.kind },
    h('h2', { id: 'stock-title' }, t.title),
    vm.kind === 'none'
      ? h(
          'p',
          { class: 'note' },
          t.none,
          ' ',
          h('a', { class: 'line-link', href: '#/stock' }, t.openStock),
        )
      : h('ul', { class: 'stock-rows' }, ...vm.rows.map((r) => row(r, actions))),
  );
}
