---
type: Specification
title: Sync backends
description: What stays with Mixtura of the storage side of sync - the device-local storages and bindings, the Content-Security-Policy and the service worker rule, the test server and the user setup with Docker; the WebDAV adapter and what a server must do are in the host package.
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
  - id: host
    title: 'Host package: the WebDAV adapter'
    url: ../../../packages/host/docs/webdav.md
---

# Sync backends

How the app reaches the storage a user configured ([decision](decisions/stock-sync.md#bring-your-own-backend)).
Built by issue #133: the WebDAV adapter, the device-local storages and
bindings, the policy change and a server for the tests. The sync cycle is
#134 ([sync cycle](sync-cycle.md)); the screens that use the adapter, the
storages and the bindings are #135 ([screens: sync](screens-sync.md)).

## The adapter

The WebDAV adapter, the list of what a WebDAV server must do for a browser
page, the table of how answers become failures and the limits (blocked
versus unreachable, folders, weak ETags) are in the host package, not here:
[WebDAV adapter](../../../packages/host/docs/webdav.md). The package is
`@nexumia-de/hospes`; the screens call `createWebdavAdapter` and
`testConnection` from it. The sections below stay with Mixtura: its stores,
the policy that lets the page reach the storage, the test server and the
setup for a user.

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
[what a backend must do](../../../packages/host/docs/webdav.md#what-a-backend-must-do)): the origin check against
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
