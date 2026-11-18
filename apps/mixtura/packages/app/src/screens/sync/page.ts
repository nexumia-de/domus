// The Sync page (#/settings/sync): storages, places and the sheets over them.
// Behaviour and states: docs/screens-sync.md.

import { h } from '../../dom';
import { type ScreenContext, type ScreenView } from '../../screen';
import { type SyncView, syncView, bindingOf } from '../../sync/view';
import { strings } from '../../strings';
import { bindSheet } from './bind-sheet';
import { joinSheet } from './join-sheet';
import { moveSheet } from './move-sheet';
import { placesBlock } from './places-block';
import { openSheetOf, sheetCode, sheetPlace } from './sheet-address';
import { passphraseSheet, shareSheet } from './share-sheet';
import { storageSheet } from './storage-sheet';
import { storagesBlock } from './storages-block';
import { syncStrings } from './strings';

/** The sheet the address names, or null (also for a place that is not there or not synced). */
function sheetOf(context: ScreenContext, view: SyncView, writable: boolean): HTMLElement | null {
  const sheet = openSheetOf(context);
  const place = view.places.find((p) => p.id === sheetPlace(context));
  const binding = place && bindingOf(view, place.id);
  const storage = binding && view.storages.find((s) => s.id === binding.storageId);
  switch (sheet) {
    case 'storage':
      return storageSheet(context, writable);
    case 'join':
      return joinSheet(context, view, sheetCode(context) !== null, writable);
    case 'bind':
      return place && !binding ? bindSheet(context, view, place, writable) : null;
    case 'move':
      return place && binding ? moveSheet(context, view, place, binding, writable) : null;
    case 'share':
      return place && binding && storage ? shareSheet(context, place, storage, binding) : null;
    case 'passphrase':
      return place && binding ? passphraseSheet(context, place, binding) : null;
    default:
      return null;
  }
}

let lastOpen: string | null = null;
let opener: string | null = null;

/** A sheet takes the focus when it opens (not a field: no keyboard) and gives it back when it closes. */
function moveFocus(open: string | null): void {
  if (open && !lastOpen) {
    opener = document.activeElement?.getAttribute('data-focus') ?? null;
    requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-sheet]')?.focus());
  } else if (!open && lastOpen && opener) {
    const target = opener;
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>(`[data-focus="${target}"]`)?.focus(),
    );
  }
  lastOpen = open;
}

export function syncPage(context: ScreenContext): ScreenView {
  moveFocus(openSheetOf(context));
  const view = syncView(context);
  const writable = context.state.storage.kind === 'ready';
  const body = h('div', { class: 'stack sync-page' });
  body.append(h('p', { class: 'note' }, syncStrings.intro));
  if (!writable && context.state.storage.kind !== 'opening') {
    body.append(h('p', { class: 'note' }, syncStrings.readOnly));
  }
  if (!view) {
    body.append(h('p', { class: 'note', role: 'status' }, syncStrings.loading));
  } else {
    body.append(storagesBlock(context, view, writable), placesBlock(context, view, writable));
    const sheet = sheetOf(context, view, writable);
    if (sheet) body.append(sheet);
  }
  return { title: strings.titles.sync, body };
}
