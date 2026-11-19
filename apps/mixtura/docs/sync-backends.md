---
type: Specification
title: Sync backends
description: What a storage must do for the app to sync to it from a browser, the WebDAV adapter and how it maps answers to failures, its limits, the device-local storages and bindings, the Content-Security-Policy and the service worker rule, the test server and the user setup with Docker.
tags: [sync, webdav, adapter, cors, csp, storages, bindings, docker]
generated: { by: claude-code/2.1.327, at: 2026-11-18 }
sources:
  - id: decision
    title: 'Decision: stock sync, section Bring your own backend'
    url: decisions/stock-sync.md#bring-your-own-backend
  - id: spike
    title: 'Spike: WebDAV from the browser'
    url: webdav-spike.md
  - id: setup
    title: 'Set up storage for sync (user guide)'
    url: sync-setup.md
  - id: materia
    title: 'materia, sync: the StorageAdapter interface'
    url: ../../../packages/model
---

# Sync backends

How the app reaches the storage a user configured ([decision](decisions/stock-sync.md#bring-your-own-backend)).
Built by issue #133: the WebDAV adapter, the device-local storages and
bindings, the policy change and a server for the tests. The sync cycle is
#134 ([sync cycle](sync-cycle.md)); the screens that use the adapter, the
storages and the bindings are #135 ([screens: sync](screens-sync.md)).

## What a backend must do

The interface is materia's `StorageAdapter`, re-exported by the engine
([engine](engine.md#sync-names-re-exported-from-materia)):
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
5. answers CORS for the app's origin ([spike](webdav-spike.md#from-the-browser-page-with-cors-headers-in-front-of-nextcloud)):
   the preflight (`OPTIONS`) without credentials, `Access-Control-Allow-Origin`
   with the origin, `Access-Control-Allow-Methods` `GET, PUT, MKCOL`,
   `Access-Control-Allow-Headers` `Authorization, Content-Type, If-Match, If-None-Match`
   and `Access-Control-Expose-Headers: ETag`. The headers must also be on the
   `401`, `404`, `409` and `412` answers, or the page cannot read them.

An unmodified Nextcloud fails point 5 ([spike](webdav-spike.md#result)). The
server of [the test server](#the-test-server) meets all five.

## The adapter

`packages/app/src/sync/webdav.ts`, `createWebdavAdapter({ baseUrl, username?, password?, fetch?, online? })`.
Only `fetch`; `fetch` and `online` (the value of `navigator.onLine`) are
injectable for tests. Every request has `credentials: 'omit'` (no cookies, the
credentials are the `Authorization: Basic …` header, UTF-8 encoded) and
`cache: 'no-store'`. Writes send `Content-Type: application/json`.
`webdav-url.ts` joins paths: every segment is `encodeURIComponent`-encoded,
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

`webdav-connection.ts`, `testConnection(adapter, probe?)`, reads the probe
path `.mixtura-probe` (it need not exist) and reports `reachable`,
`unauthorised`, `blocked`, `unreachable` or `server` with the detail of the
failure. This is "Test Connection" of the settings screen (#135).

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
  meets `412` is a conflict at once. `test/sync-webdav-integration.test.ts`
  writes right after a read of a fresh file against the real server. Nextcloud
  has the opposite weakness, an unchanged ETag within one second
  ([spike](webdav-spike.md#nextcloud-keeps-the-etag-on-writes-within-one-second));
  the merge is safe without the condition
  ([decision, point 8](decisions/stock-sync.md#decision)).
- **The `PUT` of the test server returns no ETag**; `write` then gives no
  `etag`, and the next read does.
- **Redirects are followed** by `fetch`; a browser drops the `Authorization`
  header on a redirect to another origin.
- Not tested: Firefox, Safari, other servers than the test server and
  Nextcloud behind the same headers.

## The stores

Device-local, in the IndexedDB database since schema version 5
([store](store.md#device-local-sync-configuration)); never exported, never in
a sync file or an invite. Code: `store/repo-sync.ts`.

- `storages`, key `id` (a user id): `{ id, label, type: 'webdav', baseUrl, username?, password? }`.
- `bindings`, key `[unitKind, unitId]`, index `storageId`:
  `{ unitKind: 'place', unitId, storageId, folder, passphrase, etag?, lastSyncAt?, lastError? }`.
  `etag` is the one last read or written, `lastError` the last failure for the
  screen.

Both are validated on every write against `engine/schemas/device/storage.schema.json`
and `binding.schema.json`. The folder `device/` is compiled like the others
(`compile-schemas.mjs`) but the export schema does not reference them and has
no property for them: a test proves that an export file and the export
snapshot hold none of their fields or any credential, and that a file that
carries them is refused. Their writes are not entity changes: no backup
reminder count, no persistence request. `storages.delete(id)` is refused with
a `StoreError` of kind `in-use` (its `details` name the bindings) while a
binding points at the storage; check and delete are one transaction.

Credentials and passphrases are readable in the browser's storage, as the
[decision](decisions/stock-sync.md#encryption) says; the user's own device is
the boundary.

## Policy

`packages/app/headers.mjs` sends `connect-src 'self' https: http://localhost:* http://127.0.0.1:*`
([decision](decisions/stock-sync.md#bring-your-own-backend), point 4;
[development](development.md#content-security-policy)). Why: the address of
the storage is the user's, so the policy cannot name it; `https:` is every
host over TLS, and plain `http:` only for the machine itself, which is the
exception browsers make for mixed content too. A storage in the home network
without TLS is therefore out of reach for the hosted app: put `https` in
front of it.

What this gives up: the browser no longer guarantees that the page cannot send
data to any `https` host. The rule "requests go only to configured storages"
now rests on the code (nothing but the adapter calls `fetch` for another
origin) and on tests: `e2e/walk.mjs` ends with "no request left the origin"
for a whole walk of the app with no storage configured, and a place without a
binding sends no request; `e2e/csp.mjs` fails on any policy violation;
`e2e/webdav.mjs` shows that plain `http` to a public address is still blocked.
Everything the page may send to a configured storage is ciphertext of the sync
file ([sync encryption](sync-encryption.md)) and the credentials of that storage.

### Service worker

The service worker answers every `GET` from the app's cache and used to answer
a miss with an error. A storage is another origin, so its reads were failed
before they reached the network (found by `e2e/webdav.mjs` with the worker
controlling the page: the first read worked, all later ones failed with
`net::ERR_FAILED`). `src/sw.ts` now leaves requests to other origins alone.

## The test server

`tools/webdav-server/`: Apache 2.4.71 with `mod_dav`, the official `httpd`
image pinned by digest ([dependencies](dependencies.md#test-and-user-server)),
one configuration file, a Compose file and a README for users. It is both the
fixture of the tests and the setup users run
([below](#setup-for-a-user)). What it was measured to do:
[spike](webdav-spike.md#the-test-server-httpd-with-mod_dav).

Start it, run the tests and stop it:

```sh
cd tools/webdav-server && WEBDAV_PASSWORD=test docker compose up -d
```

```sh
cd packages/app && MIXTURA_WEBDAV_URL=http://127.0.0.1:8080 MIXTURA_WEBDAV_PASSWORD=test npx vitest run test/sync-webdav-integration.test.ts
```

```sh
cd packages/app && MIXTURA_WEBDAV_URL=http://127.0.0.1:8080 MIXTURA_WEBDAV_PASSWORD=test node e2e/webdav.mjs 360 720
```

```sh
cd tools/webdav-server && docker compose down -v
```

Without `MIXTURA_WEBDAV_URL` the integration test shows as skipped with its
reason and the e2e script prints "skipped" and ends successfully; `npm run check`
and `npm run e2e` need no server. CI runs both against the server in the job
`webdav` ([development](development.md#ci)). The e2e script starts the built
app's origin (with its policy and service worker), bundles the adapter into the
page and does read, create, conditional write, conflict, a wrong password, a
dead address, offline and a blocked address through the browser's own `fetch`.

A second, independent server for the tests that need two storages
(`e2e/sync.mjs`): `docker compose --profile second up -d` in the same folder
starts it on port 8081 (`WEBDAV_PORT_2`, volume `dav-data-2`); users who run
`docker compose up -d` get one server only. The addresses reach the scripts as
`MIXTURA_WEBDAV_URL` and `MIXTURA_WEBDAV_URL_2`:

```sh
cd packages/app && MIXTURA_WEBDAV_URL=http://127.0.0.1:8080 MIXTURA_WEBDAV_URL_2=http://127.0.0.1:8081 MIXTURA_WEBDAV_PASSWORD=test node e2e/sync.mjs 360 720
```

Without both addresses `e2e/sync.mjs` prints "skipped" and ends successfully.
Stop both with `docker compose --profile second down -v`.

Editing `httpd.conf` after the container exists: `docker compose up -d --force-recreate`
(a single-file bind mount keeps the old file when an editor replaces it).

## Fronts: nginx and Caddy

`tools/webdav-front/` (#141) holds a minimal reverse proxy each for nginx
(`nginx/default.conf.template`) and Caddy (`caddy/Caddyfile`), a Compose file
that starts either in front of the `httpd` server of `tools/webdav-server` run
without any CORS answer (`BACKEND_ONLY=1` in its entrypoint, which starts Apache
with `-DNO_CORS`; without that variable nothing changes), and a README. They
add what a plain WebDAV server lacks (point 5 of
[what a backend must do](#what-a-backend-must-do)): the origin check against
`ALLOWED_ORIGINS_REGEX`, the preflight answered without credentials, the
exposed `ETag`, and the same headers on the `401`. Ports `8090` (nginx) and
`8091` (Caddy) on `127.0.0.1`. The Node integration test passes unchanged
against both, and CI runs it ([development](development.md#ci)); what was
tested in which way is in the [setup guide](sync-setup.md#what-was-tested).

## Setup for a user

The guide for users is [Set up storage for sync](sync-setup.md) (the target
of `SETUP_URL`); this section is what it is built on.

[tools/webdav-server/README.md](../tools/webdav-server/README.md): with Docker,
`WEBDAV_PASSWORD=… docker compose up -d`, then in the app address
`http://localhost:8080`, the user and password, and a folder name. The hosted
app reaches `http://` only on `localhost` and `127.0.0.1`; for a phone or
another computer the server needs an `https` address (a reverse proxy), and
`ALLOWED_ORIGINS_REGEX` lists the app's origin if it is not the hosted one.
The password of the server and the passphrase of a place are different things:
the first is the server's, the second encrypts the file before it is sent.
