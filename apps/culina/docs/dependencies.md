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
AGPL-3.0-or-later ([LICENSE](../LICENSE)). The runtime dependencies
are materia and hospes, the owner's own shared code under the same licence; all
others are development only and MIT or Apache-2.0, compatible with it.

## Runtime

| Package               | Version | Licence           | Use                                                                                                                                                                                                                                                                           |
| --------------------- | ------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@nexumia-de/materia` | 0.2.0   | AGPL-3.0-or-later | The general model shared with Mixtura (ingredient tree, templates, specs, stock, shelf life, sync formats); a git dependency of `@culina/engine` at tag `v0.2.0` (commit `588d744`); no dependency of its own ([decision](decisions/shared-model.md))                         |
| `@nexumia-de/hospes`  | 0.1.0   | AGPL-3.0-or-later | The host code of the repository (`packages/host`, a workspace package, linked by `npm install`): spaces, the shared database `domus`, the sync cycle and loop and the storage adapters, used for stock ([decision](decisions/stock-in-spaces.md)); it depends on materia only |

Licence read from `LICENSE` and `package.json` in
`node_modules/@nexumia-de/materia`. Its tag is raised by hand (the owner
sets tags in materia); Dependabot does not follow git tags of this form.

## Native Linux app

`packages/linux` (`@culina/linux`) adds no dependency of its own. Its
bundle contains what the web app uses (the engine, materia, hospes, Ajv's
two helpers) and what the other native apps bundle:
`@noble/ciphers` and `@noble/hashes` 2.4.0 (MIT, through
`@nexumia-de/gjs`, [dependencies](../../../packages/gjs/docs/dependencies.md)).
It runs on GJS, GTK 4, libadwaita and libsoup 3 of the GNOME runtime
(LGPL), which it uses and does not ship. The data compiled into the bundle
is the one listed under Data below; its notice is installed as
`/app/share/licenses/de.nexumia.Culina/culina-data/NOTICE`
([native app](native-linux.md#packaging)).

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

## Data

| Data                                                                                                                                                                                                                 | Release                                                        | Licence                                                                                                                            | Use                                                                                                                                                |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| FlavorDB, entities as JSON from the entity pages (`entities_json?id=0` to `978`; the 79 MB of raw files are not committed), derived file `packages/app/data/flavour-pairings.json` (committed, 606 kB)               | Fetched 2026-11-23                                             | CC BY-NC-SA 3.0 Unported (the site's footer and FAQ); the derived file keeps that licence and names source, paper and changes      | Pairings on the dish screen ([decision](decisions/flavordb.md)), built by `tools/flavordb/`                                                        |
| The project's links from the catalogue to FlavorDB's entities, `packages/app/data/flavour-links.json` (committed), from the rule of `tools/flavordb/link.mjs` and the corrections of `tools/flavordb/links-own.json` | Written 2026-11-23                                             | AGPL-3.0-or-later (the licence of this repository)                                                                                 | Which entity stands for an ingredient; a judgement, each correction with its reason                                                                |
| USDA FoodData Central, SR Legacy (JSON, not committed)                                                                                                                                                               | April 2018, `FoodData_Central_sr_legacy_food_json_2018-04.zip` | CC0 1.0 Universal, public domain                                                                                                   | Source of the ingredient catalogue (`packages/app/data/ingredient-catalogue.json`), generated by `tools/catalogue/build.mjs`                       |
| USDA FoodData Central, SR Legacy archive SR28 ASCII, file `FOOD_DES.txt` (not committed)                                                                                                                             | SR28 (2015), `SR-Legacy-Archive/sr28asc.zip`                   | CC0 1.0 Universal, public domain (the site's licence statement for FoodData Central data; the archive page states none of its own) | Refuse percentages for the yields of the ingredient catalogue, read by `tools/catalogue/build.mjs`                                                 |
| Wikidata, German labels and aliases by USDA NDB number (P1978), trimmed snapshot `tools/catalogue/wikidata-de.json` (committed, 66 kB)                                                                               | Queried 2026-11-19                                             | CC0 1.0 Universal (Wikidata:Licensing: all structured data is CC0)                                                                 | German names of the ingredient catalogue, read by `tools/catalogue/build.mjs` (the generator does not call the network)                            |
| The project's own German names, `tools/catalogue/names-de-own.json` (committed; a translation of the USDA descriptions by the project, 2026-11-19)                                                                   | Written 2026-11-19                                             | AGPL-3.0-or-later (the licence of this repository)                                                                                 | German names of the 517 catalogue entries Wikidata has no name for, merged by `tools/catalogue/build.mjs` or `tools/catalogue/merge-own-names.mjs` |

Licence read on `https://fdc.nal.usda.gov/` (section Licensing) on
2026-11-18: public domain, published under CC0 1.0 Universal; no
permission needed, listing FoodData Central as the source is requested,
and the catalogue does so. The raw dataset is never committed; the
generator needs only Node. Wikidata: licence read on
`https://www.wikidata.org/wiki/Wikidata:Licensing` on 2026-11-18 ("All data in
Wikidata has a CC0 license"); no attribution is required, the catalogue's
envelope and every name's `source` name it anyway. Details:
[ingredient catalogue](ingredient-catalogue.md).

## Deploy tool

Not installed by `npm ci`: the job `deploy` runs it with `npx`, at the
version pinned in `tools/wrangler/package.json` (the same as Mixtura's).

| Package    | Version | Licence           | Use                                                                                                                |
| ---------- | ------- | ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| `wrangler` | 4.158.0 | MIT OR Apache-2.0 | Uploads `packages/app/dist` to Cloudflare Workers static assets ([deployment](deployment.md)); nothing of it ships |

Licence read on 2026-11-18 from `wrangler/package.json` in the npx cache.
It is a tool that runs in CI, not linked into the app.

## GitHub Actions

| Action               | Version | Use                      |
| -------------------- | ------- | ------------------------ |
| `actions/checkout`   | v7.0.1  | Checkout in CI           |
| `actions/setup-node` | v7.1.0  | Node and npm cache in CI |

Both are pinned to a commit SHA in `.github/workflows/ci.yml`.
