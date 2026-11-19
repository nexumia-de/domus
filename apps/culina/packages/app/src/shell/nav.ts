import { icon } from '../icons/icons';
import { hashFor, NAV_ENTRIES, navEntryFor, type NavEntry, type Route } from '../router';
import { strings } from '../strings';
import { el } from './el';

export interface Nav {
  element: HTMLElement;
  /** Marks the active destination with aria-current="page"; the stock screens mark Cook. */
  setCurrent(route: Route): void;
}

/** One navigation landmark: bottom bar on phones, side navigation from 720 px (CSS only). */
export const createNav = (): Nav => {
  const nav = el('nav', 'app-nav');
  nav.setAttribute('aria-label', strings.nav.label);
  const list = el('ul', 'nav-list');
  const links = new Map<NavEntry, HTMLAnchorElement>();
  for (const route of NAV_ENTRIES) {
    const link = el('a', 'nav-link');
    link.href = hashFor(route);
    // The drawn label may carry soft hyphens so that it can wrap on a phone; the accessible name stays
    // the plain word, whatever a screen reader does with U+00AD.
    link.setAttribute('aria-label', strings.nav[route]);
    link.append(icon(route), el('span', 'nav-label', strings.navWrap[route]));
    const item = el('li');
    item.append(link);
    list.append(item);
    links.set(route, link);
  }
  nav.append(list);
  return {
    element: nav,
    setCurrent(current) {
      for (const [route, link] of links) {
        if (route === navEntryFor(current)) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      }
    },
  };
};
