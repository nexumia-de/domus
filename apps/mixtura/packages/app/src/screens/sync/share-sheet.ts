// Share…: the four values another person enters by hand to join a place, each
// with Copy, and the sentence about who can read and change the stock; and
// Show Passphrase, the same for the passphrase alone.

import { h } from '../../dom';
import { type ScreenContext } from '../../screen';
import { shareValues } from '../../sync/share-values';
import { type Binding, type Place, type Storage } from '../../store';
import { copyRow } from './copy-row';
import { closeSyncSheet } from './sheet-address';
import { sheetFrame } from './sheet-frame';
import { syncStrings } from './strings';

export function shareSheet(
  context: ScreenContext,
  place: Place,
  storage: Storage,
  binding: Binding,
): HTMLElement {
  const t = syncStrings.share;
  const values = shareValues(storage, binding);
  return sheetFrame(
    'share',
    t.title(place.name),
    () => closeSyncSheet(context),
    h('p', { class: 'note' }, t.intro),
    copyRow(context, 'share-address', t.address, values.address),
    copyRow(context, 'share-folder', t.folder, values.folder),
    copyRow(context, 'share-code', t.placeCode, values.placeCode, true),
    copyRow(context, 'share-passphrase', t.passphrase, values.passphrase, true),
    h('p', { class: 'note', 'data-testid': 'share-warning' }, t.warning),
  );
}

export function passphraseSheet(
  context: ScreenContext,
  place: Place,
  binding: Binding,
): HTMLElement {
  const t = syncStrings.passphrase;
  return sheetFrame(
    'passphrase',
    t.title(place.name),
    () => closeSyncSheet(context),
    h('p', { class: 'note' }, t.text),
    copyRow(context, 'show-passphrase', syncStrings.share.passphrase, binding.passphrase, true),
  );
}
