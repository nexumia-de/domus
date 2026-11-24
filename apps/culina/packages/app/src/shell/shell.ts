import { renderScreen } from '../screens/screens';
import type { Action, Route } from '../router';
import { strings } from '../strings';
import { el } from './el';
import { backupBanner, refreshBackupBanner } from './backup-banner';
import { createNav } from './nav';
import { bandOf, entryOf, restoreTarget, withEntry, type LinkSpot, type Place } from './place';
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

/** What the focus may be given on the way back. */
const FOCUSABLE = 'a[href], button:not([disabled]), summary';

const pageTop = (element: Element): number => element.getBoundingClientRect().top + window.scrollY;

/**
 * The link a click follows within the app: a hash route of this page, no new tab or window (no
 * `target`, no download, no modifier key, the main button). Undefined for every other click.
 */
const appLinkOf = (event: MouseEvent, main: HTMLElement): HTMLAnchorElement | undefined => {
  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
    return undefined;
  const target = event.target instanceof Element ? event.target : null;
  const link = target?.closest('a[href]');
  if (!(link instanceof HTMLAnchorElement) || !main.contains(link)) return undefined;
  if ((link.target !== '' && link.target !== '_self') || link.hasAttribute('download'))
    return undefined;
  return link.getAttribute('href')?.startsWith('#/') === true ? link : undefined;
};

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
  // The shell puts every screen where it belongs (shown, below): the browser restoring a scroll of
  // its own on a move through the history would scroll the screen being left, before hashchange,
  // and its place would be noted wrong.
  try {
    window.history.scrollRestoration = 'manual';
  } catch {
    // Not offered: the place is then noted after the browser's own scroll.
  }
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
      const link = appLinkOf(event, main);
      followed =
        link === undefined
          ? undefined
          : { href: link.getAttribute('href') ?? '', top: pageTop(link) };
    },
    { capture: true },
  );
  /**
   * A screen draws parts of itself again once the catalogue is read, just after it is shown (the
   * dish screen, Cook's list); the link given the focus on the way back may go with them, and the
   * focus to the page. For a second, or until the next key or tap, the link of the same address
   * that is drawn in its place takes the focus back.
   */
  let stopKeeping: (() => void) | undefined;
  const keepFocus = (first: HTMLElement): void => {
    stopKeeping?.();
    if (typeof MutationObserver !== 'function') return;
    let link = first;
    const href = link.getAttribute('href');
    const top = pageTop(link);
    const observer = new MutationObserver(() => {
      const active = document.activeElement;
      if (active === link) return;
      // The focus went elsewhere by the user or a script: leave it there.
      if (active !== null && active !== document.body) return stop();
      // Moved or drawn anew: the same element, or the link of the same address nearest its place.
      const again = link.isConnected
        ? link
        : [...main.querySelectorAll('a[href]')]
            .filter((a) => a.getAttribute('href') === href && a.getClientRects().length > 0)
            .sort((a, b) => Math.abs(pageTop(a) - top) - Math.abs(pageTop(b) - top))[0];
      if (!(again instanceof HTMLElement)) return;
      link = again;
      again.focus({ preventScroll: true });
    });
    const timer = window.setTimeout(() => stop(), 1000);
    const stop = (): void => {
      observer.disconnect();
      window.clearTimeout(timer);
      document.removeEventListener('keydown', stop, true);
      document.removeEventListener('pointerdown', stop, true);
      stopKeeping = undefined;
    };
    observer.observe(main, { childList: true, subtree: true });
    document.addEventListener('keydown', stop, true);
    document.addEventListener('pointerdown', stop, true);
    stopKeeping = stop;
  };

  /** Shows the screen where it was left: its scroll, and the focus (place.ts, restoreTarget). */
  const restore = (place: Place, heading: HTMLElement | null): void => {
    // Links, and buttons and summaries for a screen with no link in view; never a form field,
    // which would open the keyboard of a phone.
    const links = [...main.querySelectorAll(FOCUSABLE)].filter(
      (a) => a.getClientRects().length > 0,
    );
    const spots: LinkSpot[] = links.map((a) => ({
      href: a.getAttribute('href') ?? '',
      top: pageTop(a),
      height: a.getBoundingClientRect().height,
    }));
    const band = bandOf(
      main.getBoundingClientRect(),
      header.getBoundingClientRect(),
      nav.element.getBoundingClientRect(),
      window.innerHeight,
    );
    const head =
      heading === null
        ? undefined
        : { top: pageTop(heading), height: heading.getBoundingClientRect().height };
    const maxY = document.documentElement.scrollHeight - window.innerHeight;
    const { y, focus } = restoreTarget(place, spots, head, band, maxY);
    window.scrollTo(0, y);
    const link = focus === 'heading' ? undefined : links[focus];
    if (link instanceof HTMLElement) {
      link.focus({ preventScroll: true });
      keepFocus(link);
    } else if (heading) {
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
      // The link noted is the one left by only when this navigation goes to its address (not a
      // button pressed after it, nor the browser's back or forward); else the one noted earlier is
      // kept, to be focused if it is still in view on the way back.
      if (entry !== undefined) {
        const left = followed !== undefined && followed.href === window.location.hash;
        const link = left ? followed : places.get(entry)?.link;
        places.delete(entry);
        places.set(entry, {
          y: window.scrollY,
          followed: left,
          ...(link === undefined ? {} : { link }),
        });
        if (places.size > 200) places.delete(places.keys().next().value ?? '');
      }
      followed = undefined;
      stopKeeping?.();
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
