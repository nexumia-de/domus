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
  /** A small element at the right of the detail pane's header (the editor's draft tag). */
  headerAction?: Node;
  /** Bottom action bar of a pushed screen; replaces the navigation on a phone. */
  actions?: Node;
  /**
   * Two panes (Drinks, Templates, Stock): the list pane is shown beside
   * the body from 840 px; on a phone `phone` says which one is visible.
   */
  list?: { title: string; body: Node; phone: 'list' | 'detail'; action?: Node };
}

export interface Screen {
  id: string;
  destination: DestId;
  /** Pushed screens show a back button and hide the navigation on a phone. */
  pushed: boolean;
  match(route: Route): boolean;
  view(context: ScreenContext): ScreenView;
}

/** The first screen that matches; null means "not found". */
export function resolve(route: Route, screens: readonly Screen[]): Screen | null {
  return screens.find((screen) => screen.match(route)) ?? null;
}
