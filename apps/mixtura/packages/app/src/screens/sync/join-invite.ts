// The parts of the Join sheet that an invite adds: the storage it names is
// chosen when one is configured, and when none is the sheet says which
// address it expects and offers Add Storage with that address filled in.

import { h, type Child } from '../../dom';
import { type ScreenContext } from '../../screen';
import { type SyncView } from '../../sync/view';
import { drafts, reset } from './drafts';
import { openSyncSheet } from './sheet-address';
import { syncStrings } from './strings';

const t = syncStrings.join;
const d = drafts.join;

const matching = (view: SyncView) =>
  d.address === '' ? undefined : view.storages.find((s) => s.baseUrl === d.address);

/** Sets the chosen storage: the one at the invite's address until the user picks another, else the first. */
export function chooseStorage(view: SyncView): void {
  const match = matching(view);
  if (match && !d.picked) d.storageId = match.id;
  else if (!view.storages.some((s) => s.id === d.storageId)) {
    d.storageId = view.storages[0]?.id ?? '';
  }
}

/** The note with Add Storage when the invite names an address no storage has; nothing otherwise. */
export function inviteStorageNote(context: ScreenContext, view: SyncView): Child {
  if (d.address === '' || matching(view)) return null;
  return h(
    'div',
    { class: 'sheet-group' },
    h('p', { class: 'note', 'data-testid': 'join-invite-storage' }, t.inviteStorage(d.address)),
    h(
      'button',
      {
        type: 'button',
        class: 'btn btn--tonal',
        'data-focus': 'join-add-storage',
        onclick: () => {
          reset('storage');
          drafts.storage.address = d.address;
          openSyncSheet(context, 'storage');
        },
      },
      syncStrings.storages.add,
    ),
  );
}
