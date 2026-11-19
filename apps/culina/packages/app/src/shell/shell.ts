import { renderScreen } from '../screens/screens';
import type { Action, Route } from '../router';
import { strings } from '../strings';
import { el } from './el';
import { backupBanner, refreshBackupBanner } from './backup-banner';
import { createNav } from './nav';
import { dismissToast, mountToast } from './toast';

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
  // The real height of the bottom bar (German labels take two lines): what sticks above it, and the
  // toast, sit on top of it, not behind it.
  const measureNav = (): void =>
    document.documentElement.style.setProperty(
      '--nav-real-h',
      `${nav.element.getBoundingClientRect().height}px`,
    );
  measureNav();
  if (typeof ResizeObserver === 'function') new ResizeObserver(measureNav).observe(nav.element);
  let shown: { route: Route; param: string | undefined; action: Action | undefined } | undefined;

  return {
    refresh() {
      // An editor owns its form: the notebook changing under it must not redraw it.
      if (shown === undefined || (shown.action !== undefined && shown.action !== 'with')) return;
      main.replaceChildren(backupBanner(), renderScreen(shown.route, shown.param, shown.action));
      void refreshBackupBanner();
    },
    show(route, param, focusHeading, action) {
      shown = { route, param, action };
      dismissToast();
      const screen = renderScreen(route, param, action);
      main.replaceChildren(backupBanner(), screen);
      void refreshBackupBanner();
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
