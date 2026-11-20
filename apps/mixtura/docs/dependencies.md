---
type: Reference
title: Dependencies
description: Every dependency of Mixtura with exact version, licence and use - the shared packages materia and hospes of the repository, development tools, what ships in the app, GitHub Actions and data; the QR encoder and the Docker images of the WebDAV test tools were removed on 2026-11-20.
tags: [dependencies, licences]
generated: { by: claude-code/2.1.326, at: 2026-11-17 }
---

# Dependencies

Versions are pinned exactly in `package.json`; the lockfile pins the
rest. Licences read from each package's `package.json` in
`node_modules`. Mixtura itself is AGPL-3.0-or-later ([LICENSE](../../../LICENSE)).
Nothing third-party is bundled into the engine, and the app ships no
packages of its own except the two small run-time helpers that Ajv's
generated validators import (see below). All third-party dependencies are development only and MIT or
Apache-2.0, compatible with it.

## Shared code

| Package               | Version | Licence           | Use                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------------- | ------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@nexumia-de/materia` | 0.3.0   | AGPL-3.0-or-later | The general model shared with Culina (ingredient tree, templates, specs, shelf life, the pure rules of sync); `packages/model` of this repository, a dependency of `@mixtura/engine`, bundled into `dist/engine.mjs`; no dependency of its own                                                                                                                                                                                                   |
| `@nexumia-de/hospes`  | 0.1.0   | AGPL-3.0-or-later | The host code the apps share; `packages/host` of this repository, a dependency of `@mixtura/app`, bundled into `main.js`. Mixtura uses: the store of spaces and their collections (`createIdbStore`, `localChange`), the space on this device only (`ensureSpace`, `isDeviceOnly`), the cycle (`syncCollection`, `deriveSpace`), the loop (`createSyncLoop`), the adapter of a storage (`adapterFor`), and the base64 helpers for the share link |

Both are workspaces of the repository with the same licence and owner as
Mixtura; the version in `package.json` names the workspace, there is no tag
to wait for ([decision](decisions/shared-model.md),
[one repository](../../../docs/decisions/one-repository.md)). Until
2026-11-19 materia was a git dependency built by its `prepare` script.
hospes depends on materia only. Until 2026-11-20 Mixtura used the cipher
and the WebDAV adapter of hospes directly in a sync of its own; now it
uses spaces, the cycle and the loop, and no cipher or adapter by name.

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

The QR encoder `qrcode-generator` (2.0.4, MIT) drew the QR code of an invite
link. It was removed on 2026-11-20 with Mixtura's own sync; invites are the
Household app's.

The compiler, `fast-uri`, `json-schema-traverse` and `require-from-string`
are development only. The JSON Schemas name URLs as identifiers; they are
never requested. `main.js` went from 404,545 bytes (127,947 gzip) with
the run-time compiler to 356,585 (96,032 gzip) with generated validators;
hand-written validators were rejected (they would drift from the
schemas).

## Removed: test and user server

Until 2026-11-20 the Docker images `httpd` 2.4.71, `nginx` 1.30.6 and
`caddy` 2.11.9 were pinned for `tools/webdav-server` and
`tools/webdav-front` (a WebDAV server for the integration test and for
users, and two reverse proxies that add CORS). Both folders, their
Dependabot entries and the CI job were removed with Mixtura's own sync
([stock in spaces](decisions/stock-in-spaces.md#what-is-lost)); they are in
the history. What was measured with them is in the
[spike](webdav-spike.md) and in the
[WebDAV adapter](../../../packages/host/docs/webdav.md) of the host
package.

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
