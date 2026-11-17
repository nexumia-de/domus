// Browser history glue. In-app links push one history entry each; the
// entry carries its index so Back knows whether there is an earlier app
// screen to return to. The browser back button and the system back
// gesture go one entry back by themselves.

import { type AppState } from './app-state';
import { destinationOf } from './destinations';
import { closedSheet, DEFAULT_HASH, droppedSwap, normaliseHash, parseHash } from './router';
import { type Store } from './state';
import { swapStrings } from './screens/spec/swap-strings';
import { showToast } from './toasts';

interface Entry {
  i: number;
}

function index(): number {
  const state = history.state as Entry | null;
  return typeof state?.i === 'number' ? state.i : 0;
}

function show(store: Store<AppState>, hash: string): void {
  const route = parseHash(hash);
  const dest = destinationOf(route);
  store.set({
    route,
    lastRoute: dest ? { ...store.get().lastRoute, [dest]: route.hash } : store.get().lastRoute,
  });
}

/** Opens `hash` as a new history entry. */
export function go(store: Store<AppState>, hash: string): void {
  const target = normaliseHash(hash);
  if (target === store.get().route.hash) return;
  history.pushState({ i: index() + 1 } satisfies Entry, '', target);
  show(store, target);
}

/** Changes the current entry's address without adding one (search, filters). */
export function replace(store: Store<AppState>, hash: string): void {
  const target = normaliseHash(hash);
  if (target === store.get().route.hash) return;
  history.replaceState({ i: index() } satisfies Entry, '', target);
  show(store, target);
}

/** Back one entry, or to `fallback` when the app was opened on this screen. */
export function back(store: Store<AppState>, fallback: string): void {
  if (index() > 0) history.back();
  else {
    history.replaceState({ i: 0 } satisfies Entry, '', fallback);
    show(store, fallback);
  }
}

/** Starts listening; call once after the first render is possible. */
export function startNavigation(store: Store<AppState>): void {
  const start = normaliseHash(location.hash);
  history.replaceState({ i: index() } satisfies Entry, '', start);
  show(store, start);

  window.addEventListener('popstate', () => {
    const next = parseHash(normaliseHash(location.hash));
    const previous = store.get().route;
    const kept = closedSheet(previous, next);
    if (kept) history.replaceState({ i: index() } satisfies Entry, '', kept.hash);
    show(store, (kept ?? next).hash);
    // Back out of a swap that changed something drops it (never saved); Undo brings it back.
    const dropped = kept ? null : droppedSwap(previous, next);
    if (dropped) showToast(store, swapStrings.toastDropped, () => go(store, dropped.hash));
  });
  window.addEventListener('hashchange', () => {
    // A hash typed into the address bar: keep the app's own entries consistent.
    const hash = normaliseHash(location.hash);
    if (hash !== store.get().route.hash) {
      history.replaceState({ i: index() + 1 } satisfies Entry, '', hash);
      show(store, hash);
    }
  });
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as Element | null)?.closest('a[href^="#/"]');
    if (!link) return;
    event.preventDefault();
    go(store, link.getAttribute('href') ?? DEFAULT_HASH);
  });
}
