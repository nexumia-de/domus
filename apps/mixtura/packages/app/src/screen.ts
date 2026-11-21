// The contract between the shell and a screen. A screen is one folder in
// `screens/` that exports `Screen` objects and is listed once in
// `screens/index.ts`; the shell never changes when a screen is added.

import { type DestId } from './destinations';
import { type Route } from './router';
import { type AppState } from './app-state';
import { type Store } from './state';
import { type AppData } from './data';

export interface ScreenContext {
  route: Route;
  state: AppState;
  store: Store<AppState>;
  /** The catalog (seed plus own data) and the local store, once open. */
  data: AppData;
}

export interface ScreenView {
  title: string;
  /** Scrolling content of the detail pane. */
  body: Node;
  /** An action of the header, left of the sync icon (Share). */
  headerAction?: Node;
  /** Small, under the title (the editor's draft tag). */
  subtitle?: Node;
  /** Bottom action bar of a pushed screen; replaces the navigation on a phone. */
  actions?: Node;
  /**
   * Two panes (Drinks, Templates, Stock): the list pane is shown beside
   * the body from 840 px; on a phone `phone` says which one is visible.
   */
  list?: { title: string; body: Node; phone: 'list' | 'detail'; action?: HTMLElement };
}

export interface Screen {
  id: string;
  destination: DestId;
  /** Pushed screens show a back button and hide the navigation on a phone. */
  pushed: boolean;
  match(route: Route): boolean;
  view(context: ScreenContext): ScreenView;
  /** Called once when the route moves to another screen; forgets what the screen kept in memory. */
  leave?(): void;
}

/** The first screen that matches; null means "not found". */
export function resolve(route: Route, screens: readonly Screen[]): Screen | null {
  return screens.find((screen) => screen.match(route)) ?? null;
}
