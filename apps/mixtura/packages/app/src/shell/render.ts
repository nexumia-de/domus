// Draws the whole app from the state: banner, navigation, the panes of
// the screen the route resolves to. Called after every state change.

import { type AppState } from '../app-state';
import { type AppData } from '../data';
import { destinationOf, rootOf } from '../destinations';
import { h } from '../dom';
import { back } from '../navigation';
import { resolve, type Screen, type ScreenContext } from '../screen';
import { type Store } from '../state';
import { notFound } from './not-found';
import { statusBanner, updateBanner } from './banner';
import { nav } from './nav';
import { toast } from './toast';
import { panes } from './panes';
import { captureScroll, restoreScroll } from './scroll';

export interface Shell {
  screens: readonly Screen[];
  store: Store<AppState>;
  data: AppData;
  applyUpdate: () => void;
  /** Opens the local store and loads the seed again. */
  retryData: () => void;
}

export function render(root: HTMLElement, shell: Shell): void {
  const { store } = shell;
  const state = store.get();
  const screen = resolve(state.route, shell.screens);
  const context: ScreenContext = {
    route: state.route,
    state,
    store,
    data: shell.data,
  };
  const view = screen ? screen.view(context) : notFound();
  const pushed = screen?.pushed ?? false;
  const dest = destinationOf(state.route);
  const onBack = (): void => back(store, rootOf(dest ?? 'drinks'));

  const active = document.activeElement;
  const focused = active?.getAttribute('data-focus');
  const caret =
    active instanceof HTMLInputElement
      ? { start: active.selectionStart, end: active.selectionEnd }
      : null;
  const scroll = captureScroll(root);
  const app = h(
    'div',
    { class: 'app-root' },
    updateBanner(state, shell.applyUpdate),
    statusBanner(state, shell.retryData),
    h(
      'div',
      { class: `app${pushed ? ' app--pushed' : ''}` },
      nav(state),
      panes(view, pushed, onBack),
    ),
    toast(state, () => store.set({ toast: null })),
  );
  root.replaceChildren(app);
  document.title = `${view.title} - Drink Builder`;
  restoreScroll(root, state.route, scroll, view.list !== undefined);
  const again = focused ? root.querySelector<HTMLElement>(`[data-focus="${focused}"]`) : null;
  again?.focus({ preventScroll: true });
  if (again instanceof HTMLInputElement && caret?.start != null && caret.end != null) {
    again.setSelectionRange(caret.start, caret.end);
  }
}
