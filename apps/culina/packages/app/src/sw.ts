/**
 * Service worker. The build defines PRECACHE_FILES (every built file except
 * sw.js) and CACHE_VERSION (a content hash of those files). Files are
 * served from the cache; navigations fall back to the cached index.html.
 */
declare const PRECACHE_FILES: readonly string[];
declare const CACHE_VERSION: string;

const PREFIX = 'culina-';
const CACHE_NAME = `${PREFIX}${CACHE_VERSION}`;

interface WaitEvent extends Event {
  waitUntil(promise: Promise<unknown>): void;
}
interface FetchEventLike extends Event {
  request: Request;
  respondWith(response: Promise<Response>): void;
}
interface WorkerScope {
  addEventListener(type: 'install' | 'activate', listener: (event: WaitEvent) => void): void;
  addEventListener(type: 'fetch', listener: (event: FetchEventLike) => void): void;
  skipWaiting(): Promise<void>;
  clients: { claim(): Promise<void> };
  location: { origin: string };
}
const scope = self as unknown as WorkerScope;

scope.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll([...PRECACHE_FILES]))
      .then(() => scope.skipWaiting()),
  );
});

scope.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith(PREFIX) && name !== CACHE_NAME)
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => scope.clients.claim()),
  );
});

const answer = async (request: Request): Promise<Response> => {
  const cache = await caches.open(CACHE_NAME);
  const hit = await cache.match(request, { ignoreSearch: true });
  if (hit) return hit;
  if (request.mode === 'navigate') {
    const shell = await cache.match('index.html');
    if (shell) return shell;
  }
  return fetch(request);
};

scope.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== scope.location.origin) return;
  event.respondWith(answer(request));
});
