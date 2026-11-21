// The Spaces sheet over Stock: every space of the device with a check box
// "counts", the choice of the space new entries go to, and how its stock is
// kept in step. Spaces are made, named, shared and removed in the Household
// app; the sheet links there. Refusals are said in words under the list.
// Address: `?sheet=spaces`. Focus goes into the sheet and back to the Spaces
// button.

import * as glyph from '../../components/glyphs';
import { h } from '../../dom';
import { householdHref } from '../../household';
import { type ScreenContext } from '../../screen';
import { chooseEntry, refusalText, tickSpace } from '../../stock/spaces-actions';
import { stockState } from '../../stock/state';
import { nowInstant } from '../../today';
import { strings } from '../../strings';
import { closeSheet, sheetIs } from './sheet-address';
import { statusText } from '@nexumia-de/hospes';

const t = strings.spaces;

let problem: string | null = null;
let wasOpen = false;

const redraw = (context: ScreenContext): void =>
  context.store.set({ stockRev: context.store.get().stockRev + 1 });

export const spacesOpen = (context: ScreenContext): boolean => sheetIs(context, 'spaces');

/** After a redraw: the sheet takes the focus when it opens and gives it back to the Spaces button. */
export function spacesFocus(context: ScreenContext, body: HTMLElement): void {
  const open = spacesOpen(context);
  if (open && !wasOpen) {
    problem = null;
    requestAnimationFrame(() => body.querySelector<HTMLElement>('[data-sheet="spaces"]')?.focus());
  } else if (!open && wasOpen) {
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>('[data-focus="spaces"]')?.focus(),
    );
  }
  wasOpen = open;
}

export function spacesSheet(context: ScreenContext, writable: boolean): HTMLElement | null {
  const state = stockState(context);
  if (!spacesOpen(context) || state.kind !== 'ready') return null;
  const { spaces, ticked, entry } = state.selection;
  const say = (refusal: Parameters<typeof refusalText>[0] | null): void => {
    problem = refusal ? refusalText(refusal) : null;
    redraw(context);
  };
  const online = globalThis.navigator?.onLine !== false;
  const now = nowInstant();

  const row = (space: (typeof spaces)[number]): HTMLElement => {
    const on = ticked.includes(space.id);
    const status = statusText(
      strings.spaces.status,
      context.data.sync.status(space.id) ??
        (space.deviceOnly ? { kind: 'device-only' } : undefined),
      now,
      online,
    );
    return h(
      'li',
      { class: 'space-row', 'data-space': space.id },
      h(
        'div',
        { class: 'space-main' },
        h(
          'button',
          {
            type: 'button',
            role: 'checkbox',
            class: 'stock-toggle space-count',
            'aria-checked': on ? 'true' : 'false',
            'aria-label': t.countsName(space.name),
            'aria-disabled': writable ? undefined : 'true',
            'data-focus': `space-tick:${space.id}`,
            onclick: () => writable && say(tickSpace(context, space.id)),
          },
          h(
            'span',
            { class: `check${on ? ' on' : ''}`, 'aria-hidden': 'true' },
            on && glyph.check(),
          ),
          h('span', { class: 'row-title', 'data-space-name': space.id }, space.name),
        ),
      ),
      status !== '' && h('span', { class: 'note space-sync', 'data-space-sync': space.id }, status),
      h(
        'div',
        { class: 'space-actions' },
        h(
          'button',
          {
            type: 'button',
            role: 'radio',
            class: 'btn btn--text space-entry',
            'aria-checked': entry === space.id ? 'true' : 'false',
            'aria-disabled': writable ? undefined : 'true',
            'data-focus': `space-entry:${space.id}`,
            onclick: () => {
              if (!writable) return;
              chooseEntry(context, space.id);
              say(null);
            },
          },
          h('span', { class: `radio${entry === space.id ? ' on' : ''}`, 'aria-hidden': 'true' }),
          t.entry,
        ),
      ),
    );
  };

  const sheet = h(
    'div',
    {
      class: 'sheet spaces-sheet',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': t.title,
      tabindex: '-1',
      'data-sheet': 'spaces',
    },
    h(
      'div',
      { class: 'sheet-head' },
      h('h2', {}, t.title),
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn--icon',
          'aria-label': t.close,
          title: t.close,
          'data-focus': 'back',
          onclick: () => closeSheet(context),
        },
        glyph.close(),
      ),
    ),
    h(
      'div',
      { class: 'sheet-scroll' },
      h('p', { class: 'note' }, t.intro),
      h('ul', { class: 'rows space-list', 'aria-label': t.listLabel }, ...spaces.map(row)),
      problem &&
        h('p', { class: 'field-error', role: 'alert', 'data-spaces-problem': '' }, problem),
      !writable && h('p', { class: 'note' }, t.readOnly),
      h(
        'div',
        { class: 'sheet-group' },
        h('p', { class: 'note' }, t.householdHint),
        h(
          'a',
          { class: 'btn btn--tonal', href: householdHref(), 'data-focus': 'spaces-household' },
          t.householdLink,
        ),
      ),
    ),
  );
  sheet.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    closeSheet(context);
  });
  return h(
    'div',
    {
      class: 'sheet-backdrop sheet-backdrop--fixed',
      onclick: (event) => {
        if (event.target === event.currentTarget) closeSheet(context);
      },
    },
    sheet,
  );
}
