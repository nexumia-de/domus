// The service worker an app of the address installs: the built files are kept
// in a cache named by the app and the build, served from there, and a
// navigation falls back to the cached page, so the app starts offline. It is
// its own entry (`@nexumia-de/hospes/service-worker`), so a worker bundle does
// not carry the sync code. See docs/service-worker.md.

interface WaitEvent {
  waitUntil(promise: Promise<unknown>): void;
}
interface FetchEventLike {
  request: Request;
  respondWith(response: Promise<Response>): void;
}
/** What the worker needs of its global scope; tests give a fake. */
export interface WorkerScope {
  addEventListener(type: 'install' | 'activate', listener: (event: WaitEvent) => void): void;
  addEventListener(type: 'fetch', listener: (event: FetchEventLike) => void): void;
  skipWaiting(): Promise<void>;
  clients: { claim(): Promise<void> };
  location: { origin: string };
  caches: CacheStorage;
  fetch(request: Request): Promise<Response>;
}

export interface WorkerOptions {
  /**
   * The app's own prefix for cache names, for example `emptio-`. All apps of the address
   * share one cache storage: a worker deletes only caches with its prefix.
   */
  prefix: string;
  /** Changes with the content of the build; the build derives it from the files. */
  version: string;
  /** Every built file, relative to the worker, without the worker itself. */
  files: readonly string[];
  /** The page a navigation falls back to; default `index.html`. */
  shell?: string;
}

/**
 * Some hosts answer `index.html` with a redirect to the folder; the stored copy is then
 * marked as redirected and a browser refuses it for a navigation. The same content in a new
 * response carries no mark.
 */
const unmarked = (response: Response): Response =>
  response.redirected
    ? new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      })
    : response;

/** Installs the listeners on `scope` (the worker's `self`). */
export function serveFromCache(scope: WorkerScope, options: WorkerOptions): void {
  const name = `${options.prefix}${options.version}`;
  const shell = options.shell ?? 'index.html';

  scope.addEventListener('install', (event) => {
    event.waitUntil(
      scope.caches
        .open(name)
        .then((cache) => cache.addAll([...options.files]))
        .then(() => scope.skipWaiting()),
    );
  });

  scope.addEventListener('activate', (event) => {
    event.waitUntil(
      scope.caches
        .keys()
        .then((names) =>
          Promise.all(
            names
              .filter((other) => other.startsWith(options.prefix) && other !== name)
              .map((other) => scope.caches.delete(other)),
          ),
        )
        .then(() => scope.clients.claim()),
    );
  });

  const answer = async (request: Request): Promise<Response> => {
    const cache = await scope.caches.open(name);
    const hit = await cache.match(request, { ignoreSearch: true });
    if (hit) return unmarked(hit);
    if (request.mode === 'navigate') {
      const page = await cache.match(shell);
      if (page) return unmarked(page);
    }
    return scope.fetch(request);
  };

  scope.addEventListener('fetch', (event) => {
    const { request } = event;
    // Only the app's own files: a request to a storage is never answered from a cache.
    if (request.method !== 'GET' || new URL(request.url).origin !== scope.location.origin) return;
    event.respondWith(answer(request));
  });
}

/** Whether a page registers its worker: over http(s) only, and not with `?no-sw` in its address. */
export const shouldRegister = (
  location: { protocol: string; search: string },
  hasServiceWorker: boolean,
): boolean =>
  hasServiceWorker &&
  (location.protocol === 'https:' || location.protocol === 'http:') &&
  !new URLSearchParams(location.search).has('no-sw');
