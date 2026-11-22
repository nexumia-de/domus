---
type: Reference
title: Service worker
description: The service worker an app of the address installs (serveFromCache, entry @nexumia-de/hospes/service-worker) - a cache named by the app's prefix and the build, served cache first with the page as fallback for a navigation, only the app's own caches deleted, requests to other hosts never touched; who uses it and what is tested.
tags: [service-worker, offline, cache, pwa]
generated: { by: claude-code, at: 2026-11-20 }
---

# Service worker

`src/service-worker.ts`, exported as `@nexumia-de/hospes/service-worker`
so a worker bundle does not carry the sync code. Emptio uses it
(`apps/emptio/packages/app/src/sw.ts`). Mixtura and Culina have workers
of their own from before the package had one; they do the same and can
adopt this one when they are next changed.

`serveFromCache(scope, { prefix, version, files, shell? })` installs
three listeners on the worker's scope:

- **install**: every file of `files` goes into the cache
  `<prefix><version>`; then `skipWaiting`.
- **activate**: caches whose name starts with `prefix` and is not the
  current one are deleted; then `clients.claim`. All apps of the address
  share one cache storage, so the prefix is what keeps a worker from
  deleting another app's cache.
- **fetch**: only `GET` requests to the worker's own origin are
  answered: from the cache (the query is ignored), a navigation that is
  no file with the cached `shell` (`index.html`), anything else from the
  network. A request to another host (a storage) or one that writes is
  left to the browser. A cached answer that is marked as redirected is
  given as a new response, because a browser refuses a redirected one
  for a navigation.

`shouldRegister(location, hasServiceWorker)`: a page registers its
worker over http and https only, and not with `?no-sw` in its address.

The build of an app gives `files` (every built file but the worker) and
`version` (a hash of their content).

Tested in `test/service-worker.test.ts` against a fake scope and a fake
cache storage. No browser runs there; an app's browser check starts the
real worker and reloads offline.
