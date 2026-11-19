---
type: Specification
title: WebDAV adapter
description: What a WebDAV server must do for a browser page to sync to it, the adapter on fetch only and how it maps answers to failures, the connection test, and its limits including the weak ETag of Apache.
tags: [webdav, adapter, storage, cors, fetch]
generated: { by: claude-code, at: 2026-11-19 }
sources:
  - id: decision
    title: 'Mixtura decision: stock sync, section Bring your own backend'
    url: ../../../apps/mixtura/docs/decisions/stock-sync.md#bring-your-own-backend
  - id: spike
    title: 'Mixtura: spike, WebDAV from the browser'
    url: ../../../apps/mixtura/docs/webdav-spike.md
  - id: setup
    title: 'Mixtura: set up storage for sync (user guide)'
    url: ../../../apps/mixtura/docs/sync-setup.md
  - id: backends
    title: 'Mixtura: sync backends (the test server, the stores, the policy)'
    url: ../../../apps/mixtura/docs/sync-backends.md
  - id: materia
    title: 'materia, sync: the StorageAdapter interface'
    url: ../../model/docs/sync.md
---

# WebDAV adapter

Code: `src/webdav.ts`, `src/webdav-url.ts`, `src/webdav-connection.ts`; tests
`test/webdav.test.ts` and `test/webdav-url.test.ts`. The adapter was built for
Mixtura ([decision](../../../apps/mixtura/docs/decisions/stock-sync.md#bring-your-own-backend))
and moved here unchanged; the test server, the device-local stores, the
Content-Security-Policy and the service worker rule stay with Mixtura
([sync backends](../../../apps/mixtura/docs/sync-backends.md)).

## What a backend must do

The interface is materia's `StorageAdapter`, re-exported by Mixtura's engine
([engine](../../../apps/mixtura/docs/engine.md#sync-names-re-exported-from-materia)):
`read(path)` gives the body and an etag or "missing"; `write(path, body, ifMatch)`
writes with a condition (`ifMatch` an etag the file must still have, `null`
the file must not exist, omitted unconditional). Failures are `conflict`,
`unauthorised`, `not-found`, `unreachable`, `blocked` and `server`. A WebDAV
server serves it from a browser page when it:

1. stores one file per path and creates folders with `MKCOL`;
2. answers `GET` with `200` and an `ETag`, and `404` for a missing file;
3. answers `PUT` with `2xx`, and honours `If-Match` and `If-None-Match: *`
   with `412` (the answer's `ETag` is used when there is one, not required);
4. wants HTTP basic authentication, or none;
5. answers CORS for the app's origin ([spike](../../../apps/mixtura/docs/webdav-spike.md#from-the-browser-page-with-cors-headers-in-front-of-nextcloud)):
   the preflight (`OPTIONS`) without credentials, `Access-Control-Allow-Origin`
   with the origin, `Access-Control-Allow-Methods` `GET, PUT, MKCOL`,
   `Access-Control-Allow-Headers` `Authorization, Content-Type, If-Match, If-None-Match`
   and `Access-Control-Expose-Headers: ETag`. The headers must also be on the
   `401`, `404`, `409` and `412` answers, or the page cannot read them.

An unmodified Nextcloud fails point 5 ([spike](../../../apps/mixtura/docs/webdav-spike.md#result)). The
server of [the test server](../../../apps/mixtura/docs/sync-backends.md#the-test-server) meets all five.

## The adapter

`src/webdav.ts`, `createWebdavAdapter({ baseUrl, username?, password?, fetch?, online? })`.
Only `fetch`; `fetch` and `online` (the value of `navigator.onLine`) are
injectable for tests. Every request has `credentials: 'omit'` (no cookies, the
credentials are the `Authorization: Basic …` header, UTF-8 encoded) and
`cache: 'no-store'`. Writes send `Content-Type: application/json`.
`src/webdav-url.ts` joins paths: every segment is `encodeURIComponent`-encoded,
empty segments are dropped, an empty path or a `.` or `..` segment throws a
`RangeError` before any request, so a path cannot leave the configured folder.

| Request                            | Answer                                        | Result                                                                            |
| ---------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------- |
| `GET`                              | 2xx with `ETag`                               | `{ ok, missing: false, body, etag }`                                              |
| `GET`                              | 2xx without a readable `ETag`                 | `blocked`, detail `etag-not-exposed` (the server lacks `Expose-Headers`)          |
| `GET`                              | 404                                           | `{ ok, missing: true }`                                                           |
| `PUT`                              | 2xx                                           | `{ ok, etag? }`, the etag only if the server sent one                             |
| `PUT` with `If-Match` or `*`       | 412                                           | `conflict`                                                                        |
| any                                | 401, 403                                      | `unauthorised`                                                                    |
| `PUT`                              | 404, 409 (a folder above the file is missing) | `MKCOL` of every folder above the file, outermost first, then the `PUT` once more |
| `MKCOL`                            | 201 or 405 (exists)                           | continue                                                                          |
| `MKCOL`                            | 401, 403                                      | `unauthorised`                                                                    |
| `MKCOL`                            | other                                         | `not-found`, detail `MKCOL HTTP <status>`                                         |
| `PUT` after the `MKCOL`s           | 404, 409                                      | `not-found`, detail `HTTP <status>` (never a third try)                           |
| `PUT` of a file in the base folder | 404, 409                                      | `not-found` (there is nothing to make)                                            |
| any                                | other 4xx and 5xx                             | `server`, detail `HTTP <status>`                                                  |
| any                                | `fetch` throws a `TypeError`                  | `blocked` while `navigator.onLine` is true, `unreachable` while it is false       |

Any other exception from `fetch` is not caught.

`src/webdav-connection.ts`, `testConnection(adapter, probe?)`, reads the probe
path `.mixtura-probe` (it need not exist) and reports `reachable`,
`unauthorised`, `blocked`, `unreachable` or `server` with the detail of the
failure. Mixtura uses it for "Test Connection" of its settings screen ([screens: sync](../../../apps/mixtura/docs/screens-sync.md)). The probe name is still Mixtura's (`.mixtura-probe`); it moved unchanged.

### Limits

- **`blocked` and `unreachable` are a guess.** A page learns nothing from a
  failed `fetch` but a `TypeError`: a missing CORS header, a refused
  preflight, mixed content, the policy and a dead server look the same.
  `navigator.onLine` only says whether the device has a network. The screen
  must name all causes for `blocked` (CORS setup, `https` versus `http`,
  address) and not claim one.
- **Folders are made one level at a time, only above a file** and only after
  a first `PUT` was refused; the base folder itself must exist.
- **A weak ETag never matches `If-Match`.** Apache sends a weak `ETag`
  (`W/"…"`) for a file written less than a second ago, so a conditional write
  inside that second used to be a false `conflict`; found with the test server
  when the sync cycle's attempts were used up within that second. The adapter
  now sends `If-Match` in the strong form (a leading `W/` is removed), and when
  the ETag the caller passed was weak and the answer is `412` it waits 1,100 ms
  and repeats that one write once before it reports `conflict`. The wait is an
  injected function (`delay`), so unit tests do not wait; a strong ETag that
  meets `412` is a conflict at once. `test/sync-webdav-integration.test.ts` of Mixtura
  writes right after a read of a fresh file against the real server. Nextcloud
  has the opposite weakness, an unchanged ETag within one second
  ([spike](../../../apps/mixtura/docs/webdav-spike.md#nextcloud-keeps-the-etag-on-writes-within-one-second));
  the merge is safe without the condition
  ([decision, point 8](../../../apps/mixtura/docs/decisions/stock-sync.md#decision)).
- **The `PUT` of the test server returns no ETag**; `write` then gives no
  `etag`, and the next read does.
- **Redirects are followed** by `fetch`; a browser drops the `Authorization`
  header on a redirect to another origin.
- Not tested: Firefox, Safari, other servers than the test server and
  Nextcloud behind the same headers.
