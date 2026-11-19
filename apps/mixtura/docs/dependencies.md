---
type: Reference
title: Dependencies
description: Every dependency of Mixtura with exact version, licence and use.
tags: [dependencies, licences]
generated: { by: claude-code/2.1.326, at: 2026-11-17 }
---

# Dependencies

Versions are pinned exactly in `package.json`; the lockfile pins the
rest. Licences read from each package's `package.json` in
`node_modules`. Mixtura itself is AGPL-3.0-or-later ([LICENSE](../LICENSE)).
Nothing third-party is bundled into the engine, and the app ships no
packages of its own except the two small run-time helpers that Ajv's
generated validators import and the QR encoder (see below). All dependencies are development only and MIT or
Apache-2.0, compatible with it.

## Shared code

| Package               | Version | Licence           | Use                                                                                                                                                                                          |
| --------------------- | ------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@nexumia-de/materia` | 0.2.0   | AGPL-3.0-or-later | The general model shared with Culina (ingredient tree, templates, specs, stock, shelf life); a git dependency of `@mixtura/engine`, bundled into `dist/engine.mjs`; no dependency of its own |

Licence read from its `LICENSE` and `package.json`; the same licence and
owner as Mixtura. Pinned by git reference in
`packages/engine/package.json`, the commit in the lockfile; npm builds
it on install with its `prepare` script
([decision](decisions/shared-model.md)).

## Development only

| Package             | Version | Licence    | Use                                                                                                                                           |
| ------------------- | ------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `esbuild`           | 0.28.2  | MIT        | Bundling engine and app                                                                                                                       |
| `typescript`        | 6.0.3   | Apache-2.0 | Type checking                                                                                                                                 |
| `vitest`            | 5.1.0   | MIT        | Tests                                                                                                                                         |
| `eslint`            | 10.14.0 | MIT        | Lint                                                                                                                                          |
| `@eslint/js`        | 10.0.1  | MIT        | Lint rules                                                                                                                                    |
| `typescript-eslint` | 8.72.2  | MIT        | Lint for TypeScript                                                                                                                           |
| `globals`           | 17.14.0 | MIT        | Lint globals for scripts                                                                                                                      |
| `prettier`          | 3.9.10  | MIT        | Formatting                                                                                                                                    |
| `@types/node`       | 22.20.5 | MIT        | Types for tests and build scripts                                                                                                             |
| `ajv`               | 8.17.1  | MIT        | Compiles the schemas to validators at build time (app `compile-schemas.mjs`); validates the examples in tests and the seed converter's output |
| `fake-indexeddb`    | 6.2.8   | Apache-2.0 | In-memory IndexedDB for the store tests (app, tests only, no dependencies)                                                                    |
| `playwright`        | 1.65.0  | Apache-2.0 | End-to-end walk of the built app, icon rendering (same version as QuestArc)                                                                   |

`ajv` (engine, tests only, not shipped) brings `fast-deep-equal` 3.1.3
(MIT), `fast-uri` 3.1.9 (BSD-3-Clause), `json-schema-traverse` 1.0.0 (MIT)
and `require-from-string` 2.0.2 (MIT); all read from their `package.json`
and licence files in `node_modules` and compatible with AGPL-3.0-or-later.

## Deploy time only

Not in `package.json` and not installed in the workspace: the deploy job
installs it from `tools/wrangler/package.json` (the one place its version is
pinned; Dependabot updates it).

| Package    | Version | Licence           | Use                                                                                                                                             |
| ---------- | ------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `wrangler` | 4.158.0 | MIT OR Apache-2.0 | Deploys `packages/app/dist` to Cloudflare Workers static assets (`wrangler.jsonc`, [deployment](deployment.md)); nothing of it ships in the app |

Licence read from `package.json` of the published 4.158.0 package
(`"license": "MIT OR Apache-2.0"`); the package has no licence file, the texts
are `LICENSE-MIT` and `LICENSE-APACHE` in the root of `cloudflare/workers-sdk`
(read on `main`). It is a tool that runs in CI and ships no code into the
app, so it does not touch the app's AGPL-3.0-or-later licence. Its own
dependencies (`workerd`, `miniflare`, `esbuild` and others) were not listed.

## Shipped in the app

| Package                           | Version | Licence | Use                                                                                                                                                                                                            |
| --------------------------------- | ------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ajv` (generated validators only) | 8.17.1  | MIT     | The validators that check every store write ([store](store.md)) are generated at build time; the bundle holds them plus Ajv's `equal` and `ucs2length` helpers (with `fast-deep-equal`, MIT), not the compiler |
| `qrcode-generator`                | 2.0.4   | MIT     | Draws the QR code of an invite link (`components/qr.ts`); no dependencies                                                                                                                                      |

Licence of `qrcode-generator` read from its files in `node_modules`: `package.json`
has `"license": "MIT"` and the header of `dist/qrcode.mjs` says "Licensed under the
MIT license" (Copyright (c) 2009 Kazuhiko Arase); the package has no separate licence
file and no `dependencies`. The build removes comments (`legalComments: 'none'`), so
`build.mjs` puts the notice back as the first line of `main.js`. Pinned exactly in `packages/app/package.json`.

The compiler, `fast-uri`, `json-schema-traverse` and `require-from-string`
are development only. The JSON Schemas name URLs as identifiers; they are
never requested. `main.js` went from 404,545 bytes (127,947 gzip) with
the run-time compiler to 356,585 (96,032 gzip) with generated validators;
hand-written validators were rejected (they would drift from the
schemas).

## Test and user server

Not in `package.json`, not shipped in the app: a container the tests start
and users can run ([sync backends](sync-backends.md#the-test-server)).

| Image                                                                                                     | Version | Licence      | Use                                                                                                                  |
| --------------------------------------------------------------------------------------------------------- | ------- | ------------ | -------------------------------------------------------------------------------------------------------------------- |
| `httpd` (Docker Official Image) `sha256:32e9403360ab2f1047523e72f256527fb9aee68b342abf6ad03f0d629157f3d9` | 2.4.71  | Apache-2.0   | WebDAV server with `mod_dav` for the integration test, `e2e/webdav.mjs` and the user setup in `tools/webdav-server/` |
| `nginx` (Docker Official Image) `sha256:42c68eab6f7e22611786a9fe1d1c019e275c50185bd54b8f75dc2b9184322703` | 1.30.6  | BSD-2-Clause | Reverse proxy that adds CORS, `tools/webdav-front/nginx/` (#141)                                                     |
| `caddy` (Docker Official Image) `sha256:4851e54a46b206517c574821bb5cc67f170d2156041e9fbc4c9193b45e84a75b` | 2.11.9  | Apache-2.0   | Reverse proxy that adds CORS, `tools/webdav-front/caddy/` (#141)                                                     |

Pinned by tag and digest in `tools/webdav-server/compose.yaml` (the digest is
the multi-platform index, `amd64` and `arm64` among others; Dependabot's
`docker-compose` entry updates both). Licence read from the header of
`include/httpd.h` inside the image ("The ASF licenses this file to You under
the Apache License, Version 2.0"; the image carries no `LICENSE` file). The
image is Debian 13 with its packages under their own licences; nothing of it
is copied into this repository or the app, the server is only run.

Why this one: the task named `httpd` with `mod_dav` as the candidate, it is
the server of the CORS configuration measured in the
[spike](webdav-spike.md), it needs no build step and no extra module, it
supports `MKCOL`, basic authentication, `If-Match` and `If-None-Match: *`,
and the official image has multi-platform builds. Its measured quirks (weak
ETag within a second of a write, no ETag on `PUT`) are listed in the
[spike](webdav-spike.md#the-test-server-httpd-with-mod_dav) and handled by the
adapter's documented limits. Other servers (nginx with its DAV module,
Caddy, SabreDAV, `rclone serve webdav`) were not run and are not ruled out;
the adapter works against anything that meets the
[list of requirements](sync-backends.md#what-a-backend-must-do).

The two reverse proxies of `tools/webdav-front/compose.yaml` (#141, [setup
guide](sync-setup.md#a-web-server-in-front-of-your-webdav-server)) are pinned
the same way, and `.github/dependabot.yml` has a `docker-compose` entry for
`/tools/webdav-front`; the `httpd` image there is the one of
`tools/webdav-server`, run as the plain backend (`BACKEND_ONLY=1`).

- **nginx 1.30.6**: licence read from `/usr/share/doc/nginx/copyright` inside
  the image: Igor Sysoev and Nginx, Inc., "Redistribution and use in source and
  binary forms, with or without modification, are permitted provided that"
  the two numbered conditions hold, which is the 2-clause BSD licence. The
  image is Debian 13 with its own packages; the configuration
  (`default.conf.template`) is ours.
- **Caddy 2.11.9**: the image's label `org.opencontainers.image.licenses` is
  `Apache-2.0`, and the `LICENSE` of the project's `v2.11.9` tag on GitHub
  starts "Apache License, Version 2.0" (the image carries no licence file).

Both are only run, nothing of them is copied into this repository or the
app. Why these two: they are what operators already run in front of other
services and they can be configured for exactly the CORS answers the adapter
needs ([setup guide](sync-setup.md#a-web-server-in-front-of-your-webdav-server)).

The adapter and the stores add no npm dependency.

## GitHub Actions

| Action                       | Version | Use                                                      |
| ---------------------------- | ------- | -------------------------------------------------------- |
| `actions/checkout`           | v7.0.1  | Checkout in CI                                           |
| `actions/setup-node`         | v7.1.0  | Node and npm cache in CI                                 |
| `actions/upload-artifact`    | v7.0.2  | Hands the build of `check` to the deploy job             |
| `actions/download-artifact`  | v8.0.2  | The deploy job takes that build                          |
| `cloudflare/wrangler-action` | v4.1.3  | Runs wrangler for the deploy job (licence not read here) |

All are pinned to a commit SHA in `.github/workflows/ci.yml`.

## Data

| Data                         | Source                                                                        | Licence | Use                                                                                                                                                                                                                                                         |
| ---------------------------- | ----------------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Seed recipes and ingredients | Bar Assistant public data, commit `5a504d4`, Copyright (c) 2026 Bar Assistant | MIT     | `packages/engine/data/seed/` made by `scripts/seed/`; names, tags, ingredients, amounts, units, method and glass only; images and texts not used; licence text shipped as `LICENSE-bar-assistant.txt`; attribution in [seed data](seed-data.md#attribution) |

## Data

- Bar Assistant public data (MIT), converted into `packages/engine/data/seed/`; attribution in [seed data](seed-data.md#attribution).
- Mixtura's own data (`packages/engine/data/mixtura/`, `data/template-variants/`, `data/alcohol-thresholds.json`): written for this project from [non-alcoholic](non-alcoholic.md), AGPL-3.0-or-later, no third-party data and no dependency; its notice is appended to the About text of the seed. No data from TheCocktailDB or FlavorDB.
