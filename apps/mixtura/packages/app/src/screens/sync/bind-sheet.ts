// Sync This Place: choose a storage and a folder, see the generated
// passphrase with Copy, and start. The binding is stored and the first cycle
// runs. Texts: docs/ui-strings.md#sync.

import { h } from '../../dom';
import { type ScreenContext } from '../../screen';
import { bindPlace } from '../../sync/bindings';
import { normaliseFolder } from '../../sync/location';
import { generatePassphrase } from '../../sync/passphrase';
import { invalidateSync, type SyncView } from '../../sync/view';
import { type Place } from '../../store';
import { copyRow } from './copy-row';
import { drafts } from './drafts';
import { problemLine, storageSelect, textField } from './fields';
import { closeSyncSheet, openSyncSheet } from './sheet-address';
import { sheetFrame } from './sheet-frame';
import { joinText, syncStrings } from './strings';

const t = syncStrings.bind;
const d = drafts.bind;

const redraw = (context: ScreenContext): void =>
  context.store.set({ syncViewRev: context.store.get().syncViewRev + 1 });

async function start(context: ScreenContext, place: Place, view: SyncView): Promise<void> {
  const local = context.data.local();
  const storage = view.storages.find((s) => s.id === d.storageId) ?? view.storages[0];
  const folder = normaliseFolder(d.folder);
  if (!local || d.busy) return;
  if (!storage) {
    d.problem = joinText('no-storage');
    return redraw(context);
  }
  if (folder === null) {
    d.problem = joinText('invalid-folder');
    return redraw(context);
  }
  d.busy = true;
  d.problem = null;
  redraw(context);
  await bindPlace(local, {
    placeId: place.id,
    storageId: storage.id,
    folder,
    passphrase: d.passphrase,
  });
  invalidateSync(context.store);
  d.busy = false;
  closeSyncSheet(context);
  void context.data.sync.syncNow(place.id);
}

export function bindSheet(
  context: ScreenContext,
  view: SyncView,
  place: Place,
  writable: boolean,
): HTMLElement {
  // Made when the sheet is first drawn; a closed sheet forgets it, so each start has its own.
  if (d.passphrase === '') d.passphrase = generatePassphrase();
  if (!view.storages.some((s) => s.id === d.storageId)) d.storageId = view.storages[0]?.id ?? '';
  const select = storageSelect('bind-storage', t.storage, view.storages, d.storageId, (id) => {
    d.storageId = id;
  });
  return sheetFrame(
    'bind',
    t.title(place.name),
    () => closeSyncSheet(context),
    h('p', { class: 'note' }, t.intro),
    select ??
      h(
        'div',
        { class: 'sheet-group' },
        h('p', { class: 'note', 'data-testid': 'bind-no-storage' }, t.noStorage),
        h(
          'button',
          {
            type: 'button',
            class: 'btn btn--tonal',
            'data-focus': 'bind-add-storage',
            onclick: () => openSyncSheet(context, 'storage'),
          },
          syncStrings.storages.add,
        ),
      ),
    textField({
      id: 'bind-folder',
      label: t.folder,
      hint: t.folderHint(place.id),
      value: d.folder,
      oninput: (v) => {
        d.folder = v;
        d.problem = null;
      },
    }),
    copyRow(context, 'bind-passphrase', t.passphrase, d.passphrase, true),
    h('p', { class: 'note' }, t.passphraseHint),
    problemLine(d.problem, 'bind-problem'),
    h(
      'div',
      { class: 'btn-row' },
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn--primary',
          disabled: !writable || d.busy || view.storages.length === 0,
          'data-focus': 'bind-start',
          onclick: () => void start(context, place, view),
        },
        d.busy ? t.starting : t.start,
      ),
    ),
  );
}
