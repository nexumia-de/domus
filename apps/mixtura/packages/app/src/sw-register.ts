// Registers the service worker and reports a waiting update. The reload
// happens only after the user chose Update: the waiting worker is told
// to take over, and the page reloads once when it does.

import { type AppState } from './app-state';
import { type Store } from './state';

/** Returns the function the Update button calls. */
export function registerServiceWorker(store: Store<AppState>): () => void {
  let waiting: ServiceWorker | null = null;
  let chosen = false;

  const offer = (worker: ServiceWorker | null): void => {
    // Without a controller this is the first install, not an update.
    if (!worker || !navigator.serviceWorker?.controller) return;
    waiting = worker;
    store.set({ update: 'available' });
  };

  // Native wrappers (a custom scheme, a WebView without the API) may have no
  // service worker, or refuse the registration: the app then runs from the
  // network or the wrapper's files, without offline caching of its own.
  const container = typeof navigator === 'undefined' ? undefined : navigator.serviceWorker;
  if (container && window.isSecureContext) {
    try {
      container
        .register('sw.js')
        .then((registration) => {
          offer(registration.waiting);
          registration.addEventListener('updatefound', () => {
            const installing = registration.installing;
            installing?.addEventListener('statechange', () => {
              if (installing.state === 'installed') offer(installing);
            });
          });
        })
        .catch(() => undefined);
      container.addEventListener('controllerchange', () => {
        if (chosen) location.reload();
      });
    } catch {
      // Registration threw at once: same as unsupported.
    }
  }

  return () => {
    chosen = true;
    waiting?.postMessage('skip-waiting');
  };
}
