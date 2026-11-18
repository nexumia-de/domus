// One quiet message at a time, with an optional action (Undo). It lives in the shell, so it
// stays while the screen under it changes.
import { el } from './el';

export interface ToastAction {
  label: string;
  run(): void;
}

const SHOW_MS = 10000;
let host: HTMLElement | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;

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
  const clear = (): void => host?.replaceChildren();
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
  timer = setTimeout(clear, SHOW_MS);
};
