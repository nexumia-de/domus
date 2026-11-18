import { renderScreen } from '../screens/screens';
import type { Route } from '../router';
import { strings } from '../strings';
import { el } from './el';
import { createNav } from './nav';

export interface Shell {
  /**
   * Shows a screen. With `focusHeading` the screen heading takes focus
   * (after navigation); on first load nothing is focused.
   */
  show(route: Route, param: string | undefined, focusHeading: boolean): void;
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

  return {
    show(route, param, focusHeading) {
      const screen = renderScreen(route, param);
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
