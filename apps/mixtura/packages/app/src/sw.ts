// The service worker: keeps the app's files at install and answers every
// request from them, never from the network (the install fetches bypass the HTTP cache). A new build has a new cache
// name (build.mjs, from a hash of the files), so its files replace the old
// ones together. A new worker waits until the page sends 'skip-waiting',
// which the page does only when the user taps Update.

/** The app's files and a name made from their content, set by build.mjs. */
declare const APP_FILES: readonly string[];
declare const APP_CACHE: string;

interface WaitEvent extends Event {
  waitUntil(work: Promise<unknown>): void;
}
interface FetchEvent extends WaitEvent {
  readonly request: Request;
  respondWith(response: Promise<Response>): void;
}
interface MessageEvent_ extends Event {
  readonly data: unknown;
}
interface Worker {
  addEventListener(type: 'install' | 'activate', listener: (event: WaitEvent) => void): void;
  addEventListener(type: 'fetch', listener: (event: FetchEvent) => void): void;
  addEventListener(type: 'message', listener: (event: MessageEvent_) => void): void;
  skipWaiting(): Promise<void>;
  readonly clients: { claim(): Promise<void> };
}

const worker = self as unknown as Worker;

worker.addEventListener('install', (event) => {
  // `cache: 'reload'` skips the HTTP cache: a host that serves the fixed file
  // names with max-age (GitHub Pages: 600 s) must not hand an old file to the
  // new worker, which would store it under the new cache name.
  const requests = APP_FILES.map((file) => new Request(file, { cache: 'reload' }));
  event.waitUntil(caches.open(APP_CACHE).then((cache) => cache.addAll(requests)));
});

worker.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((name) => name !== APP_CACHE).map((name) => caches.delete(name))),
      )
      .then(() => worker.clients.claim()),
  );
});

worker.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') void worker.skipWaiting();
});

worker.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.open(APP_CACHE).then(async (cache) => {
      const hit =
        (await cache.match(event.request, { ignoreSearch: true })) ??
        (event.request.mode === 'navigate' ? await cache.match('index.html') : undefined);
      if (hit) return hit;
      // The manifest's install-dialog screenshots are not precached (build.mjs):
      // they come from the network when online, and are simply missing offline.
      if (new URL(event.request.url).pathname.includes('/screenshots/')) {
        return fetch(event.request).catch(() => Response.error());
      }
      return Response.error();
    }),
  );
});
