import { renderScreen } from '../screens/screens';
import type { Action, Route } from '../router';
import { strings } from '../strings';
import { el } from './el';
import { createNav } from './nav';
import { mountToast } from './toast';

export interface Shell {
  /**
   * Shows a screen. With `focusHeading` the screen heading takes focus
   * (after navigation); on first load nothing is focused.
   */
  show(route: Route, param: string | undefined, focusHeading: boolean, action?: Action): void;
  /** Draws the current screen again (the notebook changed); keeps scroll and focus where they are. */
  refresh(): void;
}

/** Landmarks: header (banner), nav, main. The screen replaces the content of main. */
export const mountShell = (root: HTMLElement): Shell => {
  const skip = el('a', 'skip-link', strings.skipToContent);
  skip.href = '#main';
  skip.addEventListener('click', (event) => {
    // The hash is the route, so move focus instead of navigating.
    event.preventDefault();
    main.focus();
  });
  const header = el('header', 'app-header');
  header.append(el('p', 'app-title', strings.appName));
  const nav = createNav();
  const main = el('main', 'app-main');
  main.id = 'main';
  main.tabIndex = -1;
  const frame = el('div', 'app');
  frame.append(header, nav.element, main);
  root.append(skip, frame);
  mountToast(root);
  let shown: { route: Route; param: string | undefined; action: Action | undefined } | undefined;

  return {
    refresh() {
      // An editor owns its form: the notebook changing under it must not redraw it.
      if (shown === undefined || shown.action !== undefined) return;
      main.replaceChildren(renderScreen(shown.route, shown.param));
    },
    show(route, param, focusHeading, action) {
      shown = { route, param, action };
      const screen = renderScreen(route, param, action);
      main.replaceChildren(screen);
      nav.setCurrent(route);
      const heading = screen.querySelector('h1');
      document.title = `${heading?.textContent ?? ''} - ${strings.appName}`;
      if (heading) {
        heading.tabIndex = -1;
        if (focusHeading) heading.focus();
      }
      window.scrollTo(0, 0);
    },
  };
};
