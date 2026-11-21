// A short message above the add field or the bottom of the content, in the colours of the theme,
// that goes by itself and may offer one action (Undo). One toast at a time: a new one replaces
// the old one. The timers are options so that a test does not wait.
import { el } from './dom';

export interface ToastAction {
  label: string;
  run: () => void;
}

export interface ToasterOptions {
  /** How long a plain toast stays, and one with an action (a hand needs longer to reach it). */
  plainMs?: number;
  actionMs?: number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

export interface Toaster {
  /** The live region; put it at the lower edge of the content, above what is docked. */
  node: HTMLElement;
  say(text: string, action?: ToastAction): void;
  clear(): void;
}

export function createToaster(options: ToasterOptions = {}): Toaster {
  const plainMs = options.plainMs ?? 5000;
  const actionMs = options.actionMs ?? 8000;
  const setTimer = options.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clearTimer = options.clearTimer ?? ((handle) => clearTimeout(handle as number));
  const node = el('div', { class: 'fr-toast', role: 'status', 'aria-live': 'polite' });
  let timer: unknown;
  let ms = plainMs;
  // WCAG 2.2.1: the toast stays while a pointer is on it or focus is in it, and the time starts
  // again when both are gone (a hand needs time to reach Undo).
  const arm = (): void => {
    clearTimer(timer);
    timer = setTimer(clear, ms);
  };
  const hold = (): void => clearTimer(timer);
  node.addEventListener('pointerenter', hold);
  node.addEventListener('focusin', hold);
  node.addEventListener('pointerleave', () => {
    if (!node.contains(document.activeElement) && node.firstChild) arm();
  });
  node.addEventListener('focusout', () => {
    if (!node.matches(':hover') && node.firstChild) arm();
  });

  const clear = (): void => {
    clearTimer(timer);
    node.replaceChildren();
  };

  return {
    node,
    clear,
    say(text, action) {
      clearTimer(timer);
      node.replaceChildren(el('span', { class: 'fr-toast-text' }, text));
      if (action) {
        const button = el('button', { type: 'button', class: 'fr-toast-action' }, action.label);
        button.addEventListener('click', () => {
          clear();
          action.run();
        });
        node.append(button);
      }
      ms = action ? actionMs : plainMs;
      arm();
    },
  };
}
