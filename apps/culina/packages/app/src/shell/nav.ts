import { icon } from '../icons/icons';
import { hashFor, NAV_ENTRIES, NAV_ROUTE, navEntryFor, type NavEntry, type Route } from '../router';
import { strings } from '../strings';
import { el } from './el';

export interface Nav {
  element: HTMLElement;
  /** The gear in the header: Settings, reachable from every screen. */
  settingsLink: HTMLAnchorElement;
  /**
   * Marks the active destination with aria-current="page" (the stock screens and the finder from one
   * ingredient mark Cook; components and every dish screen mark the Notebook) and the Settings links
   * on the settings screens.
   */
  setCurrent(route: Route): void;
}

const link = (className: string, name: NavEntry | 'settings') => {
  const a = el('a', className);
  a.href = hashFor(name === 'settings' ? 'settings' : NAV_ROUTE[name]);
  return a;
};

/**
 * One navigation landmark: three destinations (Cook, Notebook, Ratios; docs/decisions/cook-screen.md)
 * as the bottom bar on phones, as the side rail from 720 px
 * (CSS only), where Settings is the last entry of the rail. On a phone Settings is the gear in the
 * header (`settingsLink`); the rail entry is hidden there, and the gear is hidden on the rail.
 */
export const createNav = (): Nav => {
  const nav = el('nav', 'app-nav');
  nav.setAttribute('aria-label', strings.nav.label);
  const list = el('ul', 'nav-list');
  const links = new Map<string, HTMLAnchorElement>();
  for (const entry of NAV_ENTRIES) {
    const a = link('nav-link', entry);
    a.append(icon(entry), el('span', 'nav-label', strings.nav[entry]));
    const item = el('li');
    item.append(a);
    list.append(item);
    links.set(entry, a);
  }
  const rail = link('nav-link', 'settings');
  rail.append(icon('settings'), el('span', 'nav-label', strings.nav.settings));
  const railItem = el('li', 'nav-settings');
  railItem.append(rail);
  list.append(railItem);
  nav.append(list);

  const gear = el('a', 'settings-link');
  gear.href = hashFor('settings');
  // An icon-only control: its name is for assistive technology and for a tooltip.
  gear.setAttribute('aria-label', strings.nav.settings);
  gear.title = strings.nav.settings;
  gear.append(icon('settings'));

  return {
    element: nav,
    settingsLink: gear,
    setCurrent(current) {
      const entry = navEntryFor(current);
      for (const [name, a] of links) {
        if (name === entry) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
      }
      for (const a of [rail, gear]) {
        if (current === 'settings') a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
      }
    },
  };
};
