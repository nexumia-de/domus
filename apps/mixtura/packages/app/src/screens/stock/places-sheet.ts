// The Places sheet over Stock (#131): every place with a check box "counts",
// the choice of the place new entries go to, Rename and Remove (with Undo),
// and Add Place. Refusals are said in words under the list. Address:
// `?sheet=places`. Focus goes into the sheet and back to the Places button.

import * as glyph from '../../components/glyphs';
import { h } from '../../dom';
import { type ScreenContext } from '../../screen';
import {
  addPlace,
  chooseEntry,
  refusalText,
  removePlace,
  renamePlace,
  tickPlace,
} from '../../stock/places-actions';
import { stockState } from '../../stock/state';
import { statusOf, syncView } from '../../sync/view';
import { statusText } from '../sync/status-text';
import { nowInstant } from '../../today';
import { strings } from '../../strings';
import { closeSheet, sheetIs } from './sheet-address';

const t = strings.places;

let problem: string | null = null;
let addDraft = '';
/** The place being renamed and the text so far. */
let renaming: { id: string; text: string } | null = null;
/** The text a rename was refused for: a blur caused by the redraw must not ask again. */
let refused: string | null = null;
let wasOpen = false;

const redraw = (context: ScreenContext): void =>
  context.store.set({ stockRev: context.store.get().stockRev + 1 });

export const placesOpen = (context: ScreenContext): boolean => sheetIs(context, 'places');

/** After a redraw: the sheet takes the focus when it opens and gives it back to the Places button. */
export function placesFocus(context: ScreenContext, body: HTMLElement): void {
  const open = placesOpen(context);
  if (open && !wasOpen) {
    problem = null;
    addDraft = '';
    renaming = null;
    refused = null;
    requestAnimationFrame(() => body.querySelector<HTMLElement>('[data-sheet="places"]')?.focus());
  } else if (!open && wasOpen) {
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>('[data-focus="places"]')?.focus(),
    );
  }
  wasOpen = open;
}

export function placesSheet(context: ScreenContext, writable: boolean): HTMLElement | null {
  const state = stockState(context);
  if (!placesOpen(context) || state.kind !== 'ready') return null;
  const { places, ticked, entry } = state.selection;
  const say = (refusal: Parameters<typeof refusalText>[0] | null): void => {
    problem = refusal ? refusalText(refusal) : null;
    redraw(context);
  };
  const saveName = (id: string): void => {
    const open = renaming;
    if (!open || open.id !== id) return;
    const refusal = renamePlace(context, id, open.text);
    refused = refusal ? open.text : null;
    if (!refusal) renaming = null;
    say(refusal);
  };

  const sync = syncView(context);
  const online = globalThis.navigator?.onLine !== false;
  const row = (place: (typeof places)[number]): HTMLElement => {
    const on = ticked.includes(place.id);
    const editing = renaming?.id === place.id;
    const name = editing
      ? h('input', {
          type: 'text',
          class: 'input place-name-input',
          name: 'place-name',
          'aria-label': t.renameField(place.name),
          'data-focus': `place-name:${place.id}`,
          value: renaming?.text ?? place.name,
          oninput: (event) => {
            if (renaming) renaming.text = (event.target as HTMLInputElement).value;
            refused = null;
          },
          onkeydown: (e) => {
            const event = e as KeyboardEvent;
            if (event.key === 'Enter') {
              event.preventDefault();
              saveName(place.id);
            } else if (event.key === 'Escape') {
              event.stopPropagation();
              renaming = null;
              problem = null;
              redraw(context);
            }
          },
          onblur: () => {
            if (renaming?.text !== refused) saveName(place.id);
          },
        })
      : h('span', { class: 'row-title', 'data-place-name': place.id }, place.name);
    return h(
      'li',
      { class: 'place-row', 'data-place': place.id },
      h(
        'div',
        { class: 'place-main' },
        h(
          'button',
          {
            type: 'button',
            role: 'checkbox',
            class: 'stock-toggle place-count',
            'aria-checked': on ? 'true' : 'false',
            'aria-label': t.countsName(place.name),
            'aria-disabled': writable ? undefined : 'true',
            'data-focus': `place-tick:${place.id}`,
            onclick: () => writable && say(tickPlace(context, place.id)),
          },
          h(
            'span',
            { class: `check${on ? ' on' : ''}`, 'aria-hidden': 'true' },
            on && glyph.check(),
          ),
          editing ? null : name,
        ),
        editing ? name : null,
      ),
      sync &&
        h(
          'span',
          { class: 'note place-sync', 'data-place-sync': place.id },
          statusText(
            statusOf(sync, place.id, { activity: context.data.sync.activity, online }),
            nowInstant(),
          ),
        ),
      h(
        'div',
        { class: 'place-actions' },
        h(
          'button',
          {
            type: 'button',
            role: 'radio',
            class: 'btn btn--text place-entry',
            'aria-checked': entry === place.id ? 'true' : 'false',
            'aria-disabled': writable ? undefined : 'true',
            'data-focus': `place-entry:${place.id}`,
            onclick: () => {
              if (!writable) return;
              chooseEntry(context, place.id);
              say(null);
            },
          },
          h('span', { class: `radio${entry === place.id ? ' on' : ''}`, 'aria-hidden': 'true' }),
          t.entry,
        ),
        h(
          'button',
          {
            type: 'button',
            class: 'btn btn--text',
            disabled: !writable || editing,
            'aria-label': t.renameAria(place.name),
            'data-focus': `place-rename:${place.id}`,
            onclick: () => {
              renaming = { id: place.id, text: place.name };
              refused = null;
              problem = null;
              redraw(context);
              requestAnimationFrame(() =>
                document
                  .querySelector<HTMLElement>(`[data-focus="place-name:${place.id}"]`)
                  ?.focus(),
              );
            },
          },
          t.rename,
        ),
        h(
          'button',
          {
            type: 'button',
            class: 'btn btn--text',
            disabled: !writable || places.length <= 1,
            'aria-label': t.removeAria(place.name),
            'data-focus': `place-remove:${place.id}`,
            onclick: () => {
              problem = null;
              say(removePlace(context, place.id));
            },
          },
          t.remove,
        ),
      ),
    );
  };

  const add = (): void => {
    const refusal = addPlace(context, addDraft);
    if (!refusal) addDraft = '';
    say(refusal);
  };
  const sheet = h(
    'div',
    {
      class: 'sheet places-sheet',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': t.title,
      tabindex: '-1',
      'data-sheet': 'places',
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
      h('ul', { class: 'rows place-list', 'aria-label': t.listLabel }, ...places.map(row)),
      places.length <= 1 && h('p', { class: 'note' }, t.onlyPlace),
      problem &&
        h('p', { class: 'field-error', role: 'alert', 'data-places-problem': '' }, problem),
      h(
        'div',
        { class: 'sheet-group' },
        h('p', { class: 'note' }, strings.places.syncLinkHint),
        h(
          'a',
          { class: 'btn btn--tonal', href: '#/settings/sync', 'data-focus': 'places-sync' },
          strings.places.syncLink,
        ),
      ),
      h(
        'div',
        { class: 'sheet-group' },
        h('h3', {}, t.addTitle),
        h('label', { for: 'place-add' }, t.addLabel),
        h('input', {
          type: 'text',
          class: 'input',
          id: 'place-add',
          name: 'new-place',
          autocomplete: 'off',
          disabled: !writable,
          value: addDraft,
          'data-focus': 'place-add',
          oninput: (event) => {
            addDraft = (event.target as HTMLInputElement).value;
          },
          onkeydown: (e) => {
            const event = e as KeyboardEvent;
            if (event.key === 'Enter') {
              event.preventDefault();
              add();
            }
          },
        }),
        h(
          'div',
          { class: 'btn-row' },
          h(
            'button',
            {
              type: 'button',
              class: 'btn btn--primary',
              disabled: !writable,
              'data-focus': 'place-add-button',
              onclick: add,
            },
            t.addButton,
          ),
        ),
        !writable && h('p', { class: 'note' }, t.readOnly),
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
