/** Hash router: #/ratios, #/components, #/dishes, #/settings. The back stack is the browser history. */
export const ROUTES = ['ratios', 'components', 'dishes', 'settings'] as const;
export type Route = (typeof ROUTES)[number];
export const DEFAULT_ROUTE: Route = 'ratios';

export const hashFor = (route: Route): string => `#/${route}`;

/** The first path segment of the hash; an unknown or empty hash is the default route. */
export const routeFromHash = (hash: string): Route => {
  const segment = hash.replace(/^#\/?/, '').split(/[/?]/)[0];
  return ROUTES.find((route) => route === segment) ?? DEFAULT_ROUTE;
};

export interface RouterHost {
  location: { hash: string };
  history: { replaceState(data: null, unused: string, url: string): void };
  addEventListener(type: 'hashchange', listener: () => void): void;
}

export interface Navigation {
  route: Route;
  /** True for the route the page was opened on. */
  initial: boolean;
}

/** Calls `onRoute` now and on every hash change; rewrites an unknown hash to the real route. */
export const startRouter = (host: RouterHost, onRoute: (navigation: Navigation) => void): void => {
  const go = (initial: boolean): void => {
    const route = routeFromHash(host.location.hash);
    if (host.location.hash !== hashFor(route)) host.history.replaceState(null, '', hashFor(route));
    onRoute({ route, initial });
  };
  host.addEventListener('hashchange', () => go(false));
  go(true);
};
