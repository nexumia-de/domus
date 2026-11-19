// The Places card of the Sync page: every place with its state line and the
// actions that fit its state, and the page-level Sync All and Join a Place.

import { h } from '../../dom';
import { type ScreenContext } from '../../screen';
import { unbindPlace } from '../../sync/bindings';
import { type PlaceStatus } from '../../sync/status';
import { bindingOf, invalidateSync, statusOf, type SyncView } from '../../sync/view';
import { type Binding, type Place } from '../../store';
import { showToast } from '../../toast';
import { nowInstant } from '../../today';
import { drafts, reset } from './drafts';
import { openSyncSheet } from './sheet-address';
import { statusNeedsLink, statusText } from './status-text';
import { SETUP_URL, syncStrings } from './strings';

const t = syncStrings.places;

async function stop(context: ScreenContext, place: Place): Promise<void> {
  const local = context.data.local();
  if (!local) return;
  const old = await unbindPlace(local, place.id);
  invalidateSync(context.store);
  if (!old) return;
  showToast(context.store, t.stopped(place.name), () => {
    void local.bindings.put(old).then(() => invalidateSync(context.store));
  });
}

function actions(
  context: ScreenContext,
  place: Place,
  binding: Binding | undefined,
  status: PlaceStatus,
  writable: boolean,
): HTMLElement {
  const button = (
    key: string,
    text: string,
    aria: string,
    onclick: () => void,
    tonal = false,
  ): HTMLElement =>
    h(
      'button',
      {
        type: 'button',
        class: `btn ${tonal ? 'btn--tonal' : 'btn--text'}`,
        disabled: !writable,
        'aria-label': aria,
        'data-focus': `${key}:${place.id}`,
        onclick,
      },
      text,
    );
  if (!binding) {
    return h(
      'div',
      { class: 'place-actions' },
      button('place-bind', t.syncThis, t.syncThisAria(place.name), () => {
        reset('bind');
        openSyncSheet(context, 'bind', { place: place.id });
      }),
    );
  }
  const moved = status.kind === 'problem' && status.problem === 'moved';
  return h(
    'div',
    { class: 'place-actions' },
    moved
      ? button(
          'place-join-again',
          t.joinAgain,
          t.joinAgainAria(place.name),
          () => {
            reset('join');
            drafts.join.code = place.id;
            openSyncSheet(context, 'join', { code: place.id });
          },
          true,
        )
      : button('place-sync-now', t.syncNow, t.syncNowAria(place.name), () => {
          void context.data.sync.syncNow(place.id);
        }),
    !moved &&
      button('place-share', t.share, t.shareAria(place.name), () =>
        openSyncSheet(context, 'share', { place: place.id }),
      ),
    !moved &&
      button('place-move', t.move, t.moveAria(place.name), () => {
        reset('move');
        drafts.move.storageId = binding.storageId;
        drafts.move.folder = binding.folder;
        openSyncSheet(context, 'move', { place: place.id });
      }),
    button('place-passphrase', t.passphrase, t.passphraseAria(place.name), () =>
      openSyncSheet(context, 'passphrase', { place: place.id }),
    ),
    button('place-stop', t.stop, t.stopAria(place.name), () => void stop(context, place)),
  );
}

export function placesBlock(
  context: ScreenContext,
  view: SyncView,
  writable: boolean,
): HTMLElement {
  const now = nowInstant();
  const online = globalThis.navigator?.onLine !== false;
  const row = (place: Place): HTMLElement => {
    const binding = bindingOf(view, place.id);
    const status = statusOf(view, place.id, { activity: context.data.sync.activity, online });
    const storage = binding && view.storages.find((s) => s.id === binding.storageId);
    return h(
      'li',
      { class: 'sync-row sync-row--place', 'data-place': place.id },
      h(
        'div',
        { class: 'row-main' },
        h('span', { class: 'row-title', 'data-place-name': place.id }, place.name),
        h(
          'span',
          { class: 'row-sub', 'data-testid': 'place-status', 'data-status': status.kind },
          statusText(status, now),
        ),
        binding &&
          storage &&
          h('span', { class: 'row-sub' }, t.storageLine(storage.label, binding.folder)),
        statusNeedsLink(status) &&
          h(
            'a',
            {
              class: 'btn btn--text',
              href: SETUP_URL,
              target: '_blank',
              rel: 'noopener noreferrer',
            },
            syncStrings.setupLink,
          ),
      ),
      actions(context, place, binding, status, writable),
    );
  };
  return h(
    'section',
    { class: 'card', 'aria-labelledby': 'sync-places-title' },
    h('h2', { id: 'sync-places-title' }, t.title),
    view.places.length === 0
      ? h('p', { class: 'note' }, t.empty)
      : h('ul', { class: 'rows', 'aria-label': t.listLabel }, ...view.places.map(row)),
    h(
      'div',
      { class: 'btn-row' },
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn--primary',
          disabled: !writable || view.bindings.length === 0,
          'data-focus': 'sync-all',
          onclick: () => void context.data.sync.syncAll(),
        },
        t.syncAll,
      ),
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn--tonal',
          disabled: !writable,
          'data-focus': 'join-open',
          onclick: () => {
            reset('join');
            openSyncSheet(context, 'join');
          },
        },
        t.join,
      ),
    ),
  );
}
