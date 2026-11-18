// The Storages card of the Sync page: the list, Remove with Undo, Add Storage.

import { h } from '../../dom';
import { type ScreenContext } from '../../screen';
import { removeStorage, placesUsing } from '../../sync/storages';
import { invalidateSync, type SyncView } from '../../sync/view';
import { type Storage } from '../../store';
import { showToast } from '../../toast';
import { drafts, reset } from './drafts';
import { openSyncSheet } from './sheet-address';
import { syncStrings } from './strings';

const t = syncStrings.storages;

async function remove(context: ScreenContext, view: SyncView, storage: Storage): Promise<void> {
  const local = context.data.local();
  if (!local) return;
  const using = placesUsing(storage.id, view.bindings, view.places);
  if (using.length > 0) {
    drafts.page = t.inUse(storage.label, using);
    invalidateSync(context.store);
    return;
  }
  const done = await removeStorage(local, storage);
  drafts.page = done.ok ? null : t.inUse(storage.label, done.places);
  invalidateSync(context.store);
  if (!done.ok) return;
  showToast(context.store, t.removed(storage.label), () => {
    void local.storages.put(storage).then(() => invalidateSync(context.store));
  });
}

export function storagesBlock(
  context: ScreenContext,
  view: SyncView,
  writable: boolean,
): HTMLElement {
  const row = (storage: Storage): HTMLElement =>
    h(
      'li',
      { class: 'sync-row', 'data-storage': storage.id },
      h(
        'div',
        { class: 'row-main' },
        h('span', { class: 'row-title' }, storage.label),
        h('span', { class: 'row-sub sync-address' }, storage.baseUrl),
        storage.username !== undefined &&
          h('span', { class: 'row-sub' }, t.userLine(storage.username)),
      ),
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn--text',
          disabled: !writable,
          'aria-label': t.removeAria(storage.label),
          'data-focus': `storage-remove:${storage.id}`,
          onclick: () => void remove(context, view, storage),
        },
        t.remove,
      ),
    );
  return h(
    'section',
    { class: 'card', 'aria-labelledby': 'sync-storages-title' },
    h('h2', { id: 'sync-storages-title' }, t.title),
    view.storages.length === 0
      ? h('p', { class: 'note', 'data-testid': 'no-storages' }, t.empty)
      : h('ul', { class: 'rows', 'aria-label': t.listLabel }, ...view.storages.map(row)),
    drafts.page &&
      h(
        'p',
        { class: 'field-error', role: 'alert', 'data-testid': 'sync-page-problem' },
        drafts.page,
      ),
    h(
      'div',
      { class: 'btn-row' },
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn--primary',
          disabled: !writable,
          'data-focus': 'storage-add',
          onclick: () => {
            reset('storage');
            drafts.page = null;
            openSyncSheet(context, 'storage');
          },
        },
        t.add,
      ),
    ),
  );
}
