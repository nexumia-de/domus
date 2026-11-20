// The worker against a fake scope and a fake cache storage: what is cached at
// install, which caches go at activate, and what a request is answered with.
// No browser runs here; an app's browser check starts the real worker offline.
import { expect, test } from 'vitest';
import { serveFromCache, shouldRegister, type WorkerScope } from '../src/service-worker';

type Listener = (event: never) => void;

function fakeScope(origin = 'https://example.org') {
  const stores = new Map<string, Map<string, Response>>();
  const listeners = new Map<string, Listener>();
  const fetched: string[] = [];
  const keyOf = (request: Request | string): string => {
    const url = new URL(typeof request === 'string' ? request : request.url, `${origin}/app/`);
    return url.origin + url.pathname;
  };
  const cacheFor = (name: string) => {
    const files = stores.get(name) ?? new Map<string, Response>();
    stores.set(name, files);
    return {
      addAll: (paths: string[]) => {
        for (const path of paths) files.set(keyOf(path), new Response(`body of ${path}`));
        return Promise.resolve();
      },
      match: (request: Request | string) => Promise.resolve(files.get(keyOf(request))?.clone()),
    };
  };
  const state = { skipped: false, claimed: false };
  const scope = {
    addEventListener: (type: string, listener: Listener) => void listeners.set(type, listener),
    skipWaiting: () => Promise.resolve(void (state.skipped = true)),
    clients: { claim: () => Promise.resolve(void (state.claimed = true)) },
    location: { origin },
    caches: {
      open: (name: string) => Promise.resolve(cacheFor(name)),
      keys: () => Promise.resolve([...stores.keys()]),
      delete: (name: string) => Promise.resolve(stores.delete(name)),
    },
    fetch: (request: Request) => {
      fetched.push(request.url);
      return Promise.resolve(new Response('from the network'));
    },
  } as unknown as WorkerScope;

  const lifecycle = async (type: 'install' | 'activate'): Promise<void> => {
    let done: Promise<unknown> = Promise.resolve();
    listeners.get(type)?.({ waitUntil: (p: Promise<unknown>) => void (done = p) } as never);
    await done;
  };
  /** The text a request is answered with, or null when the worker leaves it to the browser. */
  const request = async (url: string, init: { method?: string; mode?: string } = {}) => {
    let answer: Promise<Response> | undefined;
    const req = { url, method: init.method ?? 'GET', mode: init.mode ?? 'cors' } as Request;
    listeners.get('fetch')?.({
      request: req,
      respondWith: (p: Promise<Response>) => void (answer = p),
    } as never);
    return answer ? (await answer).text() : null;
  };
  return { scope, stores, state, fetched, lifecycle, request };
}

const options = { prefix: 'emptio-', version: 'v2', files: ['index.html', 'main.js'] };

test('install caches every built file under the app and build name and takes over at once', async () => {
  const fake = fakeScope();
  serveFromCache(fake.scope, options);
  await fake.lifecycle('install');
  expect([...fake.stores.keys()]).toEqual(['emptio-v2']);
  expect([...(fake.stores.get('emptio-v2')?.keys() ?? [])]).toEqual([
    'https://example.org/app/index.html',
    'https://example.org/app/main.js',
  ]);
  expect(fake.state.skipped).toBe(true);
});

test("activate deletes the app's older caches and no cache of another app", async () => {
  const fake = fakeScope();
  serveFromCache(fake.scope, options);
  await fake.scope.caches.open('emptio-v1');
  await fake.scope.caches.open('culina-v1');
  await fake.scope.caches.open('mixtura-abc');
  await fake.lifecycle('install');
  await fake.lifecycle('activate');
  expect([...fake.stores.keys()].sort()).toEqual(['culina-v1', 'emptio-v2', 'mixtura-abc']);
  expect(fake.state.claimed).toBe(true);
});

test('a built file is answered from the cache, whatever its query', async () => {
  const fake = fakeScope();
  serveFromCache(fake.scope, options);
  await fake.lifecycle('install');
  expect(await fake.request('https://example.org/app/main.js?x=1')).toBe('body of main.js');
  expect(fake.fetched).toEqual([]);
});

test('a navigation to an address that is no file gets the cached page', async () => {
  const fake = fakeScope();
  serveFromCache(fake.scope, options);
  await fake.lifecycle('install');
  expect(await fake.request('https://example.org/app/', { mode: 'navigate' })).toBe(
    'body of index.html',
  );
  expect(fake.fetched).toEqual([]);
});

test('what is not cached goes to the network', async () => {
  const fake = fakeScope();
  serveFromCache(fake.scope, options);
  await fake.lifecycle('install');
  expect(await fake.request('https://example.org/app/other.json')).toBe('from the network');
});

test('a request to another host, or one that writes, is left to the browser', async () => {
  const fake = fakeScope();
  serveFromCache(fake.scope, options);
  await fake.lifecycle('install');
  expect(await fake.request('https://api.github.com/repos/a/b/contents/x')).toBeNull();
  expect(await fake.request('https://example.org/app/main.js', { method: 'PUT' })).toBeNull();
  expect(fake.fetched).toEqual([]);
});

test('a page registers its worker over http and https only, and not with ?no-sw', () => {
  expect(shouldRegister({ protocol: 'https:', search: '' }, true)).toBe(true);
  expect(shouldRegister({ protocol: 'http:', search: '' }, true)).toBe(true);
  expect(shouldRegister({ protocol: 'file:', search: '' }, true)).toBe(false);
  expect(shouldRegister({ protocol: 'https:', search: '?no-sw' }, true)).toBe(false);
  expect(shouldRegister({ protocol: 'https:', search: '' }, false)).toBe(false);
});
