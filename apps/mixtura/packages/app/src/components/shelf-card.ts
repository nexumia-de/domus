// The batch card of a prepared ingredient (#37): shelf life and storage as the
// user entered them, "made on ... use by ...", where the batch stands in words
// and a shape (a check, a dash), and the actions I made this, Made on another
// day and Used up. No colour carries the state and nothing is red.

import { h } from '../dom';
import * as glyph from './glyphs';
import { shelfStrings as t } from '../screens/spec/shelf-strings';
import type { BatchStatus, ShelfVM } from '../screens/spec/shelf-vm';

export interface ShelfActions {
  /** Absent while the stock cannot be written. */
  madeToday?: () => void;
  madeOn?: (date: string) => void;
  usedUp?: () => void;
}

const shape = (status: BatchStatus): SVGElement =>
  status === 'fresh' ? glyph.check() : status === 'use-soon' ? glyph.within() : glyph.none();

/** The text with each date in a span that does not break at its hyphens. */
function dateParts(text: string): (Node | string)[] {
  return text
    .split(/(\d{4}-\d{2}-\d{2})/)
    .map((part) =>
      /^\d{4}-\d{2}-\d{2}$/.test(part) ? h('span', { class: 'nowrap' }, part) : part,
    );
}

export function shelfCard(vm: ShelfVM | undefined, actions: ShelfActions): HTMLElement | null {
  if (!vm) return null;
  const date = h('input', {
    type: 'date',
    class: 'input shelf-date',
    id: 'shelf-date',
    name: 'made-on',
    'aria-label': t.dateLabel,
  });
  return h(
    'section',
    {
      class: 'card shelf-card',
      'aria-labelledby': 'shelf-title',
      'data-shelf': vm.batch?.status ?? 'none',
    },
    h('h2', { id: 'shelf-title' }, t.title),
    h('p', { class: 'shelf-life', 'data-shelf-life': '' }, vm.shelfLine),
    vm.storage && h('p', { class: 'shelf-storage' }, t.storage(vm.storage)),
    vm.batch
      ? h(
          'div',
          { class: 'shelf-batch', 'data-batch-state': vm.batch.status },
          h('p', { class: 'shelf-dates num' }, ...dateParts(vm.batch.dates)),
          h('p', { class: 'shelf-state' }, shape(vm.batch.status), h('span', {}, vm.batch.text)),
          vm.batch.others > 0 && h('p', { class: 'note' }, t.otherBatches(vm.batch.others)),
        )
      : h('p', { class: 'note' }, t.noBatch),
    actions.madeToday
      ? h(
          'div',
          { class: 'shelf-actions' },
          h(
            'button',
            {
              type: 'button',
              class: 'btn btn--primary',
              'data-action': 'made-today',
              'aria-label': t.madeThisAria(vm.name),
              onclick: actions.madeToday,
            },
            t.madeThis,
          ),
          vm.batch &&
            h(
              'button',
              {
                type: 'button',
                class: 'btn',
                'data-action': 'used-up',
                'aria-label': t.usedUpAria(vm.name),
                onclick: () => actions.usedUp?.(),
              },
              t.usedUp,
            ),
        )
      : h('p', { class: 'note' }, t.readOnly),
    actions.madeOn &&
      h(
        'div',
        { class: 'shelf-other' },
        h('label', { for: 'shelf-date' }, t.otherDay),
        h(
          'span',
          { class: 'shelf-other-row' },
          date,
          h(
            'button',
            {
              type: 'button',
              class: 'btn',
              'data-action': 'set-made-on',
              onclick: () => {
                if (date.value !== '') actions.madeOn?.(date.value);
              },
            },
            t.setDate,
          ),
        ),
      ),
  );
}
