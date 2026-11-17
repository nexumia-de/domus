// The single state object of the app. Only what the shell needs; screens
// derive everything else. The route is the URL; preferences are stored by
// prefs.ts.

import { type DestId } from './destinations';
import { parseHash, type Route } from './router';

export type Theme = 'system' | 'light' | 'dark';
export type Units = 'metric' | 'us' | 'imperial';

export interface AppState {
  route: Route;
  theme: Theme;
  units: Units;
  /** A new service worker is waiting; the banner offers the update. */
  update: 'none' | 'available';
  /** Last route of each destination, so switching back restores its stack. */
  lastRoute: Partial<Record<DestId, string>>;
}

export function initialState(hash: string, prefs: Pick<AppState, 'theme' | 'units'>): AppState {
  return { route: parseHash(hash), ...prefs, update: 'none', lastRoute: {} };
}
