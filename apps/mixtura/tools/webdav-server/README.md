# WebDAV server for Mixtura

A small WebDAV server (Apache `httpd` with `mod_dav`) that answers what a
browser page needs, so Drink Builder can keep an encrypted copy of a place's
stock on it. The same setup runs in Mixtura's tests. Background and the
reasons for each setting: [sync backends](../../docs/sync-backends.md).

You need Docker with Compose.

## Start it

In this folder, with a password of your choice:

```sh
WEBDAV_PASSWORD=choose-a-password docker compose up -d
```

The files are kept in the Docker volume `dav-data`. The user name is
`mixtura` unless you set `WEBDAV_USER`; the port is `8080` unless you set
`WEBDAV_PORT`.

## Enter it in the app

| Field    | Value                                       |
| -------- | ------------------------------------------- |
| Address  | `http://localhost:8080`                     |
| User     | `mixtura`                                   |
| Password | the one you chose                           |
| Folder   | any name, for example `flat` (made for you) |

The hosted app (`https://mixtura.nexumia.de`) is an `https` page, and a
browser only lets it call an `http` address on the same machine
(`localhost` or `127.0.0.1`). To reach the server from your phone or from
another computer, put it behind a reverse proxy that serves `https`, and
enter that address. The app encrypts the stock before it leaves the device,
so the server only ever holds ciphertext, but use `https` anyway so the
user name and password are not sent in the clear.

## Settings

| Variable                | Default                                                | Meaning                                                         |
| ----------------------- | ------------------------------------------------------ | --------------------------------------------------------------- |
| `WEBDAV_PASSWORD`       | none, required                                         | Password of the one user                                        |
| `WEBDAV_USER`           | `mixtura`                                              | User name                                                       |
| `WEBDAV_PORT`           | `8080`                                                 | Port on this machine                                            |
| `ALLOWED_ORIGINS_REGEX` | the hosted app and any `localhost` or `127.0.0.1` page | Regular expression of the page origins that may call the server |

The port is published on `127.0.0.1` only. To publish it on the network,
change the `ports` line of `compose.yaml` (and read the `https` paragraph
above first). For a copy of the app you host yourself, add its origin to
`ALLOWED_ORIGINS_REGEX`, for example
`^https://drinks[.]example[.]org$`.

## Stop it

```sh
docker compose down
```

Add `-v` to delete the stored files as well.

## A second server (tests)

The end-to-end test of sync needs two storages. The Compose file has a second,
independent service that is only started on request:

```sh
WEBDAV_PASSWORD=choose-a-password docker compose --profile second up -d
```

It listens on port `8081` (`WEBDAV_PORT_2`) and keeps its files in the volume
`dav-data-2`. `docker compose down -v` needs the same `--profile second` to
remove it too.

`httpd.conf` and `entrypoint.sh` are mounted as single files. An editor that
replaces a file instead of changing it leaves the container looking at the old
one; after editing either, recreate the containers with
`docker compose up -d --force-recreate`.

## Without CORS answers

`BACKEND_ONLY=1` starts Apache with `-DNO_CORS`: no CORS header and no
preflight answer, a plain WebDAV server. It is the test backend of the nginx
and Caddy fronts in [`tools/webdav-front`](../webdav-front/); without the
variable nothing changes. The step-by-step guide for users, with HTTPS and
backups: [Set up storage for sync](../../docs/sync-setup.md).

## Files

- `compose.yaml`: the service, with the image pinned by digest.
- `httpd.conf`: the whole server configuration.
- `entrypoint.sh`: makes the user and the folders, then starts Apache.
