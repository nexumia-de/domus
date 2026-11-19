// The share sheet over the spec screen: the drink's name, Copy Link, the
// system share sheet where there is one, and the link in a read-only field
// that is always there, so a browser without clipboard access still works
// (docs/screens-specs.md#share-a-drink). Same sheet shape as the batch sheet.

import { type ShareState } from '../app-state';
import { h } from '../dom';
import { canSystemShare, type ShareSender } from '../share/send';
import { shareStrings as t } from '../share/strings';
import * as glyph from './glyphs';

function content(share: ShareState, sender: ShareSender): (HTMLElement | false)[] {
  switch (share.kind) {
    case 'closed':
    case 'busy':
      return [h('p', { class: 'note', role: 'status' }, t.preparing)];
    case 'failed':
      return [h('p', { class: 'note', role: 'alert' }, t.failed)];
    case 'too-long':
      return [
        h(
          'p',
          { class: 'note', role: 'alert', 'data-testid': 'share-too-long' },
          h('strong', {}, t.tooLongTitle),
        ),
        h('p', { class: 'note' }, t.tooLongText),
        h('a', { class: 'btn btn--tonal', href: '#/settings/data' }, t.openData),
      ];
    case 'ready': {
      const field = h('input', {
        class: 'input',
        type: 'text',
        readonly: '',
        value: share.url,
        'aria-label': t.linkLabel,
        'data-testid': 'share-link',
        'data-focus': 'share-link',
        onfocus: (event) => (event.target as HTMLInputElement).select(),
      });
      return [
        h('label', { class: 'field' }, h('span', { class: 'label' }, t.linkLabel), field),
        h(
          'div',
          { class: 'btn-row' },
          h(
            'button',
            {
              class: 'btn btn--primary',
              type: 'button',
              'data-focus': 'share-copy',
              onclick: () => void sender.copy(),
            },
            t.copy,
          ),
          canSystemShare() &&
            h(
              'button',
              {
                class: 'btn btn--tonal',
                type: 'button',
                'data-focus': 'share-send',
                onclick: () => void sender.send(t.systemShareTitle(share.name)),
              },
              t.systemShare,
            ),
        ),
        share.note !== 'none' &&
          h(
            'p',
            { class: 'note', role: 'status', 'data-testid': 'share-note' },
            share.note === 'copied' ? t.copied : t.copyFailed,
          ),
      ];
    }
  }
}

export function shareSheet(
  share: ShareState,
  name: string,
  sender: ShareSender,
  close: () => void,
): HTMLElement {
  const sheet = h(
    'div',
    {
      class: 'sheet',
      role: 'dialog',
      'aria-label': t.sheetTitle(name),
      'aria-modal': 'true',
      tabindex: '-1',
      'data-sheet': '',
      'data-testid': 'share-sheet',
    },
    h(
      'div',
      { class: 'sheet-head' },
      h('h2', {}, t.sheetTitle(name)),
      h(
        'button',
        {
          class: 'btn btn--icon',
          type: 'button',
          'aria-label': t.close,
          title: t.close,
          'data-focus': 'back',
          onclick: close,
        },
        glyph.close(),
      ),
    ),
    h(
      'div',
      { class: 'sheet-scroll' },
      h('p', { class: 'note' }, t.intro),
      ...content(share, sender),
    ),
  );
  sheet.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    // The sheet takes Escape itself; the app's Escape would leave the screen.
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
