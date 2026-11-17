import { initialState } from './app-state';
import { startNavigation } from './navigation';
import { applyTheme, loadPrefs, savePrefs } from './prefs';
import { screens } from './screens';
import { render, type Shell } from './shell/render';
import { createStore } from './state';
import { registerServiceWorker } from './sw-register';

const root = document.getElementById('app');
if (root) {
  const prefs = loadPrefs();
  const store = createStore(initialState(location.hash, prefs));
  applyTheme(prefs.theme);

  const shell: Shell = { screens, store, applyUpdate: () => undefined };
  const draw = (): void => render(root, shell);

  // Redraw from state, once per burst of changes.
  let scheduled = false;
  store.subscribe((state, previous) => {
    if (state.theme !== previous.theme) applyTheme(state.theme);
    if (state.theme !== previous.theme || state.units !== previous.units) savePrefs(state);
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      draw();
    });
  });

  shell.applyUpdate = registerServiceWorker(store);
  startNavigation(store);
  draw();

  document.addEventListener('keydown', (event) => {
    // Escape goes back from a pushed screen when no field has focus.
    const target = event.target as HTMLElement | null;
    if (event.key !== 'Escape' || target?.closest('input, textarea, select')) return;
    document.querySelector<HTMLElement>('[data-focus="back"]')?.click();
  });
}
