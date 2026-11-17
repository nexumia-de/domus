// Device preferences (theme, units). Interim home: localStorage, because
// the theme must be known before first paint; the local store of the app
// takes them over with the data issues. Every access is guarded: storage
// can be blocked, then the defaults apply and nothing is kept.

import { type AppState, type Theme, type Units } from './app-state';

const KEY = 'mixtura.prefs';
const THEMES: readonly Theme[] = ['system', 'light', 'dark'];
const UNITS: readonly Units[] = ['metric', 'us', 'imperial'];

export type Prefs = Pick<AppState, 'theme' | 'units'>;

export const defaultPrefs: Prefs = { theme: 'system', units: 'metric' };

export function parsePrefs(text: string | null): Prefs {
  try {
    const data: unknown = text ? JSON.parse(text) : null;
    const record = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return {
      theme: THEMES.find((t) => t === record['theme']) ?? defaultPrefs.theme,
      units: UNITS.find((u) => u === record['units']) ?? defaultPrefs.units,
    };
  } catch {
    return defaultPrefs;
  }
}

export function loadPrefs(): Prefs {
  try {
    return parsePrefs(localStorage.getItem(KEY));
  } catch {
    return defaultPrefs;
  }
}

export function savePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // Blocked or full: the choice applies for this session only.
  }
}

/** `data-theme` on <html>; "system" removes it so the media query decides. */
export function applyTheme(theme: Theme): void {
  if (theme === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', theme);
}
