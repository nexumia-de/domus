import { initialState } from './app-state';
import { connect } from './data';
import { watchKeyboardInset } from './keyboard-inset';
import { startNavigation } from './navigation';
import { watchSyncTriggers } from './sync/browser-triggers';
import { watchShareLinks } from './share/watch';
import { watchInviteLinks } from './screens/sync/invite-watch';
import { applyTheme, loadPrefs } from './prefs';
import { screens } from './screens';
import { loadShortcuts } from './shortcuts-pref';
import { render, type Shell } from './shell/render';
import { createStore } from './state';
import { registerServiceWorker } from './sw-register';

const root = document.getElementById('app');
if (root) {
  const prefs = loadPrefs();
  const store = createStore(initialState(location.hash, prefs));
  applyTheme(prefs.theme);
  store.set({ shortcuts: loadShortcuts() });

  const connection = connect(store);
  const shell: Shell = {
    screens,
    store,
    data: connection.data,
    applyUpdate: () => undefined,
    retryData: connection.retry,
  };
  const draw = (): void => render(root, shell);

  // Redraw from state, once per burst of changes.
  let scheduled = false;
  store.subscribe((state, previous) => {
    if (state.theme !== previous.theme) applyTheme(state.theme);
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      draw();
    });
  });

  shell.applyUpdate = registerServiceWorker(store);
  startNavigation(store);
  watchShareLinks({ app: store, local: connection.data.local }, store, connection.ready);
  watchInviteLinks(store);
  watchKeyboardInset();
  watchSyncTriggers(connection.data.sync, store);
  void connection.ready.then(() => connection.data.sync.start());
  draw();

  document.addEventListener('keydown', (event) => {
    // Escape goes back from a pushed screen when no field has focus.
    const target = event.target as HTMLElement | null;
    if (event.key !== 'Escape' || target?.closest('input, textarea, select')) return;
    document.querySelector<HTMLElement>('[data-focus="back"]')?.click();
  });
}
