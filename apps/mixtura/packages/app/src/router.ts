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
