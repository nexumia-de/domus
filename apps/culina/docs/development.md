---
type: Guide
title: Development
description: Setup, commands, layout and the engine's purity rule for Culina, the CI job name, and the network hosts the research needed.
tags: [development, tooling, ci, network]
generated: { by: claude-code/2.1.326, at: 2026-11-17 }
---

# Development

Tooling mirrors the sister repository Mixtura. The engine gets the
general model from materia ([decision](decisions/shared-model.md)); the
kitchen rules and the app are added issue by issue.

## Setup

Node 22 (`.nvmrc`, `engines.node` `>=22.12.0`), then:

```sh
npm ci
```

`npm ci` fetches `@nexumia-de/materia` from `github.com` at the commit in
the lockfile and builds it with its `prepare` script (esbuild and
TypeScript, installed for that build only).

## Commands

| Command                | What it does                                                        |
| ---------------------- | ------------------------------------------------------------------- |
| `npm run check`        | format check, lint, typecheck, tests, in that order; stops at error |
| `npm run format`       | Prettier writes all files                                           |
| `npm run format:check` | Prettier checks all files                                           |
| `npm run lint`         | ESLint (flat config, typescript-eslint, purity rule for the engine) |
| `npm run typecheck`    | `tsc --noEmit` in both packages                                     |
| `npm test`             | vitest in both packages (the app tests build `dist/` first)         |
| `npm run build`        | esbuild writes `packages/app/dist/`                                 |
| `npm run e2e`          | builds, serves `dist/` and runs the Playwright checks in Chromium   |

## Layout

- `packages/engine` (`@culina/engine`): the pure engine. `src/index.ts` is
  its only public entry; the package exports the TypeScript file
  directly, so there is no build step. Add one when the app needs a
  bundle. `src/model.ts` re-exports the general model from materia;
  `test/model.test.ts` checks that the dependency is an exact version
  tag and that the installed version is that one.
- Engine modules, one job per file: `src/amounts/` (types, unit table
  reader, conversion, rounding), `src/scale/` (scaling by weight and the
  cautions), `src/bakers/` (baker's percentages, formulas, hydration),
  `src/ratios/` (ratio templates: types, resolution, family queries,
  range check, scaling from an anchor, percentages, seed),
  `src/salt/` (salt by basis), `src/components/` (line grams, expansion,
  yield and loss, portions, flour and water of an expansion),
  `src/yields/` (edible portion), `src/validate/` (cross-record
  validation: types, the entry `model.ts`, one file per kind with
  references, an id-only cycle walk, version references); `data/units.json` is the unit table and
  `data/templates.json` the seed templates; `vectors/units/`,
  `vectors/percentages/`, `vectors/ratios/templates/`, `vectors/ratios/salt/`, `vectors/components/` and `vectors/validate/` hold
  the worked examples that `test/units-vectors.test.ts`,
  `test/percentages-vectors.test.ts`, `test/templates-vectors.test.ts` and
  `test/salt-vectors.test.ts`, `test/components-vectors.test.ts` and `test/validate-vectors.test.ts` run;
  `test/ratios.test.ts` has the unit tests and the seed checks,
  `test/components.test.ts` and `test/components-property.test.ts` those of
  components, `test/validate.test.ts` those of validation.
  Rules: [engine rules](engine-rules.md).
- `packages/app` (`@culina/app`): the web app (PWA shell, [behaviour](behaviour.md),
  [design](design.md)). It imports `@culina/engine` only; a lint rule fails any
  deep import. Layout, one job per file: `build.mjs` (esbuild; writes `dist/`
  with fixed names `index.html`, `main.js`, `theme-init.js`, `app.css`,
  `manifest.webmanifest`, `icons/`, `sw.js`), `src/main.ts` (start),
  `src/router.ts` (hash router), `src/prefs.ts` (theme in `localStorage`),
  `src/theme-init.ts`, `src/sw-register.ts`, `src/sw.ts`, `src/strings.ts`
  (all visible texts), `src/engine-info.ts` (the app's one use of the
  engine), `src/shell/` (landmarks, navigation, toast), `src/screens/` (screens and their
  parts), `src/shared/` (number entry, mass display, search), `src/notebook/` (the in-memory notebook over the store: reads, writes, drafts, example data), `src/editor/` (form state of the editors, without DOM), `src/ratios/`,
  `src/components/` and `src/dishes/` (view logic without DOM), `src/demo/`
  (the example records as plain data), `src/records.ts` (record types), `src/styles/` (`tokens.css` and token-only stylesheets),
  `src/icons/` (navigation icons), `src/assets/` (app icons: SVG and PNG),
  `scripts/make-icons.mjs` (`npm run icons -w @culina/app`, rasterises the SVGs),
  `test/` (vitest), `e2e/` (Playwright scripts, below).
- `tsconfig.base.json` (strict) is extended by one `tsconfig.json` per package.
- Every dependency is pinned exactly and equals Mixtura's version; see
  [dependencies](dependencies.md).

## The engine is pure

`packages/engine/src/**` may not use the clock (`Date`, `performance`),
randomness (`Math.random`, `crypto`), `console`, DOM or host globals
(`window`, `document`, `navigator`, `indexedDB`, `fetch`, `localStorage`,
`process`) or import from `packages/app`; time and random numbers come in
as input. ESLint enforces it in `eslint.config.js`;
`packages/engine/test/purity.test.ts` lints sources that must fail, so
the rule cannot be removed silently.

## App build, service worker and tests

`npm run build` bundles with esbuild (no framework). The build injects into
`sw.js` the exact list of built files and a cache name `culina-<hash of
their content>`; `activate` deletes the caches of other versions. Register
only over http(s) and not with `?no-sw` on the page URL. Serve `dist/` from
`localhost` (a service worker needs `localhost` or HTTPS): `npm run e2e`
does it with `e2e/serve.mjs` (`node:http`, free port, optional sub-path).
All URLs are relative, so a sub-path works.

**Generated validators.** The strict Content Security Policy forbids `eval`,
so Ajv cannot compile schemas in the browser.
`packages/app/compile-schemas.mjs` compiles the schemas of
`packages/engine/schemas/` with Ajv's standalone code into
`src/store/validators.generated.js` (and a `.d.ts`), git-ignored,
ESM. It runs as `pretest`, `pretypecheck` and at the start of `build.mjs`.
esbuild bundles the two Ajv runtime helpers the code imports.

**E2E hook of the store.** `e2e/store.mjs` and `e2e/editor.mjs` open the
app with `?e2e-store` to read and write the store directly; `src/main.ts` then loads `src/store/e2e-hook.ts`,
which puts the opened store, as a promise, on `globalThis.__culinaStore`.
Without that query nothing is exposed and the store is not opened. The
test also changes the cache version in `dist/sw.js` to simulate an update
and restores the file afterwards.

Unit tests (`npm test -w @culina/app`, in `npm run check`): router,
preferences, tokens-only rule, contrast of every token pair in both
themes (also compared with the table in [design](design.md)), strings,
manifest and `index.html` (installability fields, strict Content
Security Policy), build output, the service worker run against fake
caches, service worker registration, and the engine entry point, and the local store with a fake IndexedDB
(`test/store*.test.ts`, fixtures in `test/fixtures/store/`).

`npm run e2e` is a separate script (it launches Chromium and takes
longer). It builds, serves `dist/` twice (at `/` and under `/apps/cook/`)
and runs `e2e/components.mjs` (component and dish screens: lists, search, amounts against numbers computed by the engine through `e2e/notebook-fixture.mjs`, portions, nesting and back, open slots, 360 px overflow, targets, offline), `e2e/ratios.mjs` (ratio list, cards, calculator against vector-derived amounts, comparison, 360 px overflow of every card, desktop list beside the card, offline) and `e2e/smoke.mjs` (shell at 320, 360 and 1000 px, navigation
placement, no horizontal scroll on every screen, targets of at least 44 x
44 px, landmarks and names, keyboard and focus, theme switch and reload,
offline reload with the service worker controlling the page, no console
error, no CSP violation, no request to another origin) and
`e2e/install.mjs` (installability table, in [behaviour](behaviour.md#installability-check))
and `e2e/store.mjs` (records survive a reload and a service worker update, no foreign request).
Chromium comes from `PLAYWRIGHT_CHROMIUM_PATH` when that variable is set,
otherwise from Playwright (`npx playwright install chromium`).
`npm run screenshots -w @culina/app` rewrites `docs/screenshots/`.

## CI

`.github/workflows/ci.yml` runs `npm ci` and `npm run check` on pull
requests and pushes to `main` in the job `check`, as in Mixtura. A second
job, `e2e`, needs `check`, installs Chromium with
`npx playwright install --with-deps chromium` and runs `npm run e2e`.
`e2e` is a **second status check name** for a branch-protection ruleset:
add it next to `check` when the ruleset is imported (the repository has
no `.github/rulesets/` file yet). Actions are pinned to a
commit SHA; Dependabot updates npm and GitHub Actions weekly
(`.github/dependabot.yml`).

A third job, `deploy`, needs both, runs only for a push to `main` and
uploads the build to the host ([deployment](deployment.md)). It is skipped
on pull requests and is not a required check. Host read for it on
2026-11-18 and reachable from the session:

```
developers.cloudflare.com
```

`culina.nexumia.de` is reachable from the session since 2026-11-18.
Refused by the session proxy, and not needed so far:

```
api.cloudflare.com
```

# Network hosts

Needed to check the facts in [existing tools and data](existing-tools.md);
reachable on 2026-11-16:

```
mealie.io
docs.mealie.io
docs.tandoor.dev
grocy.info
cooklang.org
world.openfoodfacts.org
cosylab.iiitd.edu.in
apps.gnome.org
```

`docs.mealie.io` only redirects to `mealie.io`. Two hosts stay
unreachable although allowed: `docs.cooklang.org` (502) and `foodb.ca`
(answers automated requests with 403), so Cooklang's documentation was
read from its GitHub repositories and FooDB's licence stays unverified.

## Ratio check and Cooklang decision (2026-11-17)

Needed for [ratios](ratios.md) and the [Cooklang record](decisions/cooklang.md).
Reachable and used:

```
nchfp.uga.edu
www.fda.gov
pubmed.ncbi.nlm.nih.gov
pmc.ncbi.nlm.nih.gov
eutils.ncbi.nlm.nih.gov
cooklang.org
registry.npmjs.org
mealie.io
docs.tandoor.dev
```

Blocked (proxy refused the tunnel, tested with
`curl -sS -m 15 -o /dev/null https://<host>/`):

```
www.kingarthurbaking.com
www.fsis.usda.gov
www.usda.gov
ars.usda.gov
schema.org
ruhlman.com
www.americastestkitchen.com
www.seriouseats.com
www.npr.org
www.simonandschuster.com
en.wikipedia.org
archive.org
web.archive.org
books.google.com
legislation.gov.uk
developers.google.com
extension.oregonstate.edu
hgic.clemson.edu
ucanr.edu
```

`eur-lex.europa.eu` answers with 202 and an empty body (a bot check), so
EU regulations could not be read either. `docs.cooklang.org` still
answers 502. Values from blocked hosts were taken only from search
excerpts and are marked so in [ratios](ratios.md).

## Second ratio pass and nutrition evaluation (2026-11-17, later)

Needed for the second pass of [ratios](ratios.md) and for the
[nutrition evaluation](nutrition-evaluation.md). Reachable and used:

```
books.google.com
ruhlman.com
archive.org
www.legislation.gov.uk
fdc.nal.usda.gov
world.openfoodfacts.org
pubmed.ncbi.nlm.nih.gov
eutils.ncbi.nlm.nih.gov
raw.githubusercontent.com
api.github.com
codeberg.org
f-droid.org
```

How they could be read:

- Google Books: the volumes feed (`books.google.com/books/feeds/volumes?q=…`)
  returns the book's own sentence and page for a search inside a book.
  The search-inside page itself redirects to a bot check on
  `www.google.com`, which is blocked.
- The Internet Archive copy of _Ratio_ is a lending item; its full-text
  search runs on a data node (`ia601008.us.archive.org`) that is blocked.
- EU law: `eur-lex.europa.eu` still answers 202 with an empty body for
  the HTML, TXT and PDF document URLs. The EU texts were read on
  `www.legislation.gov.uk` in the "as adopted by the EU" version
  (`…/adopted`), not the later UK version.
- `pmc.ncbi.nlm.nih.gov` answers scripts with a bot check; full texts
  come through `eutils.ncbi.nlm.nih.gov` (`efetch`, `db=pmc`).
- `en.wikipedia.org` answers its API with 429 after a few calls.

Refused by the site: `www.kingarthurbaking.com` (406),
`www.fsis.usda.gov` (403), `www.seriouseats.com` (402).

Blocked (proxy refused the tunnel, tested with
`curl -sS -m 15 -o /dev/null https://<host>/`):

```
web.archive.org
ia601008.us.archive.org
www.google.com
www.npr.org
www.simonandschuster.com
www.americastestkitchen.com
www.cooksinfo.com
kitchennmbrs.app
billyparisi.com
spokesman.com
interaksyon.philstar.com
periodicoshomolog.saude.sp.gov.br
schema.org
legislation.gov.uk
www.ars.usda.gov
www.nal.usda.gov
data.nal.usda.gov
www.blsdb.de
www.mri.bund.de
ciqual.anses.fr
www.anses.fr
www.naehrwertdaten.ch
webapp.prod.blv.foodcase-services.com
www.blv.admin.ch
www.eurofir.org
opendatacommons.org
static.openfoodfacts.org
health.ec.europa.eu
food.ec.europa.eu
cronometer.com
support.cronometer.com
www.myfitnesspal.com
support.myfitnesspal.com
www.yazio.com
fddb.info
search.f-droid.org
de.wikipedia.org
```

For the [data model](data-model.md), tested 2026-11-17 with
`curl -sS -m 15 -o /dev/null https://<host>/`: reachable are
`json-schema.org`, `www.legislation.gov.uk`,
`raw.githubusercontent.com` (301) and `www.kingarthurbaking.com` (406 for
curl, readable with the fetch tool). Blocked (no DNS or tunnel 403) and
needed to read more: `developers.google.com` (Recipe structured data),
`ajv.js.org`, `www.theperfectloaf.com`, `www.thefreshloaf.com`,
`busbysbakery.com`. (`schema.org`, `openrecipeformat.readthedocs.io`,
`opentextbc.ca` and `workforce.libretexts.org` were blocked then; see
the next section.)

## Engine units (2026-11-18)

Needed to read the unit definitions for [engine rules](engine-rules.md).
Blocked at first, allowed by the owner on 2026-11-18 and then read:

```
www.nist.gov
www.govinfo.gov
doi.org
```

Handbook 44 Appendix C is on `www.nist.gov`, the Federal Register of
1959-07-01 on `www.govinfo.gov`. Also allowed and answering, not needed
in the end: `nvlpubs.nist.gov`, `physics.nist.gov`, `www.law.cornell.edu`,
`www.bipm.org`, `www.ecfr.gov`. `www.federalregister.gov` answers at its
root but refused a document request (proxy 403).

## Yield, schema.org and ORF sources (2026-11-18)

Needed to re-check the definitions in the [data model](data-model.md)
(issue 37). Allowed by the owner on 2026-11-18, tested with
`curl -sS -m 15 -o /dev/null -w '%{http_code}' https://<host>/` and read:

```
workforce.libretexts.org
schema.org
openrecipeformat.readthedocs.io
```

`openrecipeformat.readthedocs.io` answers the root with a 302 to
`/latest/`; `schema.org` pages come gzip-compressed. Also allowed and
answering (200), not needed: `www.w3.org`. Refused: `opentextbc.ca`
(403), so the same book was read on `workforce.libretexts.org` (shelf
"Food Production, Service and Culinary Arts", book "Basic Kitchen and
Food Service Management (BC Campus)"; its search and shelf listings are
built by script, so the book's pages were reached by following the links
on the book's own page). The licence of the Open Recipe Format is not
stated on its documentation pages and the host of its source repository
was not among the hosts allowed for this task, so the licence stays
unread.
