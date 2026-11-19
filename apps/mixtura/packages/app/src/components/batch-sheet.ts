// The batch sheet: what to mix for N servings, the water to add, the totals
// and the shelf life, over the spec screen (docs/screens-specs.md#servings-and-batch).
// Same sheet shape as the filters sheet; a fixed backdrop because the spec
// scrolls.

import { h } from '../dom';
import type { BatchVM } from '../screens/spec/batch-vm';
import { strings } from '../strings';
import { batchControls, type BatchActions } from './batch-controls';
import * as glyph from './glyphs';

export function batchSheet(vm: BatchVM, actions: BatchActions): HTMLElement {
  const close = actions.close;
  const body: (HTMLElement | false)[] = vm.failure
    ? [h('p', { class: 'note' }, vm.failure)]
    : [
        h(
          'section',
          { class: 'sheet-group', 'aria-label': strings.batch.lines },
          h('h3', {}, strings.batch.lines),
          h(
            'div',
            { role: 'list' },
            ...vm.lines.map((line) =>
              h(
                'div',
                { class: 'line', role: 'listitem' },
                h('span', { class: 'line-amount num' }, line.amount),
                h(
                  'span',
                  { class: 'line-main' },
                  h('span', { class: 'line-name' }, line.name),
                  line.note && h('span', { class: 'line-note' }, line.note),
                ),
              ),
            ),
          ),
        ),
        h(
          'dl',
          { class: 'meta batch-rows' },
          ...vm.rows.flatMap((row) => [
            h('dt', {}, row.label),
            h(
              'dd',
              {},
              row.value,
              row.note && h('span', { class: 'note metric-missing' }, row.note),
            ),
          ]),
        ),
      ];
  const sheet = h(
    'div',
    {
      class: 'sheet',
      role: 'dialog',
      'aria-label': vm.title,
      'aria-modal': 'true',
      tabindex: '-1',
      'data-sheet': '',
    },
    h(
      'div',
      { class: 'sheet-head' },
      h('h2', {}, vm.title),
      h(
        'button',
        {
          class: 'btn btn--icon',
          type: 'button',
          'aria-label': strings.batch.close,
          title: strings.batch.close,
          'data-focus': 'back',
          onclick: close,
        },
        glyph.close(),
      ),
    ),
    h(
      'div',
      { class: 'sheet-scroll' },
      batchControls(vm.control, actions),
      ...body,
      ...vm.notes.map((text) => h('p', { class: 'note' }, text)),
    ),
  );
  return h(
    'div',
    {
      class: 'sheet-backdrop sheet-backdrop--fixed',
      onclick: (event) => {
        if (event.target === event.currentTarget) close();
      },
    },
    sheet,
  );
}
