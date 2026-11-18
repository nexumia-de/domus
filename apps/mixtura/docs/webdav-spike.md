---
type: Research
title: 'Spike: WebDAV from the browser'
description: Whether a browser page can read and conditionally write a file on a real Nextcloud over WebDAV (no without CORS headers, yes with them), the exact CORS setup that worked, an ETag weakness of Nextcloud on fast writes, what the app's own Content-Security-Policy blocks, and the options for the owner.
tags: [sync, webdav, cors, nextcloud, spike]
generated: { by: claude-code/2.1.327, at: 2026-11-18 }
sources:
  - id: nc-image
    title: 'Docker Official Image nextcloud:31-apache, digest sha256:07ec73cc816e58d6f45a162cd53ef886462c29271a23fc68d0124cec276e3767 (pulled and run 2026-11-18)'
    url: https://hub.docker.com/_/nextcloud
---

# Spike: WebDAV from the browser

Asked before stock sync is built: can the PWA, as a page in a browser,
read a file from a WebDAV server and write it back with a condition, and
what does the server need for that? Everything here was run on
2026-11-18 in the agent session; what was not run is marked.

## Result

1. **An unmodified Nextcloud cannot be reached from a browser page.**
   Every request fails in the CORS preflight. No sync is possible from
   the PWA in a browser against a stock Nextcloud.
2. **With CORS headers added in the web server in front of Nextcloud,
   read and conditional write work** from the page: create, read with
   ETag, `If-Match`, `If-None-Match: *`.
3. **`If-Match` on Nextcloud does not catch every lost update.** A write
   in the same second as the previous write keeps the ETag. The sync
   cycle must not depend on `If-Match` for correctness.
4. **Mixtura's own Content-Security-Policy forbids the requests** today
   (`connect-src 'self'`); it has to be widened for sync.

Following the task's rule, work stopped here for the owner. The
[stock sync decision](decisions/stock-sync.md) of the same day goes on
with option A and the widened policy as assumptions.

## Setup

- Server: Nextcloud 31.0.14 from the official image
  `nextcloud:31-apache`[^nc-image] (Apache 2.4.66, SQLite), started with
  an admin user and no other change, at `http://127.0.0.1:8080`.
- Page: an empty HTML page served from `http://localhost:5000` (another
  origin than the server), opened in Chromium 1243 by Playwright 1.65.0.
  The page calls `fetch` with `Authorization: Basic …` and
  `credentials: 'omit'` on
  `/remote.php/dav/files/admin/mixtura/spike.json`.
- Firefox and Safari were not available in the session and were not
  tested. CORS is specified behaviour, so the first result holds for
  them; the details of the second were only seen in Chromium.

## Without a browser (curl): the WebDAV semantics are fine

| Request                                   | Answer                                           |
| ----------------------------------------- | ------------------------------------------------ |
| `MKCOL` of the folder                     | 201                                              |
| `PUT` with `If-None-Match: *`, file new   | 201, `ETag`                                      |
| `PUT` with `If-None-Match: *`, file there | 412                                              |
| `GET`                                     | 200, `ETag` (strong, quoted)                     |
| `GET`, file missing                       | 404                                              |
| `PUT` with `If-Match` of the current ETag | 204, new `ETag`                                  |
| `PUT` with `If-Match` of an old ETag      | 412                                              |
| any request without credentials           | 401, `WWW-Authenticate: Basic realm="Nextcloud"` |

No answer carries an `Access-Control-…` header, with or without an
`Origin` request header.

## From the browser page, Nextcloud unmodified

All six requests (read, create, read, two conditional writes, create
again) fail with `TypeError: Failed to fetch`. The console names the
cause: "blocked by CORS policy: Response to preflight request doesn't
pass access control check". The preflight is an `OPTIONS` request
without credentials (browsers never send them on a preflight); Nextcloud
answers it with 401 and no CORS header. `Authorization`, `If-Match` and
the method `PUT` each force a preflight, so no variant of the request
avoids it. `mode: 'no-cors'` is no way out: it allows neither the
headers nor reading the answer.

## From the browser page, with CORS headers in front of Nextcloud

This Apache configuration (`/etc/apache2/conf-enabled/mixtura-cors.conf`
in the container, then `apache2ctl graceful`) was enough. Nextcloud
itself was not changed.

```apache
SetEnvIf Origin "^http://localhost:5000$" MIXTURA_ORIGIN=$0
Header always set Access-Control-Allow-Origin "%{MIXTURA_ORIGIN}e" env=MIXTURA_ORIGIN
Header always set Access-Control-Allow-Methods "GET, PUT, MKCOL, PROPFIND" env=MIXTURA_ORIGIN
Header always set Access-Control-Allow-Headers "Authorization, Content-Type, Depth, If-Match, If-None-Match" env=MIXTURA_ORIGIN
Header always set Access-Control-Expose-Headers "ETag" env=MIXTURA_ORIGIN
Header always set Access-Control-Max-Age "600" env=MIXTURA_ORIGIN
Header always merge Vary "Origin"
<If "%{REQUEST_METHOD} == 'OPTIONS' && -n req('Access-Control-Request-Method')">
    Redirect 204
</If>
```

For the real app the origin is `https://mixtura.nexumia.de`. What each
part is for:

- **Answer the preflight without credentials** (the `<If>` block): the
  one thing Nextcloud will not do by itself.
- **`Access-Control-Allow-Origin`** with the app's origin, not `*`
  needed; no `Access-Control-Allow-Credentials`, because the app sends
  the `Authorization` header itself and no cookies.
- **`Access-Control-Expose-Headers: ETag`**: without it the page gets
  the body but `response.headers.get('etag')` is `null`, and no
  conditional write is possible.
- **Allowed headers** `Authorization`, `Content-Type`, `If-Match`,
  `If-None-Match`; `Depth` and the methods `MKCOL` and `PROPFIND` only
  if the adapter creates folders or lists them (not tested from the
  page).

Seen from the page with this in place: read of a missing file 404,
create 201 with ETag, read 200 with body and ETag, `PUT` with
`If-None-Match: *` on an existing file 412.

## Nextcloud keeps the ETag on writes within one second

In the same run the two conditional writes both returned 204, the
second with the ETag the first should have invalidated. Followed up
with `fetch` from Node (three `PUT`s on one file, each with `If-Match`
of the ETag the previous answer returned):

| Writes                               | ETags returned             |
| ------------------------------------ | -------------------------- |
| same size, no wait                   | the same ETag three times  |
| other size each time, no wait        | the same ETag three times  |
| same size, 1.1 s between             | a new ETag each time       |
| read between the writes (about 0.3s) | new ETag, stale write: 412 |

So the ETag changes only when the file's modification time, which has a
resolution of one second, changes. Two devices that read the file and
write within the same second as the last write both get 204, and the
second overwrites the first: a lost update that `If-Match` does not
report. The cause inside Nextcloud was not read in its source; the
behaviour is what was measured on 31.0.14 with SQLite and local
storage.

Consequence for the design: the merge must be safe without the
condition. Each device keeps all its records and tombstones locally and
merges per record, newest wins; a file overwritten by another device
then only delays convergence until the overwritten device syncs again,
and loses nothing. `If-Match` stays in as the cheap way to notice most
conflicts at once, and a read after the write can confirm the result.

## The app's own Content-Security-Policy

`packages/app/headers.mjs` sends `connect-src 'self'`
([development](development.md)), which blocks every request to another
host before CORS is even asked. Backends are whatever the user
configures, so the policy cannot name them; sync needs
`connect-src 'self' https:` (any host over TLS). That gives up the
policy's guarantee that the page cannot send data anywhere; the rule
"no request except to configured backends" would then rest on the code
and a test instead of on the browser. This is part of the decision.

Also true and not tested here:

- A page on `https://` cannot call an `http://` backend (mixed content),
  except `localhost`. A Nextcloud at home without TLS cannot be a
  backend of the hosted app.
- Chromium asks the user for a permission before a public page may call
  an address in the local network. A Nextcloud reachable only in the
  home network meets this prompt. Not tested.

## Options

A. **Document the server-side CORS setup and require it.** Sync works
with any WebDAV server whose owner adds the headers above (Apache as
tested; nginx and Caddy equivalents are not tested). Works with the
plain PWA, no component of ours. Cost: only people who administer
their Nextcloud can use it; "my parents' Nextcloud" needs that change
too; hosted Nextcloud offers usually do not allow it.

B. **A Nextcloud app that adds the headers.** Apps such as
`webapppassword` exist for this; `apps.nextcloud.com` is blocked in
the session, so neither the app's state for Nextcloud 31 nor its
licence was read, and nothing was tested. Still needs the server's
admin, but no web server access.

C. **Sync only in the wrapped apps** (Android APK, Linux shell), where
requests can go through native code and CORS does not apply. The
packaging decision is open ([packaging](decisions/packaging.md)) and
the task says not to build for the APK, so this would postpone sync.
The adapter interface would be the same; a native adapter is one more
implementation.

D. **A relay of ours that adds the headers.** Works with every
Nextcloud, but credentials and stock data would pass through a server
of ours. It contradicts "no server of its own" and is listed only to
be ruled out.

E. **Build for servers that already answer CORS, and tell Nextcloud
users what to do.** The same code as A; the difference is only what is
promised. The automated tests would run against a WebDAV server
configured with the headers, and the screen "Test Connection" names
the missing CORS setup with a link to the instructions.

Recommendation: A (with E's wording in the app), and C later as a second
adapter once packaging is decided. A is the only option that keeps
"no server, no account" and works in the main form of the app; its
limit, that the storage's admin must add eight lines, is honest and
testable. The task's example then holds when both Nextcloud instances
carry the configuration.

## Not verified

- Firefox, Safari, Chromium on Android.
- nginx or Caddy in front of Nextcloud; Nextcloud's own `.htaccess`
  route; other WebDAV servers.
- App passwords (the spike used the admin password; Nextcloud
  recommends an app password per client) and accounts with two-factor
  login.
- Shared folders between two Nextcloud users, which is how a place
  would be shared.
- `PROPFIND` and `MKCOL` from the page.
- Blocked hosts: see [development](development.md#hosts-for-the-webdav-spike).
