/**
 * Hash router: #/ratios[/<templateId>], #/components[/<id>], #/dishes[/<id>], #/settings, and the
 * editors #/components/new, #/components/<id>/edit, #/dishes/new, #/dishes/<id>/edit, and the
 * history screens #/components/<id>/history, #/dishes/<id>/history, the import screen
 * #/settings/import, and the stock screens #/stock, #/stock/add and #/stock/<id>/edit.
 * The back stack is the browser history.
 */
export const ROUTES = ['ratios', 'components', 'dishes', 'stock', 'settings'] as const;
export type Route = (typeof ROUTES)[number];
export const DEFAULT_ROUTE: Route = 'ratios';

/** Routes whose hash may carry one more segment (a template, component or dish id). */
const WITH_PARAM: readonly Route[] = ['ratios', 'components', 'dishes', 'stock'];

/** The editors: a new record, or the record in `param` edited. */
export type Action = 'new' | 'edit' | 'history' | 'import' | 'add';
const WITH_ACTION: readonly Route[] = ['components', 'dishes'];

export const hashFor = (route: Route, param?: string, action?: Action): string => {
  if (action === 'new') return `#/${route}/new`;
  if (action === 'import') return `#/${route}/import`;
  if (action === 'add') return `#/${route}/add`;
  if (!param) return `#/${route}`;
  const base = `#/${route}/${encodeURIComponent(param)}`;
  return action === 'edit' || action === 'history' ? `${base}/${action}` : base;
};

const segments = (hash: string): string[] =>
  hash.replace(/^#\/?/, '').split('?')[0]?.split('/') ?? [];

/** The first path segment of the hash; an unknown or empty hash is the default route. */
export const routeFromHash = (hash: string): Route => {
  const segment = segments(hash)[0];
  return ROUTES.find((route) => route === segment) ?? DEFAULT_ROUTE;
};

/** `new`, `edit` for #/components/<id>/edit, `history` for #/components/<id>/history, `add` for #/stock/add. */
export const actionFromHash = (hash: string): Action | undefined => {
  if (routeFromHash(hash) === 'settings') {
    const [, second, third] = segments(hash);
    return second === 'import' && third === undefined ? 'import' : undefined;
  }
  if (routeFromHash(hash) === 'stock') {
    // #/stock/add, #/stock/<id>/edit; the item has no history.
    const [, second, third] = segments(hash);
    if (second === 'add' && third === undefined) return 'add';
    return second && second !== 'add' && third === 'edit' ? 'edit' : undefined;
  }
  if (!WITH_ACTION.includes(routeFromHash(hash))) return undefined;
  const [, second, third] = segments(hash);
  if (second === 'new' && third === undefined) return 'new';
  return second && (third === 'edit' || third === 'history') ? third : undefined;
};

/** The second path segment, decoded, for routes that take one; otherwise undefined. */
export const paramFromHash = (hash: string): string | undefined => {
  if (!WITH_PARAM.includes(routeFromHash(hash))) return undefined;
  const raw = segments(hash)[1];
  if (!raw || actionFromHash(hash) === 'new' || actionFromHash(hash) === 'add') return undefined;
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
  /** The id after the route: a ratio template, a component or a dish. */
  param?: string;
  /** Set on an editor route. */
  action?: Action;
  /** True for the route the page was opened on. */
  initial: boolean;
}

/** Calls `onRoute` now and on every hash change; rewrites an unknown hash to the real route. */
export const startRouter = (host: RouterHost, onRoute: (navigation: Navigation) => void): void => {
  const go = (initial: boolean): void => {
    const route = routeFromHash(host.location.hash);
    const param = paramFromHash(host.location.hash);
    const action = actionFromHash(host.location.hash);
    const canonical = hashFor(route, param, action);
    if (host.location.hash !== canonical) host.history.replaceState(null, '', canonical);
    onRoute({
      route,
      ...(param === undefined ? {} : { param }),
      ...(action === undefined ? {} : { action }),
      initial,
    });
  };
  host.addEventListener('hashchange', () => go(false));
  go(true);
};
