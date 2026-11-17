// Keyboard on the drinks list: `/` and `n` (single keys, off while typing and
// switchable in Settings), and the arrow keys among the rows. The rows are
// links with one tab stop (roving tabindex): Tab enters the list at the open
// drink or the first row, the arrow keys move, Enter opens. Installed once;
// the handlers read the page as it is when the key is pressed.

import type { AppState } from '../../app-state';
import { go } from '../../navigation';
import type { Store } from '../../state';
import { rowStep, shortcutFor } from './keys';

let installed = false;

const rows = (): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>('.pane.list .list-rows a.row'));

/** The list pane is on screen (on a phone it is hidden while a drink is open). */
const listShown = (): boolean => {
  const pane = document.querySelector<HTMLElement>('.pane.list');
  return pane !== null && pane.getClientRects().length > 0;
};

/** Makes `row` the list's one tab stop. */
function rove(row: HTMLElement): void {
  for (const other of rows()) other.tabIndex = other === row ? 0 : -1;
}

function arrow(event: KeyboardEvent): void {
  const target = event.target as HTMLElement | null;
  if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
  const all = rows();
  const row = target?.closest<HTMLElement>('a.row');
  const inField = target?.matches('[data-focus="search"]') === true;
  const at = row ? all.indexOf(row) : inField ? -1 : -2;
  if (at === -2 || (row && at < 0)) return;
  const more = document.querySelector<HTMLElement>('.pane.list .more-button');
  const step = rowStep(event.key, at, all.length, more !== null);
  if (!step) return;
  event.preventDefault();
  if (step.to === 'search') {
    document.querySelector<HTMLElement>('[data-focus="search"]')?.focus();
  } else if (step.to === 'more') {
    more?.focus();
  } else {
    const next = all[step.index];
    if (next) {
      rove(next);
      next.focus();
    }
  }
}

export function installDrinksKeys(store: Store<AppState>): void {
  if (installed) return;
  installed = true;
  document.addEventListener('keydown', (event) => {
    if (!listShown()) return;
    const target = event.target as HTMLElement | null;
    const shortcut = shortcutFor({
      key: event.key,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      altKey: event.altKey,
      defaultPrevented: event.defaultPrevented,
      typing: target?.closest('input, textarea, select, [contenteditable]') != null,
      modal: document.querySelector('[aria-modal="true"]') !== null,
      enabled: store.get().shortcuts === 'yes',
    });
    if (shortcut === 'search') {
      event.preventDefault();
      document.querySelector<HTMLElement>('[data-focus="search"]')?.focus();
    } else if (shortcut === 'new') {
      event.preventDefault();
      go(store, '#/drinks/new');
    } else if (!event.defaultPrevented && document.querySelector('[aria-modal="true"]') === null) {
      arrow(event);
    }
  });
  // Focus that arrives by pointer or by a script moves the tab stop with it.
  document.addEventListener('focusin', (event) => {
    const row = (event.target as HTMLElement | null)?.closest<HTMLElement>(
      '.pane.list .list-rows a.row',
    );
    if (row) rove(row);
  });
}
