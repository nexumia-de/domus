import { icon } from '../icons/icons';
import { hashFor, ROUTES, type Route } from '../router';
import { strings } from '../strings';
import { el } from './el';

export interface Nav {
  element: HTMLElement;
  /** Marks the active destination with aria-current="page". */
  setCurrent(route: Route): void;
}

/** One navigation landmark: bottom bar on phones, side navigation from 720 px (CSS only). */
export const createNav = (): Nav => {
  const nav = el('nav', 'app-nav');
  nav.setAttribute('aria-label', strings.nav.label);
  const list = el('ul', 'nav-list');
  const links = new Map<Route, HTMLAnchorElement>();
  for (const route of ROUTES) {
    const link = el('a', 'nav-link');
    link.href = hashFor(route);
    link.append(icon(route), el('span', 'nav-label', strings.nav[route]));
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
        if (route === current) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      }
    },
  };
};
