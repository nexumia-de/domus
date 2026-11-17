// The single state object of the app. Only what the shell needs; screens
// derive everything else. The route is the URL; preferences live in the
// local store (store/), with a copy in prefs.ts for the first paint.

import { type DestId } from './destinations';
import { parseHash, type Route } from './router';
import { type PersistState, type StoreErrorKind } from './store';

export type Theme = 'system' | 'light' | 'dark';
export type Units = 'metric' | 'us' | 'imperial';

/** The local store: opening, usable, or failed (the app is then read-only). */
export type StorageStatus =
  | { kind: 'opening' }
  | { kind: 'ready' }
  | { kind: 'error'; error: StoreErrorKind; reason: string };

export interface AppState {
  route: Route;
  theme: Theme;
  units: Units;
  /** A new service worker is waiting; the banner offers the update. */
  update: 'none' | 'available';
  storage: StorageStatus;
  /** The built-in data: loading, loaded, or failed with the reason. */
  seed: { kind: 'loading' | 'ready' } | { kind: 'failed'; reason: string };
  /** Answer to the persistent-storage request, shown in Settings. */
  persistence: PersistState | 'unknown';
  /** Reason the last settings change could not be saved, else null. */
  saveError: string | null;
  /** Last route of each destination, so switching back restores its stack. */
  lastRoute: Partial<Record<DestId, string>>;
}

export function initialState(hash: string, prefs: Pick<AppState, 'theme' | 'units'>): AppState {
  return {
    route: parseHash(hash),
    ...prefs,
    update: 'none',
    storage: { kind: 'opening' },
    seed: { kind: 'loading' },
    persistence: 'unknown',
    saveError: null,
    lastRoute: {},
  };
}
