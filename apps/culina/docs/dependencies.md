---
type: Reference
title: Dependencies
description: Every dependency of Culina with exact version, licence and use.
tags: [dependencies, licences]
generated: { by: claude-code/2.1.326, at: 2026-11-18 }
---

# Dependencies

Versions are pinned exactly in `package.json` and equal Mixtura's, so
both repositories stay aligned; the lockfile pins the rest. Licences read
from each package's `package.json` in `node_modules`. Culina itself is
AGPL-3.0-or-later ([LICENSE](../LICENSE)). The only runtime dependency
is materia, the owner's own shared code under the same licence; all
others are development only and MIT or Apache-2.0, compatible with it.

## Runtime

| Package               | Version | Licence           | Use                                                                                                                                                                                                                                                   |
| --------------------- | ------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@nexumia-de/materia` | 0.2.0   | AGPL-3.0-or-later | The general model shared with Mixtura (ingredient tree, templates, specs, stock, shelf life, sync formats); a git dependency of `@culina/engine` at tag `v0.2.0` (commit `588d744`); no dependency of its own ([decision](decisions/shared-model.md)) |

Licence read from `LICENSE` and `package.json` in
`node_modules/@nexumia-de/materia`. Its tag is raised by hand (the owner
sets tags in materia); Dependabot does not follow git tags of this form.

## Development only

| Package             | Version | Licence    | Use                                                                                                     |
| ------------------- | ------- | ---------- | ------------------------------------------------------------------------------------------------------- |
| `typescript`        | 6.0.3   | Apache-2.0 | Type checking                                                                                           |
| `vitest`            | 5.1.0   | MIT        | Tests                                                                                                   |
| `eslint`            | 10.14.0 | MIT        | Lint                                                                                                    |
| `@eslint/js`        | 10.0.1  | MIT        | Lint rules                                                                                              |
| `typescript-eslint` | 8.72.2  | MIT        | Lint for TypeScript                                                                                     |
| `globals`           | 17.14.0 | MIT        | Lint globals for scripts                                                                                |
| `ajv`               | 8.17.1  | MIT        | JSON Schema 2020-12 validation in schema tests (same version as Mixtura)                                |
| `fake-indexeddb`    | 6.2.8   | Apache-2.0 | IndexedDB in the store's unit tests (the app package; same version as Mixtura)                          |
| `prettier`          | 3.9.10  | MIT        | Formatting                                                                                              |
| `@types/node`       | 22.20.5 | MIT        | Types for tests (Node 22 in CI)                                                                         |
| `esbuild`           | 0.28.2  | MIT        | Builds the app bundle, stylesheet and service worker (same version as Mixtura)                          |
| `playwright`        | 1.65.0  | Apache-2.0 | Browser tests, screenshots and PNG icons; the library, not `@playwright/test` (same version as Mixtura) |

Licences of `esbuild` and `playwright` read on 2026-11-18 from `node_modules`:
`esbuild/package.json` says MIT and `LICENSE.md` is the MIT text;
`playwright/package.json` and `playwright-core/package.json` say
Apache-2.0 and `LICENSE` is the Apache License 2.0 text. `playwright-core`
(same version, Apache-2.0) comes with `playwright`. Both are used for
building and testing only; neither is shipped in the app. Playwright's
browser is not an npm dependency: CI installs it with
`npx playwright install --with-deps chromium`; in a container with a
Chromium already present set `PLAYWRIGHT_CHROMIUM_PATH` to its binary.
The app has no runtime dependency apart from the engine: no framework, no
web font, no CDN.

Licence of `fake-indexeddb` read on 2026-11-18 from
`node_modules/fake-indexeddb`: `package.json` says Apache-2.0 and `LICENSE`
is the Apache License 2.0 text. Used in tests only.

**`ajv` also ships, in part.** Besides validating in tests, Ajv 8.17.1
(MIT; `package.json` and `LICENSE` read on 2026-11-18) generates the
store's validators at build time (`packages/app/compile-schemas.mjs`,
standalone code). The generated code imports two small runtime helpers,
`ajv/dist/runtime/equal` (which uses `fast-deep-equal` 3.1.3, MIT) and
`ajv/dist/runtime/ucs2length`, and esbuild puts them into `main.js`. The
Ajv compiler itself does not ship. Both are MIT, compatible with the
AGPL. Size: see the [log](log.md).

## GitHub Actions

| Action               | Version | Use                      |
| -------------------- | ------- | ------------------------ |
| `actions/checkout`   | v7.0.1  | Checkout in CI           |
| `actions/setup-node` | v7.1.0  | Node and npm cache in CI |

Both are pinned to a commit SHA in `.github/workflows/ci.yml`.
