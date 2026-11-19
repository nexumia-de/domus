// A toast with Undo from any screen: a status line above the navigation that
// goes by itself after a few seconds (docs/behaviour.md, "Undo, not confirm").

import { type AppState, type Toast } from './app-state';
import { type Store } from './state';

export const TOAST_MS = 8000;

let id = 1_000_000;
let timer: ReturnType<typeof setTimeout> | undefined;

export function showToast(store: Store<AppState>, text: string, undo?: () => void): void {
  clearTimeout(timer);
  const next: Toast = { id: ++id, text, ...(undo && { undo }) };
  store.set({ toast: next });
  timer = setTimeout(() => {
    if (store.get().toast?.id === next.id) store.set({ toast: null });
  }, TOAST_MS);
}
