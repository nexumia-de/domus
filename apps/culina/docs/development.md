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

| Command                              | What it does                                                                                                                                                                  |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check`                      | format check, lint, typecheck, tests, in that order; stops at error                                                                                                           |
| `npm run format`                     | Prettier writes all files                                                                                                                                                     |
| `npm run format:check`               | Prettier checks all files                                                                                                                                                     |
| `npm run lint`                       | ESLint (flat config, typescript-eslint, purity rule for the engine)                                                                                                           |
| `npm run typecheck`                  | `tsc --noEmit` in both packages                                                                                                                                               |
| `npm test`                           | vitest in both packages (the app tests build `dist/` first)                                                                                                                   |
| `npm run build`                      | esbuild writes `packages/app/dist/`                                                                                                                                           |
| `npm run e2e`                        | generates what `npm test` generates, builds, serves `dist/` and runs the Playwright checks in Chromium                                                                        |
| `E2E_WIDE_FONT=1 npm run e2e`        | the same with DejaVu Sans as the system font, like the CI runner ([below](#browser-checks-with-a-wide-font))                                                                  |
| `npm run validate:content -- <file>` | validates one technique or dish file ([classic format](classic-format.md#validating-one-file))                                                                                |
| `npm run propose:steps -- [<dish>]`  | prints what `proposeStep` suggests for each step of the shipped dishes beside what the file says; `--count` gives the counts only ([classic format](classic-format.md#steps)) |

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
  `src/text/`, `src/content/`, `src/steps/`, `src/techniques/`, `src/classics/` and `src/skills/` (techniques, steps, classics and skill state, issue 87; `data/techniques/` has one JSON file per technique and `src/techniques/techniques.generated.ts`, git-ignored, indexes them: `scripts/make-techniques.mjs` writes it in the engine's and the app's `pretest` and `pretypecheck` and in the build, so run `npm test` or `npm run typecheck`, not `vitest` alone, in a fresh checkout; the app does the same for `data/classics/<country>/` with `make-classics.mjs`, whose index only the tests import: the app gets its dishes from `dist/classics.json`; `techniqueById` scans the list instead of keeping a map, so the bundler drops the notes from `main.js`) with `vectors/techniques/`, `vectors/classics/` and `vectors/skills/` run by `test/techniques-vectors.test.ts`, `test/classics-vectors.test.ts` and `test/skills-vectors.test.ts`, and `test/content.test.ts`;
  `test/ratios.test.ts` has the unit tests and the seed checks,
  `test/components.test.ts` and `test/components-property.test.ts` those of
  components, `test/validate.test.ts` those of validation.
  Rules: [engine rules](engine-rules.md).
- `packages/app` (`@culina/app`): the web app (PWA shell, [behaviour](behaviour.md),
  [design](design.md)). It imports `@culina/engine` only; a lint rule fails any
  deep import. Layout, one job per file: `build.mjs` (esbuild; writes `dist/`
  with fixed names `index.html`, `main.js`, `theme-init.js`, `app.css`,
  `manifest.webmanifest`, `catalogue.json`, `classics.json` (the dishes and technique notes read from the data folders by `make-classics.mjs`; fetched at start, precached, not in `main.js`), `icons/`, `sw.js`), `src/main.ts` (start),
  `src/router.ts` (hash router), `src/prefs.ts` (theme in `localStorage`),
  `src/theme-init.ts`, `src/sw-register.ts`, `src/sw.ts`, `src/strings.ts`
  (picks the language set; the English texts are `src/strings-*.ts`, the German ones `src/de/`), `src/engine-info.ts` (the app's one use of the
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
and `e2e/store.mjs` (records survive a reload and a service worker update, no foreign request) and `e2e/catalogue.mjs` (the ingredient catalogue in the picker, see [behaviour](behaviour.md#editor)) and `e2e/classics.mjs` (the classics on fictional example content handed in with `?e2e-content`: Cook, country, dish, step by step, "I know this", the note gone on the next dish, Teach again, keep in the notebook, content language, at 360 and 1000 px) and `e2e/navigation.mjs` (the three destinations and the gear in English and German at 320, 360 and 1000 px: order, one-line labels, targets, the parts of the Notebook, Cook as one screen, the old addresses replaced without a history entry, every old destination at most two taps from Cook, the stock two taps from anywhere) and `e2e/german.mjs` (the app in German at 360 x 720, chosen through the setting and through the browser locale `de`; see [behaviour](behaviour.md#classics)).
Chromium comes from `PLAYWRIGHT_CHROMIUM_PATH` when that variable is set,
otherwise from Playwright (`npx playwright install chromium`).
`npm run screenshots -w @culina/app` rewrites `docs/screenshots/`.

### Browser checks with a wide font

The default sans font of a machine decides how wide a label gets: with six entries on a developer machine with Inter the
navigation fitted at 360 px, on the CI runner (ubuntu, DejaVu Sans as the fallback) it did not, and the
page scrolled sideways. With four entries (Verhältnisse, the longest label, fits one line at 320 px) the check stays, because it is what keeps the labels short. `E2E_WIDE_FONT=1 npm run e2e` starts Chromium with a temporary fontconfig file
(`e2e/harness.mjs`) that makes DejaVu Sans the `sans-serif` and `system-ui` font; it needs the package
`fonts-dejavu-core` and fails with a message when the font is missing. No font is added to the
repository. Run both before a change to the shell, the navigation or the type sizes:

```
npm run e2e -w culina
E2E_WIDE_FONT=1 npm run e2e -w culina
```

## Ingredient catalogue

`packages/app/data/ingredient-catalogue.json` is generated, never edited
([ingredient catalogue](ingredient-catalogue.md)). To rebuild it:

```
curl -sS -O https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_json_2018-04.zip
```

```
unzip -d fdc-sr-legacy FoodData_Central_sr_legacy_food_json_2018-04.zip
```

```
curl -sS -O https://fdc.nal.usda.gov/fdc-datasets/SR-Legacy-Archive/sr28asc.zip
```

```
unzip -d fdc-sr28 sr28asc.zip
```

```
node tools/catalogue/build.mjs fdc-sr-legacy --refuse fdc-sr28/FOOD_DES.txt
```

Run the first four in a scratch folder outside the repository (the raw
datasets, 210 MB unzipped for the JSON, are never committed) and give the
fifth their paths; `--refuse` is the refuse file for the yields. The generator reads the folder or the `.json` file, writes the
file above (or `--out <file>`), and a rerun on the same dataset gives
identical bytes; it prints the number of entries, parents, yields and nutrition rows. `npm run build` copies the
file, minified, to `dist/catalogue.json` (the app fetches it on first use of
the picker and the service worker precaches it; `main.js` does not carry
it). Prettier ignores the generated
file.

Foods that a shipped dish needs and the selection rule leaves out are listed in
`tools/catalogue/extras.json` ([named foods](ingredient-catalogue.md#named-foods));
the same command rebuilds them. After adding one, refresh the German names
(below) so that the snapshot keeps the NDB numbers of the new rows, run
`npx prettier --write tools/catalogue/wikidata-de.json`, and rebuild the
catalogue after that (the file's SHA-256 is in the catalogue's envelope).

The German names that Wikidata does not have are the hand-kept overlay
`tools/catalogue/names-de-own.json`
([own translation](ingredient-catalogue.md#own-translation)). The generator
merges it; with the USDA data not at hand, `node tools/catalogue/merge-own-names.mjs`
merges it into the shipped file offline and gives the same bytes. A new
catalogue entry needs a line in the overlay, or the test
`catalogue-german-own.test.ts` fails with its id. Before writing one, ask
Wikidata for the row's NDB number (the second field of `FOOD_DES.txt`) with
one SPARQL query, `SELECT ?i ?l WHERE { ?i wdt:P1978 ?n . FILTER(?n IN
("10165")) OPTIONAL { ?i rdfs:label ?l FILTER(lang(?l)="de") } }`, sent like
the queries below; only when it has no item is an own name written (done on
2026-11-24 for salt pork and the spirit: no item, the snapshot not
refreshed).

Hosts tested on 2026-11-18 and again on 2026-11-23 (the catalogue was rebuilt and the snapshot refreshed that day), all answered 200 through the proxy:

```
fdc.nal.usda.gov
```

The home page (licensing) and the dataset zips under
`https://fdc.nal.usda.gov/fdc-datasets/` are on that host. The German names
need two more, tested on 2026-11-18, both answered 200:

```
query.wikidata.org
www.wikidata.org
```

`query.wikidata.org` is the SPARQL endpoint, `www.wikidata.org` the
licensing page (Wikidata:Licensing). The generator itself uses neither:
it reads the committed snapshot.

### German names

`tools/catalogue/wikidata-de.json` is the trimmed answer of two SPARQL
queries ([ingredient catalogue](ingredient-catalogue.md#german-names)).
To refresh it, send a generic User-Agent (no contact data) and fetch
everything at once, never per item. The first query is
`tools/catalogue/wikidata-items.rq`:

```
curl -sS -A 'culina-catalogue-research/0.1' -H 'Accept: application/sparql-results+json' --data-urlencode query@tools/catalogue/wikidata-items.rq https://query.wikidata.org/sparql -o items.json
```

```
node tools/catalogue/snapshot.mjs classes-query items.json > classes.rq
```

```
curl -sS -A 'culina-catalogue-research/0.1' -H 'Accept: application/sparql-results+json' --data-urlencode query@classes.rq https://query.wikidata.org/sparql -o classes.json
```

```
node tools/catalogue/snapshot.mjs build items.json classes.json fdc-sr-legacy/FoodData_Central_sr_legacy_food_json_2018-04.json 2026-11-18
```

Replace the date with the day of the fetch; the files in the first three
steps stay outside the repository. The last step writes the snapshot, then
rebuild the catalogue as above; the diff of the two files shows what
Wikidata changed. The snapshot is the generator's only input from Wikidata.

## Pairing data

Pairings come from FlavorDB ([decision](decisions/flavordb.md)). Two
files in `packages/app/data/` are committed and rebuilt, never edited:

- `flavour-pairings.json`, derived from FlavorDB's entity documents
  (fetched on 2026-11-23: 936 entities, 1788 molecules, 606 kB);
- `flavour-links.json`, which entity stands for an ingredient of the
  catalogue (682 of 780), from the rule of `tools/flavordb/link.mjs` and
  the corrections of `tools/flavordb/links-own.json`.

To fetch again and rebuild, from `apps/culina`:

```bash
node tools/flavordb/fetch.mjs
```

```bash
node tools/flavordb/build.mjs --fetched 2026-11-23
```

```bash
node tools/flavordb/link-build.mjs
```

`fetch.mjs` asks for the entities `0` to `1100` one after the other with
a second's pause between requests, and saves each as
`tools/flavordb/raw/<id>.json`; that folder (79 MB) is not committed. It
stops early after 40 missing ids in a row, lists what failed and ends
with exit code 1 then; a second run fetches only what is missing.
`--from`, `--to`, `--pause <ms>` and `--out <folder>` change the range,
the pause and the folder. On 2026-11-23 the run took a few minutes and
nothing failed; earlier the same day the site did not answer from the
session's container (HTTP 502 from the proxy). `build.mjs` writes the
pairing file from the raw files and the date they were fetched; the
same files and date give the same bytes; a raw file that is no entity
is named and left out. `link-build.mjs` writes the links from the
catalogue, the pairing file and the corrections; a correction that names
no entity or reaches no ingredient is a problem and ends the run with
exit code 1.

A correction is a row of `links-own.json`: the beginning of a catalogue
name up to a comma, the entity's name or `null` for no link, and the
reason. It goes before the rule; with `"fallback": true` it applies only
where the rule finds nothing.

Tests: `packages/engine/test/pairing-vectors.test.ts` (the rule),
`packages/app/test/flavordb-derive.test.ts` (the derivation, on two real
entities kept in `tools/flavordb/fixtures/`),
`packages/app/test/flavordb-data.test.ts` (the committed files are what
the tools write) and `packages/app/test/pairing-view.test.ts`. The fetch
itself has no test.

## CI

**Since 2026-11-18 the account has no GitHub Actions minutes left**: jobs
end within seconds without a runner and `deploy` does not run. Until the
minutes return, the owner allows a merge without green CI when
`npm run check` and, for a change to the app, the e2e run pass locally
on the branch with main merged in; the pull request says so. The live
site is not updated by such a merge.

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

## Cooklang specification (2026-11-18)

Needed to write the Cooklang reader and writer from the specification
(issue 18). Tested with
`curl -sS -m 15 -o /dev/null -w '%{http_code}' https://<host>/`:

```
cooklang.org
raw.githubusercontent.com
github.com/cooklang
```

`cooklang.org` answered 200 and `raw.githubusercontent.com` 301 for its root and 200 for the
files read (`cooklang/spec` `README.md` and `conventions.md`, MIT). `github.com/cooklang`
answered 400 and `github.com/cooklang/spec` 403 (proxy), so the spec was read from the raw
host. The vectors in `packages/engine/vectors/cooklang/` name the section of each example.
