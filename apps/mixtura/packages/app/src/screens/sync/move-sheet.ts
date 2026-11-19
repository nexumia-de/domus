// Move…: another storage or folder for the place. The merge and the marker in
// the old file are `relocatePlace`'s; this is the form around it.

import { h } from '../../dom';
import { type ScreenContext } from '../../screen';
import { relocatePlace } from '../../sync/relocate';
import { nowInstant } from '../../today';
import { invalidateSync, type SyncView } from '../../sync/view';
import { type Binding, type Place } from '../../store';
import { showToast } from '../../toast';
import { drafts } from './drafts';
import { problemLine, storageSelect, textField } from './fields';
import { closeSyncSheet } from './sheet-address';
import { sheetFrame } from './sheet-frame';
import { moveText, syncStrings } from './strings';

const t = syncStrings.move;
const d = drafts.move;

const redraw = (context: ScreenContext): void =>
  context.store.set({ syncViewRev: context.store.get().syncViewRev + 1 });

async function start(context: ScreenContext, place: Place): Promise<void> {
  const local = context.data.local();
  if (!local || d.busy) return;
  d.busy = true;
  d.problem = null;
  redraw(context);
  const result = await relocatePlace(
    { local, app: context.store, cipher: context.data.cipher, now: nowInstant },
    { placeId: place.id, storageId: d.storageId, folder: d.folder },
  );
  d.busy = false;
  invalidateSync(context.store);
  if (!result.ok) {
    d.problem = moveText(result.problem);
    return redraw(context);
  }
  closeSyncSheet(context);
  showToast(context.store, result.marked ? t.done(place.name) : t.unmarked(place.name));
}

export function moveSheet(
  context: ScreenContext,
  view: SyncView,
  place: Place,
  binding: Binding,
  writable: boolean,
): HTMLElement {
  if (!view.storages.some((s) => s.id === d.storageId)) d.storageId = binding.storageId;
  return sheetFrame(
    'move',
    t.title(place.name),
    () => closeSyncSheet(context),
    h('p', { class: 'note' }, t.intro),
    storageSelect('move-storage', syncStrings.bind.storage, view.storages, d.storageId, (id) => {
      d.storageId = id;
      d.problem = null;
    }),
    textField({
      id: 'move-folder',
      label: syncStrings.bind.folder,
      value: d.folder,
      oninput: (v) => {
        d.folder = v;
        d.problem = null;
      },
      onenter: () => void start(context, place),
    }),
    problemLine(d.problem, 'move-problem'),
    h(
      'div',
      { class: 'btn-row' },
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn--primary',
          disabled: !writable || d.busy,
          'data-focus': 'move-start',
          onclick: () => void start(context, place),
        },
        d.busy ? t.starting : t.start,
      ),
    ),
  );
}
