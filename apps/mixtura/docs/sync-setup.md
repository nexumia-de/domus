---
type: Guide
title: Set up storage for sync
description: How to get a WebDAV folder that Drink Builder can sync to from a browser - a Docker server, nginx, Caddy or Apache in front of an existing WebDAV server, or Nextcloud with its limits - what was tested for each, and what to change for every problem text the app shows.
tags: [sync, webdav, cors, docker, nginx, caddy, apache, nextcloud, guide, troubleshooting]
generated: { by: claude-code/2.1.327, at: 2026-11-18 }
sources:
  - id: spike
    title: 'Spike: WebDAV from the browser'
    url: webdav-spike.md
  - id: backends
    title: 'Sync backends'
    url: sync-backends.md
  - id: strings
    title: 'Sync screen texts (packages/app/src/screens/sync/strings.ts)'
    url: ../packages/app/src/screens/sync/strings.ts
---

# Set up storage for sync

Drink Builder can keep an encrypted copy of a place's stock in a storage you
run, so your devices stay in step or you share a place with someone. There is
no server of ours: you bring the storage. This page gets one working. If you can
run a command in a terminal, you can follow it. The developer-facing
description is [sync backends](sync-backends.md).

The app encrypts the stock with the passphrase of the place before anything
leaves the device, so the storage only ever holds ciphertext. The password of
the storage and the passphrase of a place are different things: the first
signs in to the server, the second encrypts the file.

## What sync needs

The storage has to be a **WebDAV folder** that the app can reach from the
browser. A browser is stricter than a normal WebDAV client, so four things
must be true:

1. **HTTPS.** The hosted app (`https://mixtura.nexumia.de`) may call an
   `http://` address only on the same machine: `localhost` or `127.0.0.1`. A
   server on another machine, or one you reach from your phone, needs an
   `https://` address with a certificate your browser trusts.
2. **CORS for the app's address.** The server has to answer the browser's
   preflight (an `OPTIONS` request that carries no password) with
   `Access-Control-Allow-Origin: https://mixtura.nexumia.de`, the methods
   `GET, PUT, MKCOL` and the headers `Authorization, Content-Type, If-Match,
If-None-Match`. The same headers must be on the `401` answer, or the app
   cannot tell a wrong password from a dead server.
3. **The ETag header exposed.** `Access-Control-Expose-Headers: ETag`. Without
   it the app reads the file but cannot write safely.
4. **`If-Match` honoured.** A write with a stale `ETag` must be refused with
   `412`. Most WebDAV servers do this.

An unmodified Nextcloud fails the second point; the options below are the
ways around that. If you host your own copy of the app, replace the app's
address everywhere below with the address of your copy.

The Cloudflare Worker that a user could deploy as a ready-made storage (the
last item of issue #141) is **not part of this guide**; it is planned as its
own issue.

## Option a: the Docker server

The simplest way, and the one the tests use: a small Apache server with
WebDAV, already set up for all four points. You need
[Docker](https://docs.docker.com/get-docker/) with Compose and `git`.

Get the files:

```sh
git clone https://github.com/nexumia-de/mixtura.git
```

Go to the server's folder:

```sh
cd mixtura/tools/webdav-server
```

Start it with a password of your choice:

```sh
WEBDAV_PASSWORD=choose-a-password docker compose up -d
```

Enter this in the app under Sync, Add Storage:

| Field    | Value                                       |
| -------- | ------------------------------------------- |
| Address  | `http://localhost:8080`                     |
| User     | `mixtura`                                   |
| Password | the one you chose                           |
| Folder   | any name, for example `flat` (made for you) |

Press Test Connection; it should say "Connected". This address works only in
a browser on the machine that runs Docker. For a phone or another computer
the server needs HTTPS, see [below](#https-for-the-docker-server).

**Settings.** The user name is `mixtura` unless you set `WEBDAV_USER`, the
port `8080` unless you set `WEBDAV_PORT`. The port is published on `127.0.0.1`
only; to reach it from the network change the `ports` line of `compose.yaml`
after you have read the HTTPS section.

**Restrict the allowed origin.** By default the server accepts the hosted app
and any page on `localhost` or `127.0.0.1`. To allow only one address, give a
regular expression; for the hosted app alone:

```sh
ALLOWED_ORIGINS_REGEX='^https://mixtura[.]nexumia[.]de$' WEBDAV_PASSWORD=choose-a-password docker compose up -d
```

For your own copy of the app use its address instead, for example
`^https://drinks[.]example[.]org$`. Use `[.]` for each dot, and write the
whole expression with `^` and `$`. Run the command again with the new value;
Compose recreates the container.

**Where the data lives.** In the Docker volume `dav-data`, which Compose names
after the folder: `webdav-server_dav-data`. Each place is one encrypted file
`<folder>/<place code>.json` inside it.

**Back it up.** The files are ciphertext, so a copy is safe to keep anywhere.
Stop the server first if you want a copy that is certain to be consistent:

```sh
docker compose stop
```

Make the archive in the current folder:

```sh
docker run --rm -v webdav-server_dav-data:/data:ro -v "$PWD":/backup --entrypoint tar httpd:2.4.71 czf /backup/dav-backup.tgz -C /data .
```

Start the server again:

```sh
docker compose start
```

To restore, run `docker compose down`, then put the archive back into the
(new) volume:

```sh
docker run --rm -v webdav-server_dav-data:/data -v "$PWD":/backup --entrypoint tar httpd:2.4.71 xzf /backup/dav-backup.tgz -C /data
```

Then `docker compose up -d` as above. Your devices also keep the full stock
locally, so a lost server loses nothing that a device still has; the next sync
writes it again.

**Stop it.** `docker compose down` keeps the files; add `-v` to delete them.

### HTTPS for the Docker server

The Docker server answers plain HTTP. For a phone or another computer put a
web server with a certificate in front of it. Because this server already
answers CORS, the proxy only has to add HTTPS and pass everything on. With
Caddy, which fetches the certificate by itself, for a domain name that points
at your machine (ports 80 and 443 must reach it), the whole configuration is:

```caddyfile
dav.example.org {
	reverse_proxy 127.0.0.1:8080
}
```

nginx works the same way with `proxy_pass http://127.0.0.1:8080;` and your
certificate. This was **not tested**; the proxy adds no CORS headers of its own
here, because the server behind it sends them. Do not use the two fronts of the
next section for this: they are for servers that send no CORS headers and
would send a second copy.

## Option b: a web server in front of an existing WebDAV server

If you already have a WebDAV server (SabreDAV, `rclone serve webdav`, Apache,
a NAS, ...) that works with other WebDAV clients but sends no CORS headers, put
a web server in front of it that adds what is missing. It must:

- answer the preflight `OPTIONS` itself, without asking for a password;
- send `Access-Control-Allow-Origin` only for the allowed origin, never `*`
  (the app sends the password in a header, and a wildcard is not what you want
  next to one);
- send the allow headers and `Access-Control-Expose-Headers: ETag`, also on
  the `401`;
- pass `Authorization`, `If-Match` and `If-None-Match` and the methods `PUT`
  and `MKCOL` on to the server, and its `ETag` back;
- terminate HTTPS if the server is not on the same machine as the browser.

`tools/webdav-front/` has such a configuration for nginx and for Caddy, a
Compose file that starts either in front of a test WebDAV server, and a README.
Try it first:

```sh
cd mixtura/tools/webdav-front
```

```sh
WEBDAV_PASSWORD=choose-a-password docker compose --profile nginx up -d
```

Use `--profile caddy` for Caddy. nginx listens on `http://localhost:8090`, Caddy
on `http://localhost:8091`; user `mixtura` and your password, as above. To put
one in front of your own server, copy the file of your choice and change the
address of the server behind it (`BACKEND`). The allowed origins are
`ALLOWED_ORIGINS_REGEX`, a regular expression with `^` and `$`, as in option a.
Details and how to turn on HTTPS: [the README](../tools/webdav-front/README.md).

| Web server                                                     | Where                            | State                                                                                                                                                |
| -------------------------------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| nginx 1.30.6                                                   | `tools/webdav-front/nginx/`      | **tested** with Node adapter test and `curl`, see [below](#what-was-tested)                                                                          |
| Caddy 2.11.9                                                   | `tools/webdav-front/caddy/`      | **tested** with Node adapter test and `curl`, see [below](#what-was-tested)                                                                          |
| Apache 2.4 (the server of option a, and the spike's snippet)   | `tools/webdav-server/httpd.conf` | **tested**: tests of the app; the snippet on Nextcloud in the [spike](webdav-spike.md#from-the-browser-page-with-cors-headers-in-front-of-nextcloud) |
| HTTPS with a certificate (Caddy with a domain, nginx with TLS) | README of the fronts             | **untested**                                                                                                                                         |
| A front in front of a server other than Apache `mod_dav`       | -                                | **untested** (Nextcloud, SabreDAV, rclone, NAS)                                                                                                      |

### Apache

If the server you already run is Apache, add this to the virtual host or the
configuration (`mod_headers`, `mod_setenvif` and `mod_alias` must be loaded).
It is what the [spike](webdav-spike.md#from-the-browser-page-with-cors-headers-in-front-of-nextcloud)
used in front of Nextcloud and what `tools/webdav-server/httpd.conf` contains:

```apache
SetEnvIf Origin "^https://mixtura[.]nexumia[.]de$" MIXTURA_ORIGIN=$0
Header always set Access-Control-Allow-Origin "%{MIXTURA_ORIGIN}e" env=MIXTURA_ORIGIN
Header always set Access-Control-Allow-Methods "GET, PUT, MKCOL, PROPFIND, OPTIONS" env=MIXTURA_ORIGIN
Header always set Access-Control-Allow-Headers "Authorization, Content-Type, Depth, If-Match, If-None-Match" env=MIXTURA_ORIGIN
Header always set Access-Control-Expose-Headers "ETag" env=MIXTURA_ORIGIN
Header always set Access-Control-Max-Age "600" env=MIXTURA_ORIGIN
Header always merge Vary "Origin"
<If "%{REQUEST_METHOD} == 'OPTIONS' && -n req('Access-Control-Request-Method')">
    Redirect 204
</If>
```

Reload Apache afterwards. The `<If>` block is the part that matters most:
it answers the preflight before the server asks for a password.

## Option c: Nextcloud

Honest summary of the [spike](webdav-spike.md) (Nextcloud 31.0.14 from the
official Docker image, Chromium):

- **An unmodified Nextcloud cannot be used.** It answers the browser's
  preflight with `401` and no CORS header, so every request fails in the
  browser, with "blocked". No setting in the Nextcloud interface changes that.
- **With CORS headers added by the web server in front of Nextcloud it works**:
  reading, creating and conditional writes were seen to work from the page.
  Whoever runs the server (not a normal Nextcloud user) has to add the
  configuration of the Apache section, with the app's address as the origin,
  or the equivalent in the nginx or Caddy of their setup. The nginx and Caddy
  files of option b were **not tested in front of Nextcloud**. Hosted Nextcloud
  where you cannot change the web server will not work.
- **Nextcloud keeps the ETag when a file is written twice within one second**,
  so `If-Match` does not catch every simultaneous write there. The app merges
  stock record by record and keeps what every device has, so nothing is lost for
  good; two devices that write in the same second may need one more sync to
  agree.
- The address ends in `/remote.php/dav/files/` and your Nextcloud user name,
  followed by an existing folder. With two-factor sign-in enabled you generally
  need an app password from Nextcloud's security settings instead of your
  login password (general Nextcloud behaviour, not tested here).

If you do not already run Nextcloud, option a is much less work.

## What was tested

Run on 2026-11-18 on Linux with Docker, `curl` and Node. The backend of the
two fronts was the `httpd:2.4.71` server of option a started without any CORS
answer. Nobody tested with a real phone or with HTTPS.

| Front        | Checks done                                                                                                            | Browser test               |
| ------------ | ---------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| nginx 1.30.6 | `curl`: preflight, `401` with CORS headers, origin not allowed, no duplicate headers; the Node adapter test (10 tests) | `e2e/webdav.mjs` in headless Chromium at 360x720 and 1200x800: passed on 2026-11-18 |
| Caddy 2.11.9 | the same                                                                                                               | `e2e/webdav.mjs` in headless Chromium at 360x720 and 1200x800: passed on 2026-11-18 |

What the `curl` checks showed, for both: the preflight from the app's origin
without credentials is `204` with `Access-Control-Allow-Origin` (the origin),
`Allow-Methods`, `Allow-Headers`, `Expose-Headers: ETag` and `Max-Age`; a `GET`
without credentials is `401` with the same headers and `WWW-Authenticate`; an
origin that is not allowed gets no `Access-Control-` header; every header
appears once; with `ALLOWED_ORIGINS_REGEX` set to another origin only that one is
answered. The Node adapter test (`packages/app/test/sync-webdav-integration.test.ts`:
read, create, conflict, conditional write, folders, wrong password) passed
unchanged against both. It runs from Node, which sends no preflight, so it
proves that `If-Match`, `If-None-Match` and the `ETag` survive the proxy, and
`curl` proves the CORS answers; a real browser checks the two together, which
the pending browser test does. CI runs the Node test against both fronts on
every pull request.

## Troubleshooting

The app shows these texts under Sync (Test Connection, and the state line of a
place). The first two have a "Setup guide" link to this page.

| What the app says                                                                                                                                                              | What it means                                                                                                                                                                                         | What to change                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The storage did not answer in a way a browser may read, usually because it does not allow requests from this app (CORS). Check the address too.                                | The browser refused the answer, or got none. A page cannot tell these apart: missing CORS headers, an `http://` address from the hosted app, a wrong address and a server that is down look the same. | Check the address first (typos, port). Then: an `http://` address works only on `localhost` or `127.0.0.1`, use HTTPS otherwise. Then: the server must answer the preflight without a password and send `Access-Control-Allow-Origin` for `https://mixtura.nexumia.de` (options a to c). A certificate your browser does not trust also gives this text. |
| The storage answered, but the browser may not read its ETag header, which sync needs to avoid overwriting changes. The server has to send Access-Control-Expose-Headers: ETag. | The server allows the app but does not list `ETag` as readable.                                                                                                                                       | Add `Access-Control-Expose-Headers: ETag`. In the files of this repository it is one line in each; a proxy of your own must send it on the `GET` answer.                                                                                                                                                                                                 |
| The storage refused the user name or password. Check both and try again. (state line: The storage refused the sign-in)                                                         | `401` or `403`. The server is reachable and CORS works.                                                                                                                                               | Retype user and password. For the Docker server the user is `mixtura` and the password the one given as `WEBDAV_PASSWORD` when it was first created. For Nextcloud use an app password if two-factor sign-in is on.                                                                                                                                      |
| No connection. This device is offline; try again when it is online. (state line: Storage not reachable)                                                                        | The device reports that it is offline.                                                                                                                                                                | Connect the device and try again. If it is online and the server is down, the app shows the first text of this table instead.                                                                                                                                                                                                                            |
| The storage answered with an error. Check the address and that the folder exists. (state line: The storage answered with an error)                                             | The server answered with another error code, for example `404`, `405` or `500`, where a file was expected.                                                                                            | Check that the address points to a WebDAV folder (on Nextcloud it ends in `/remote.php/dav/files/<user>`). Look in the server log (`docker compose logs`).                                                                                                                                                                                               |
| The folder could not be found or made (state line)                                                                                                                             | The app tried to create the folder with `MKCOL` and the server refused.                                                                                                                               | Check the address and the rights of the user; create the folder by hand. The server must allow `MKCOL`.                                                                                                                                                                                                                                                  |
| The address has to start with https:// or http:// and have no spaces. (Add Storage)                                                                                            | The address field is not a web address.                                                                                                                                                               | Write the full address, for example `http://localhost:8080`.                                                                                                                                                                                                                                                                                             |
| Wrong passphrase, or the file was changed (state line)                                                                                                                         | The file in the storage could not be decrypted with the passphrase of this place.                                                                                                                     | Nothing to change in the server: check the passphrase of the place (Show Passphrase on the device that made it).                                                                                                                                                                                                                                         |

A quick way to see what the server answers, without the app, for the preflight:

```sh
curl -i -X OPTIONS -H 'Origin: https://mixtura.nexumia.de' -H 'Access-Control-Request-Method: PUT' -H 'Access-Control-Request-Headers: authorization,if-match' http://localhost:8080/
```

The answer should be `2xx` and contain the `Access-Control-` lines listed under
"What sync needs". Without them the app will say "blocked".
