// Shows a toast: one line with an optional Undo, gone after eight seconds.
// Shared by every action that offers Undo (import, stock).

import { type AppState, type Toast } from './app-state';
import { type Store } from './state';

export const TOAST_MS = 8000;

let toastId = 0;
const timers = new WeakMap<Store<AppState>, ReturnType<typeof setTimeout>>();

export function showToast(app: Store<AppState>, text: string, undo?: () => void): void {
  clearTimeout(timers.get(app));
  const next: Toast = { id: ++toastId, text, ...(undo && { undo }) };
  app.set({ toast: next });
  timers.set(
    app,
    setTimeout(() => {
      if (app.get().toast?.id === next.id) app.set({ toast: null });
    }, TOAST_MS),
  );
}
