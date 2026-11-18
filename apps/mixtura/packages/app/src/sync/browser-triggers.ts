// The browser events that start a sync cycle: the connection comes back, the
// page becomes visible again, the user changes a place's data. The scheduler
// decides what to do with each (docs/sync-cycle.md#triggers).

import type { AppState } from '../app-state';
import type { Store } from '../state';
import { onPlaceWritten } from '../stock/written';
import type { Scheduler } from './scheduler';

/** Starts listening; returns the way to stop (tests). */
export function watchSyncTriggers(scheduler: Scheduler, app: Store<AppState>): () => void {
  const redraw = (): void => app.set({ syncRev: app.get().syncRev + 1 });
  const online = (): void => {
    redraw();
    void scheduler.cameOnline();
  };
  const visible = (): void => {
    if (document.visibilityState === 'visible') void scheduler.becameVisible();
  };
  window.addEventListener('online', online);
  window.addEventListener('offline', redraw);
  document.addEventListener('visibilitychange', visible);
  const stop = onPlaceWritten((placeId) => scheduler.stockChanged(placeId));
  return () => {
    window.removeEventListener('online', online);
    window.removeEventListener('offline', redraw);
    document.removeEventListener('visibilitychange', visible);
    stop();
  };
}
