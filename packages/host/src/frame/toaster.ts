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

  const clear = (): void => {
    clearTimer(timer);
    node.replaceChildren();
  };
  const arm = (): void => {
    clearTimer(timer);
    timer = setTimer(clear, ms);
  };
  // WCAG 2.2.1: the toast stays while focus is in it (a keyboard user is on Undo) and the time
  // starts again when focus leaves. The pointer does not hold it: a toast that appears under a
  // resting pointer would then cover the button below it for good (found by Mixtura's stock check).
  node.addEventListener('focusin', () => clearTimer(timer));
  node.addEventListener('focusout', () => {
    if (node.firstChild) arm();
  });

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
