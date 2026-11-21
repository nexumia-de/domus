// Draws the whole app from the state: banner, navigation, the panes of
// the screen the route resolves to. Called after every state change.

import { type AppState } from '../app-state';
import { type AppData } from '../data';
import { destinationOf, rootOf } from '../destinations';
import { h } from '../dom';
import { back } from '../navigation';
import { resolve, type Screen, type ScreenContext } from '../screen';
import { shownStatus } from '../stock/shown-status';
import { type Store } from '../state';
import { notFound } from './not-found';
import { statusBanner, updateBanner } from './banner';
import { nav } from './nav';
import { trapFocus } from './focus-trap';
import { inertBehindModal } from './modal';
import { type Frame } from './frame';
import { panes } from './panes';
import { trackLeave } from './leave';
import { captureScroll, restoreScroll } from './scroll';

export interface Shell {
  screens: readonly Screen[];
  store: Store<AppState>;
  data: AppData;
  frame: Frame;
  applyUpdate: () => void;
  /** Opens the local store and loads the seed again. */
  retryData: () => void;
}

export function render(root: HTMLElement, shell: Shell): void {
  const { store } = shell;
  const state = store.get();
  const screen = resolve(state.route, shell.screens);
  trackLeave(screen);
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
  // The toast's Undo is one node that lives through redraws; the redraw moves it, so it is given back.
  const toastFocused = active?.classList.contains('fr-toast-action') === true;
  // A sheet holding the focus itself (it takes it when it opens) keeps it through a redraw.
  const sheetFocused = active?.getAttribute('data-sheet');
  const caret =
    active instanceof HTMLInputElement
      ? { start: active.selectionStart, end: active.selectionEnd }
      : null;
  active?.dispatchEvent(new Event('search-cancel'));
  const scroll = captureScroll(root);
  shell.frame.show({
    view,
    route: state.route,
    pushed,
    onBack,
    status: shownStatus(context),
  });
  const app = h(
    'div',
    { class: 'app-root' },
    ...shell.frame.top,
    updateBanner(state, shell.applyUpdate),
    statusBanner(state, shell.retryData),
    h(
      'div',
      { class: `app${pushed ? ' app--pushed' : ''}` },
      nav(state),
      panes(view),
      shell.frame.toast,
    ),
  );
  root.replaceChildren(app);
  inertBehindModal(app);
  trapFocus(app);
  document.title = `${view.title} - Drink Builder`;
  restoreScroll(root, state.route, scroll, view.list !== undefined);
  if (toastFocused) {
    shell.frame.toast.querySelector<HTMLElement>('.fr-toast-action')?.focus({ preventScroll: true });
  }
  const again = focused ? root.querySelector<HTMLElement>(`[data-focus="${focused}"]`) : null;
  again?.focus({ preventScroll: true });
  if (!focused && sheetFocused !== null && sheetFocused !== undefined) {
    root
      .querySelector<HTMLElement>(`[data-sheet="${sheetFocused}"]`)
      ?.focus({ preventScroll: true });
  }
  // Text typed but not yet in the address (the search is debounced) survives a redraw that
  // brings back the value this field last handed over, such as a finished write.
  if (
    again instanceof HTMLInputElement &&
    active instanceof HTMLInputElement &&
    (active.dataset['sent'] ?? active.defaultValue) === again.value &&
    active.value !== again.value
  ) {
    again.value = active.value;
    again.dispatchEvent(new Event('input'));
  }
  if (again instanceof HTMLInputElement && caret?.start != null && caret.end != null) {
    again.setSelectionRange(caret.start, caret.end);
  }
}
