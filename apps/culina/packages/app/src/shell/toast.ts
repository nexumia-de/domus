// One quiet message at a time, with an optional action (Undo). It lives in the shell and goes away
// by itself after ten seconds, so that Undo stays long enough to use, and when the user goes to
// another screen. While it shows, the page has room under its last row (`--toast-space`), so the
// toast never covers it.
import { el } from './el';

export interface ToastAction {
  label: string;
  run(): void;
}

const SHOW_MS = 10000;
/** A screen change this soon after a toast belongs to the action that showed it (Save, then the detail screen). */
const SAME_ACTION_MS = 500;
let host: HTMLElement | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;
let shownAt = 0;

const clearAll = (): void => {
  if (timer !== undefined) clearTimeout(timer);
  timer = undefined;
  host?.replaceChildren();
  document.documentElement.style.removeProperty('--toast-space');
};

/** The user went to another screen: the toast and its Undo are over. */
export const dismissToast = (): void => {
  if (host === undefined || host.childElementCount === 0) return;
  if (Date.now() - shownAt < SAME_ACTION_MS) return;
  clearAll();
};

export const mountToast = (root: HTMLElement): void => {
  host = el('div', 'toast-host');
  host.setAttribute('role', 'status');
  root.append(host);
};

export const showToast = (message: string, action?: ToastAction): void => {
  if (host === undefined) return;
  if (timer !== undefined) clearTimeout(timer);
  const box = el('div', 'toast');
  box.append(el('span', 'toast-text', message));
  const clear = clearAll;
  if (action) {
    const button = el('button', 'btn toast-action', action.label);
    button.type = 'button';
    button.addEventListener('click', () => {
      clear();
      action.run();
    });
    box.append(button);
  }
  host.replaceChildren(box);
  shownAt = Date.now();
  // Room under the last row of the page for as long as the toast shows.
  document.documentElement.style.setProperty(
    '--toast-space',
    `calc(${box.getBoundingClientRect().height}px + var(--sp-3))`,
  );
  timer = setTimeout(clear, SHOW_MS);
};
