// The invite part of the Share sheet: the invite link with Copy and its QR
// code. The link is made by an async compression, so the first draw shows
// "Preparing" and a redraw follows; the result is kept in memory until the
// sheet closes (it holds the passphrase, like the sheet's other values).

import { qrSvg } from '../../components/qr';
import { h, type Child } from '../../dom';
import { type ScreenContext } from '../../screen';
import { makeInviteLink } from '../../sync/invite-link';
import { type ShareValues } from '../../sync/share-values';
import { appAddress } from '../../share/send';
import { copyRow } from './copy-row';
import { syncStrings } from './strings';

const t = syncStrings.share;

let made: { key: string; link: string } | null = null;
let pending: string | null = null;

/** Forgets the link; called when a sheet opens or closes. */
export function resetInvite(): void {
  made = null;
  pending = null;
}

const keyOf = (v: ShareValues): string =>
  JSON.stringify([v.address, v.folder, v.placeCode, v.passphrase]);

function request(context: ScreenContext, values: ShareValues): void {
  const key = keyOf(values);
  if (pending === key) return;
  pending = key;
  void makeInviteLink(values, appAddress()).then((link) => {
    if (pending !== key) return;
    pending = null;
    made = { key, link };
    context.store.set({ syncViewRev: context.store.get().syncViewRev + 1 });
  });
}

/** The link row and the code for the values; "Preparing" until the link is made. */
export function inviteBlock(context: ScreenContext, values: ShareValues): Child[] {
  if (made?.key !== keyOf(values)) {
    request(context, values);
    return [
      h('p', { class: 'note', role: 'status', 'data-testid': 'invite-preparing' }, t.preparing),
    ];
  }
  const { link } = made;
  const code = ((): SVGSVGElement | null => {
    try {
      return qrSvg(link, t.qrAria);
    } catch {
      return null; // longer than the largest code
    }
  })();
  return [
    copyRow(context, 'share-invite', t.inviteLink, link, true),
    code
      ? h('div', { class: 'qr', 'data-testid': 'invite-qr' }, code)
      : h('p', { class: 'note', 'data-testid': 'invite-no-qr' }, t.noQr),
  ];
}
