// Hash routing (docs/behaviour.md#navigation). Pure functions: a hash
// string becomes a Route, a Route is matched against the screens.

export interface Route {
  /** Path segments without the leading slash: `#/drinks/x` is ['drinks', 'x']. */
  path: string[];
  query: URLSearchParams;
  /** Normalised hash, `#/drinks/x?q=a`; the route's identity. */
  hash: string;
}

export const DEFAULT_HASH = '#/drinks';

export function parseHash(hash: string): Route {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  const [pathPart = '', ...rest] = raw.split('?');
  const query = new URLSearchParams(rest.join('?'));
  const path = pathPart
    .split('/')
    .filter((segment) => segment !== '')
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    });
  return { path, query, hash: formatHash(path, query) };
}

export function formatHash(path: readonly string[], query?: URLSearchParams): string {
  const text = query?.toString() ?? '';
  return `#/${path.map(encodeURIComponent).join('/')}${text ? `?${text}` : ''}`;
}

/** An empty hash opens the home destination. */
export function normaliseHash(hash: string): string {
  const route = parseHash(hash);
  return route.path.length === 0 ? DEFAULT_HASH : route.hash;
}

/**
 * Back from an open sheet (`?sheet=…`) lands on the entry below it, which
 * has the filters from before the sheet. The filters changed inside the sheet
 * are kept: the route is then the sheet's route without `sheet`; null when
 * this move is not a sheet closing.
 */
export function closedSheet(previous: Route, next: Route): Route | null {
  if (!previous.query.has('sheet') || next.query.has('sheet')) return null;
  if (previous.path.join('/') !== next.path.join('/')) return null;
  const query = new URLSearchParams(previous.query);
  query.delete('sheet');
  return parseHash(formatHash(previous.path, query));
}

/**
 * Leaving a swap that changed something: the route to return to for Undo, else
 * null. Moving within the same drink with the swap kept (a sheet closing, a
 * servings change) is not leaving. An empty swap has nothing to drop.
 */
export function droppedSwap(previous: Route, next: Route): Route | null {
  if (!previous.query.get('swap')) return null;
  const samePath = previous.path.join('/') === next.path.join('/');
  if (samePath && next.query.has('swap')) return null;
  return previous;
}
