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
import { panes } from './panes';

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

  const focused = document.activeElement?.getAttribute('data-focus');
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
  );
  root.replaceChildren(app);
  document.title = `${view.title} - Drink Builder`;
  if (focused) root.querySelector<HTMLElement>(`[data-focus="${focused}"]`)?.focus();
}
