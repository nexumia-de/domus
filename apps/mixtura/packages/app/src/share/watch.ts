// Takes a share link out of the address. A route `#/share/<payload>` (the app
// opened by a link, or a link pasted into the address bar of a running app)
// is replaced at once by `#/share`, so the payload stays neither in the
// address bar nor in the history and a reload does not apply it again; the
// payload is handed to `openShare` once the local store is open. A bare
// `#/share` with nothing to show (a reload) goes to the normal start.

import { type AppState } from '../app-state';
import { DEFAULT_HASH } from '../router';
import { replace } from '../navigation';
import { type Store } from '../state';
import { openShare, SHARE_HASH, type OpenHost } from './open';

export function watchShareLinks(
  host: OpenHost,
  store: Store<AppState>,
  ready: Promise<unknown>,
): void {
  let claiming = false;
  const check = (): void => {
    if (claiming) return;
    const { route, importFlow } = store.get();
    if (route.path[0] !== 'share') return;
    if (route.path.length > 1) {
      const payload = route.path.slice(1).join('/');
      // Busy first: the screen shows "opening" and the bare-route rule below stays quiet.
      claiming = true;
      store.set({ importFlow: { kind: 'busy' } });
      replace(store, SHARE_HASH);
      claiming = false;
      void ready.then(() => openShare(host, payload));
      return;
    }
    if (importFlow.kind === 'idle') replace(store, DEFAULT_HASH);
  };
  store.subscribe(check);
  check();
}
