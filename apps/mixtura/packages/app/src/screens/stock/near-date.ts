// The small list on the Stock screen of prepared ingredients whose batch is
// close to its date or past it (#101). Derived from the stock records, the
// user's shelf life and today's date every time; no notification, nothing
// red. Each row opens the batches of that ingredient.

import * as glyph from '../../components/glyphs';
import { h } from '../../dom';
import type { Batch, NearDate } from '../../stock/batches';
import { batchStrings as t } from './batch-strings';
import { datesText, statusText } from './batch-text';

/** "Made on ... use by ..." with each date in a span that does not break at its hyphens. */
export const datesNodes = (batch: Batch): (Node | string)[] =>
  datesText(batch)
    .split(/(\d{4}-\d{2}-\d{2})/)
    .map((part) =>
      /^\d{4}-\d{2}-\d{2}$/.test(part) ? h('span', { class: 'nowrap' }, part) : part,
    );

export const shapeOf = (status: Batch['status']): SVGElement =>
  status === 'fresh' ? glyph.check() : status === 'use-soon' ? glyph.within() : glyph.none();

export function nearDateCard(
  list: readonly NearDate[],
  open: (id: string) => void,
): HTMLElement | null {
  if (list.length === 0) return null;
  return h(
    'section',
    { class: 'card stock-near', 'aria-labelledby': 'stock-near-title', 'data-near-date': '' },
    h('h2', { id: 'stock-near-title' }, t.nearTitle),
    h('p', { class: 'note' }, t.nearNote),
    h(
      'ul',
      { class: 'rows stock-near-list' },
      ...list.map((entry) =>
        h(
          'li',
          { 'data-near': entry.id },
          h(
            'button',
            {
              type: 'button',
              class: 'stock-near-item',
              'data-focus': `batches:${entry.id}`,
              onclick: () => open(entry.id),
            },
            h('span', { class: 'row-title' }, entry.name),
            ...entry.batches.flatMap((batch) => [
              h('span', { class: 'row-sub num' }, ...datesNodes(batch)),
              h(
                'span',
                { class: 'shelf-state', 'data-batch-state': batch.status },
                shapeOf(batch.status),
                h('span', {}, statusText(batch)),
              ),
            ]),
            entry.total > entry.batches.length &&
              h('span', { class: 'row-sub' }, t.more(entry.total - entry.batches.length)),
          ),
        ),
      ),
    ),
  );
}
