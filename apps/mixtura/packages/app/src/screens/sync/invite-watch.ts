// Takes an invite link out of the address. A route `#/join/<payload>` (the app
// opened by a link, or a link pasted into the address bar of a running app)
// is replaced at once by the join sheet's address, so the payload (with the
// passphrase in it) stays neither in the address bar nor in the history and
// a reload does not apply it again. The decoded values go into the join
// draft in memory; a link that cannot be read opens the sheet empty with the
// reason. Nothing is written to storage before the user presses Join.
// Docs: docs/screens-sync.md#invite-link.

import { type AppState } from '../../app-state';
import { replace } from '../../navigation';
import { type Store } from '../../state';
import { JOIN_ROUTE, readInviteLink } from '../../sync/invite-link';
import { fillJoinDraft } from './invite-draft';
import { syncAddress } from './sheet-address';

export function watchInviteLinks(store: Store<AppState>): void {
  let claiming = false;
  const check = (): void => {
    if (claiming) return;
    const { route } = store.get();
    if (route.path[0] !== JOIN_ROUTE) return;
    const payload = route.path.slice(1).join('/');
    claiming = true;
    replace(store, syncAddress('join'));
    claiming = false;
    void readInviteLink(payload).then((read) => {
      fillJoinDraft(read);
      store.set({ syncViewRev: store.get().syncViewRev + 1 });
    });
  };
  store.subscribe(check);
  check();
}
