// The browser events that ask for a sync cycle: the connection comes back, the
// page comes to the front, the user changes the stock of a space. The loops of
// the host package decide what to do with each (stock/sync.ts).

import { onSpaceWritten } from './written';
import type { StockSync } from './sync';

/** Starts listening; returns the way to stop (tests). */
export function watchSyncTriggers(sync: StockSync): () => void {
  const now = (): void => sync.syncNow();
  // Coming to the front also reads the spaces again: one may have been made, joined or given
  // a storage in the Household app in the meantime.
  const visible = (): void => {
    if (document.visibilityState !== 'visible') return;
    void sync.refresh().then(now);
  };
  window.addEventListener('online', now);
  document.addEventListener('visibilitychange', visible);
  const stop = onSpaceWritten((spaceId) => sync.changed(spaceId));
  return () => {
    window.removeEventListener('online', now);
    document.removeEventListener('visibilitychange', visible);
    stop();
  };
}
