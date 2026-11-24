import { renderScreen } from '../screens/screens';
import type { Action, Route } from '../router';
import { strings } from '../strings';
import { el } from './el';
import { backupBanner, refreshBackupBanner } from './backup-banner';
import { createNav } from './nav';
import { linkToFocus, scrollFor, entryOf, withEntry, type LinkSpot, type Place } from './place';
import { dismissToast, mountToast } from './toast';

export interface Shell {
  /**
   * Shows a screen. With `focusHeading` the screen heading takes focus
   * (after navigation); on first load nothing is focused. A screen reached again through the
   * history stands where it was left instead, the focus on the link it was left by (place.ts).
   */
  show(route: Route, param: string | undefined, focusHeading: boolean, action?: Action): void;
  /** Draws the current screen again (the notebook changed); keeps scroll and focus where they are. */
  refresh(): void;
}

/**
 * How the person last reached for the page: a key, or a pointer (mouse, touch, pen). The heading
 * takes focus by script after every change of screen, for screen readers; `:focus-visible` cannot
 * tell for a focus by script whether a key or a tap led to it, so the ring is drawn by this.
 */
let lastInput: 'key' | 'pointer' = 'key';
const trackInput = (): void => {
  document.addEventListener('keydown', () => (lastInput = 'key'), { capture: true });
  document.addEventListener('pointerdown', () => (lastInput = 'pointer'), { capture: true });
};

/** The places of the history entries shown on this page, by the id in their state (place.ts). */
const places = new Map<string, Place>();
let entries = 0;
const newEntryId = (): string =>
  `${Date.now().toString(36)}-${(entries++).toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const readState = (): unknown => {
  try {
    return window.history.state;
  } catch {
    return null;
  }
};

/** Marks the current history entry with an id, keeping what its state holds; gives the id. */
const markEntry = (): string | undefined => {
  try {
    const state: unknown = window.history.state;
    const known = entryOf(state);
    if (known !== undefined) return known;
    const id = newEntryId();
    window.history.replaceState(withEntry(state, id), '');
    return id;
  } catch {
    return undefined;
  }
};

const pageTop = (element: Element): number => element.getBoundingClientRect().top + window.scrollY;

/** Landmarks: header (banner), nav, main. The screen replaces the content of main. */
export const mountShell = (root: HTMLElement): Shell => {
  trackInput();
  const skip = el('a', 'skip-link', strings.skipToContent);
  skip.href = '#main';
  skip.addEventListener('click', (event) => {
    // The hash is the route, so move focus instead of navigating.
    event.preventDefault();
    main.focus();
  });
  const header = el('header', 'app-header');
  const nav = createNav();
  header.append(el('p', 'app-title', strings.appName), nav.settingsLink);
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
  /** The history entry shown, and the link of main followed last on it. */
  let entry: string | undefined;
  let followed: Place['link'];
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const link = target?.closest('a[href]');
      followed =
        link && main.contains(link)
          ? { href: link.getAttribute('href') ?? '', top: pageTop(link) }
          : undefined;
    },
    { capture: true },
  );
  /** The part of the window between the sticky header and the bottom bar (none from 720 px). */
  const band = (): { top: number; bottom: number } => {
    const bar = nav.element.getBoundingClientRect();
    return {
      top: header.getBoundingClientRect().bottom,
      bottom: bar.top > window.innerHeight / 2 ? bar.top : window.innerHeight,
    };
  };
  /** Shows the screen where it was left: its scroll, the focus on the link it was left by. */
  const restore = (place: Place, heading: HTMLElement | null): void => {
    const links = [...main.querySelectorAll('a[href]')].filter(
      (a) => a.getClientRects().length > 0,
    );
    const spots: LinkSpot[] = links.map((a) => ({
      href: a.getAttribute('href') ?? '',
      top: pageTop(a),
    }));
    const index = linkToFocus(place, spots);
    const link = index === undefined ? undefined : links[index];
    const target =
      link === undefined
        ? undefined
        : { top: pageTop(link), height: link.getBoundingClientRect().height };
    window.scrollTo(0, scrollFor(place.y, target, band()));
    if (link instanceof HTMLElement) link.focus({ preventScroll: true });
    else if (heading) {
      heading.classList.toggle('focus-quiet', lastInput === 'pointer');
      heading.focus({ preventScroll: true });
    }
  };

  return {
    refresh() {
      // An editor owns its form: the notebook changing under it must not redraw it.
      if (shown === undefined || (shown.action !== undefined && shown.action !== 'with')) return;
      main.replaceChildren(backupBanner(), renderScreen(shown.route, shown.param, shown.action));
      void refreshBackupBanner();
    },
    show(route, param, focusHeading, action) {
      // The place of the screen left, for the way back to it; the history has moved on already.
      if (entry !== undefined) {
        places.set(entry, {
          y: window.scrollY,
          ...(followed === undefined ? {} : { link: followed }),
        });
        if (places.size > 200) places.delete(places.keys().next().value ?? '');
      }
      followed = undefined;
      // An entry with an id was shown before: the user came back to it (a new entry has no state).
      // The first screen of a page starts at the top, a reload too.
      const known = entryOf(readState());
      const place = focusHeading && known !== undefined ? places.get(known) : undefined;
      shown = { route, param, action };
      dismissToast();
      const screen = renderScreen(route, param, action);
      main.replaceChildren(backupBanner(), screen);
      void refreshBackupBanner();
      nav.setCurrent(route);
      // After the screen is drawn: a dish screen marks its entry first (list-return.ts).
      entry = markEntry();
      const heading = screen.querySelector('h1');
      document.title = `${heading?.textContent ?? ''} - ${strings.appName}`;
      if (heading) heading.tabIndex = -1;
      if (place !== undefined) {
        restore(place, heading);
        return;
      }
      if (heading && focusHeading) {
        // After a tap or a click the focus is there for a screen reader, without a ring.
        heading.classList.toggle('focus-quiet', lastInput === 'pointer');
        heading.focus();
      }
      window.scrollTo(0, 0);
    },
  };
};
