/**
 * Hash router: #/ratios, #/ratios/<templateId>, #/components, #/dishes, #/settings.
 * The back stack is the browser history.
 */
export const ROUTES = ['ratios', 'components', 'dishes', 'settings'] as const;
export type Route = (typeof ROUTES)[number];
export const DEFAULT_ROUTE: Route = 'ratios';

/** Routes whose hash may carry one more segment (a template id). */
const WITH_PARAM: readonly Route[] = ['ratios'];

export const hashFor = (route: Route, param?: string): string =>
  param ? `#/${route}/${encodeURIComponent(param)}` : `#/${route}`;

const segments = (hash: string): string[] =>
  hash.replace(/^#\/?/, '').split('?')[0]?.split('/') ?? [];

/** The first path segment of the hash; an unknown or empty hash is the default route. */
export const routeFromHash = (hash: string): Route => {
  const segment = segments(hash)[0];
  return ROUTES.find((route) => route === segment) ?? DEFAULT_ROUTE;
};

/** The second path segment, decoded, for routes that take one; otherwise undefined. */
export const paramFromHash = (hash: string): string | undefined => {
  if (!WITH_PARAM.includes(routeFromHash(hash))) return undefined;
  const raw = segments(hash)[1];
  if (!raw) return undefined;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
};

export interface RouterHost {
  location: { hash: string };
  history: { replaceState(data: null, unused: string, url: string): void };
  addEventListener(type: 'hashchange', listener: () => void): void;
}

export interface Navigation {
  route: Route;
  /** The id after the route, for example a ratio template. */
  param?: string;
  /** True for the route the page was opened on. */
  initial: boolean;
}

/** Calls `onRoute` now and on every hash change; rewrites an unknown hash to the real route. */
export const startRouter = (host: RouterHost, onRoute: (navigation: Navigation) => void): void => {
  const go = (initial: boolean): void => {
    const route = routeFromHash(host.location.hash);
    const param = paramFromHash(host.location.hash);
    const canonical = hashFor(route, param);
    if (host.location.hash !== canonical) host.history.replaceState(null, '', canonical);
    onRoute(param === undefined ? { route, initial } : { route, param, initial });
  };
  host.addEventListener('hashchange', () => go(false));
  go(true);
};
