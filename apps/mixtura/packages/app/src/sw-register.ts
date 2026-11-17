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
    if (!worker || !navigator.serviceWorker.controller) return;
    waiting = worker;
    store.set({ update: 'available' });
  };

  if ('serviceWorker' in navigator && window.isSecureContext) {
    void navigator.serviceWorker.register('sw.js').then((registration) => {
      offer(registration.waiting);
      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        installing?.addEventListener('statechange', () => {
          if (installing.state === 'installed') offer(installing);
        });
      });
    });
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (chosen) location.reload();
    });
  }

  return () => {
    chosen = true;
    waiting?.postMessage('skip-waiting');
  };
}
