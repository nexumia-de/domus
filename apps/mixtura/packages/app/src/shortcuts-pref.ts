// The keyboard shortcuts setting (WCAG 2.1.4 Character Key Shortcuts: single
// keys can be turned off). A device setting that only matters in this
// browser, so it lives in localStorage and not in the data store; every
// access is guarded, blocked storage leaves the shortcuts on for the session.

import type { YesNo } from './store';

const KEY = 'mixtura.shortcuts';

export function loadShortcuts(): YesNo {
  try {
    return localStorage.getItem(KEY) === 'no' ? 'no' : 'yes';
  } catch {
    return 'yes';
  }
}

export function saveShortcuts(value: YesNo): void {
  try {
    localStorage.setItem(KEY, value);
  } catch {
    // Blocked or full: the choice applies for this session only.
  }
}
