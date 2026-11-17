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
package of its own except the two small run-time helpers that Ajv's
generated validators import (see below). All dependencies are development only and MIT or
Apache-2.0, compatible with it.

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

The compiler, `fast-uri`, `json-schema-traverse` and `require-from-string`
are development only. The JSON Schemas name URLs as identifiers; they are
never requested. `main.js` went from 404,545 bytes (127,947 gzip) with
the run-time compiler to 356,585 (96,032 gzip) with generated validators;
hand-written validators were rejected (they would drift from the
schemas).

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
