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
Nothing third-party is bundled into the engine; the app bundles `ajv`
(see below). All other dependencies are development only and MIT or
Apache-2.0, compatible with it.

## Development only

| Package             | Version | Licence    | Use                                                                                             |
| ------------------- | ------- | ---------- | ----------------------------------------------------------------------------------------------- |
| `esbuild`           | 0.28.2  | MIT        | Bundling engine and app                                                                         |
| `typescript`        | 6.0.3   | Apache-2.0 | Type checking                                                                                   |
| `vitest`            | 5.1.0   | MIT        | Tests                                                                                           |
| `eslint`            | 10.14.0 | MIT        | Lint                                                                                            |
| `@eslint/js`        | 10.0.1  | MIT        | Lint rules                                                                                      |
| `typescript-eslint` | 8.72.2  | MIT        | Lint for TypeScript                                                                             |
| `globals`           | 17.14.0 | MIT        | Lint globals for scripts                                                                        |
| `prettier`          | 3.9.10  | MIT        | Formatting                                                                                      |
| `@types/node`       | 22.20.5 | MIT        | Types for tests and build scripts                                                               |
| `ajv`               | 8.17.1  | MIT        | Validates the JSON Schemas' examples in tests and the seed converter's output (root and engine) |
| `fake-indexeddb`    | 6.2.8   | Apache-2.0 | In-memory IndexedDB for the store tests (app, tests only, no dependencies)                      |
| `playwright`        | 1.65.0  | Apache-2.0 | End-to-end walk of the built app, icon rendering (same version as QuestArc)                     |

`ajv` (engine, tests only, not shipped) brings `fast-deep-equal` 3.1.3
(MIT), `fast-uri` 3.1.9 (BSD-3-Clause), `json-schema-traverse` 1.0.0 (MIT)
and `require-from-string` 2.0.2 (MIT); all read from their `package.json`
and licence files in `node_modules` and compatible with AGPL-3.0-or-later.

## Shipped in the app

| Package | Version | Licence | Use                                                                                                  |
| ------- | ------- | ------- | ---------------------------------------------------------------------------------------------------- |
| `ajv`   | 8.17.1  | MIT     | Validates every store write against the JSON Schemas ([store](store.md)); about 120 kB of the bundle |

`ajv` brings `fast-deep-equal`, `fast-uri` (BSD-3-Clause),
`json-schema-traverse` and `require-from-string`, licences as above. The
JSON Schemas name URLs as identifiers; they are never requested.
Considered instead: compiling validators at build time (more build
machinery for the same checks) and hand-written validators (would drift
from the schemas).

## GitHub Actions

| Action               | Version | Use                      |
| -------------------- | ------- | ------------------------ |
| `actions/checkout`   | v7.0.1  | Checkout in CI           |
| `actions/setup-node` | v7.1.0  | Node and npm cache in CI |

Both are pinned to a commit SHA in `.github/workflows/ci.yml`.

## Data

| Data                         | Source                                                                        | Licence | Use                                                                                                                                                                                                                                                         |
| ---------------------------- | ----------------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Seed recipes and ingredients | Bar Assistant public data, commit `5a504d4`, Copyright (c) 2026 Bar Assistant | MIT     | `packages/engine/data/seed/` made by `scripts/seed/`; names, tags, ingredients, amounts, units, method and glass only; images and texts not used; licence text shipped as `LICENSE-bar-assistant.txt`; attribution in [seed data](seed-data.md#attribution) |

## Data

- Bar Assistant public data (MIT), converted into `packages/engine/data/seed/`; attribution in [seed data](seed-data.md#attribution).
- Mixtura's own data (`packages/engine/data/mixtura/`, `data/template-variants/`, `data/alcohol-thresholds.json`): written for this project from [non-alcoholic](non-alcoholic.md), AGPL-3.0-or-later, no third-party data and no dependency; its notice is appended to the About text of the seed. No data from TheCocktailDB or FlavorDB.
