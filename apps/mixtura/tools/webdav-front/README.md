# CORS in front of a WebDAV server

A browser page may only use a WebDAV server that answers CORS: the preflight
without credentials, `Access-Control-Allow-Origin` for the app's address, the
`ETag` header exposed. Many WebDAV servers do not. These are minimal reverse
proxies, one for nginx and one for Caddy, that add exactly that in front of a
server that does not. The guide for users, with the other options:
[Set up storage for sync](../../docs/sync-setup.md).

You need Docker with Compose.

## Try it

The Compose file starts a WebDAV server (the `httpd` of
[`tools/webdav-server`](../webdav-server/), started with `BACKEND_ONLY=1` so it
sends no CORS headers at all, and not published) and the proxy you choose in
front of it:

```sh
WEBDAV_PASSWORD=choose-a-password docker compose --profile nginx up -d
```

```sh
WEBDAV_PASSWORD=choose-a-password docker compose --profile caddy up -d
```

nginx listens on `http://localhost:8090` (`NGINX_PORT`), Caddy on
`http://localhost:8091` (`CADDY_PORT`), both on `127.0.0.1` only. In the app:
that address, user `mixtura` (`WEBDAV_USER`) and your password. The files are in
the Docker volume `dav-data`. Stop with `docker compose --profile nginx --profile caddy down`;
add `-v` to delete the files.

## Settings

| Variable                | Default                                                | Meaning                                                               |
| ----------------------- | ------------------------------------------------------ | --------------------------------------------------------------------- |
| `WEBDAV_PASSWORD`       | none, required                                         | Password of the test backend's one user                               |
| `ALLOWED_ORIGINS_REGEX` | the hosted app and any `localhost` or `127.0.0.1` page | Regular expression, with `^` and `$`, of the origins that may call it |

An origin that matches gets `Access-Control-Allow-Origin` with its own value;
any other gets no `Access-Control-` header. The value is never `*`, and
`Access-Control-Allow-Credentials` is never sent: the app puts the password in
the `Authorization` header and uses no cookies. Write each dot as `[.]`. For a
copy of the app you host yourself, for example
`^https://drinks[.]example[.]org$`.

## In front of your own server

Copy the file of your choice and replace the backend. The two things to change
are the address behind the proxy and the allowed origins.

- `nginx/default.conf.template` is an nginx configuration with two placeholders
  that the official image fills in from the environment (`ALLOWED_ORIGINS_REGEX`,
  `BACKEND`, for example `https://nas.local:5006`). Outside Docker, replace
  both by hand, and mind that nginx needs `proxy_ssl_verify` settings for an
  `https` backend with its own certificate.
- `caddy/Caddyfile` reads `ALLOWED_ORIGINS_REGEX`, `BACKEND` (`host:port`) and
  `SITE_ADDRESS` from the environment. With `:80` it serves plain HTTP; with
  a domain name, for example `SITE_ADDRESS=dav.example.org`, Caddy fetches a
  certificate and serves HTTPS, which a phone or another computer needs
  (the hosted app reaches `http` only on `localhost`). Ports 80 and 443 then
  have to reach the container, so change the `ports` of `compose.yaml`.
  This HTTPS path was **not tested**. For nginx, add `listen 443 ssl;` and
  your certificate to the `server` block (**not tested**).

What the configurations do, for both:

- answer the preflight (`OPTIONS` with `Access-Control-Request-Method`) with
  `204`, before and without any password;
- send `Access-Control-Allow-Methods` `GET, PUT, MKCOL, OPTIONS` and
  `Access-Control-Allow-Headers` `Authorization, Content-Type, If-Match,
If-None-Match`: the methods and headers `packages/host/src/webdav.ts`
  sends, and nothing else;
- send `Access-Control-Expose-Headers: ETag`, and the same headers on the
  `401`, `404` and `412` answers the backend produces;
- replace any CORS headers of the backend, so there is never a second copy;
- pass `Authorization`, `If-Match`, `If-None-Match`, the method and the body on,
  and the backend's `ETag` back, unchanged.

They do not change a server whose own behaviour is wrong (no `If-Match`, no
`ETag`): the app then cannot sync safely, and no proxy fixes that.

## Files

- `compose.yaml`: the backend and the two proxies, images pinned by tag and
  digest.
- `nginx/default.conf.template`, `caddy/Caddyfile`: the configurations.
