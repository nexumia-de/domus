// The shell of a sheet on the Sync page: backdrop, dialog with a title and a
// Close button, a scrolling body. Escape and a tap on the backdrop close it.

import * as glyph from '../../components/glyphs';
import { h, type Child } from '../../dom';
import { syncStrings } from './strings';

export function sheetFrame(
  name: string,
  title: string,
  close: () => void,
  ...body: Child[]
): HTMLElement {
  const sheet = h(
    'div',
    {
      class: 'sheet sync-sheet',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': title,
      tabindex: '-1',
      'data-sheet': name,
    },
    h(
      'div',
      { class: 'sheet-head' },
      h('h2', {}, title),
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn--icon',
          'aria-label': syncStrings.close,
          title: syncStrings.close,
          'data-focus': 'back',
          onclick: close,
        },
        glyph.close(),
      ),
    ),
    h('div', { class: 'sheet-scroll' }, ...body),
  );
  sheet.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    close();
  });
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
