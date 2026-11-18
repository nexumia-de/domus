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
| `npm test`             | vitest in both packages                                             |

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
  `vectors/percentages/`, `vectors/templates/`, `vectors/salt/`, `vectors/components/` and `vectors/validate/` hold
  the worked examples that `test/units-vectors.test.ts`,
  `test/percentages-vectors.test.ts`, `test/templates-vectors.test.ts` and
  `test/salt-vectors.test.ts`, `test/components-vectors.test.ts` and `test/validate-vectors.test.ts` run;
  `test/ratios.test.ts` has the unit tests and the seed checks,
  `test/components.test.ts` and `test/components-property.test.ts` those of
  components, `test/validate.test.ts` those of validation.
  Rules: [engine rules](engine-rules.md).
- `packages/app` (`@culina/app`): the web app. It imports `@culina/engine`
  only; a lint rule fails any deep import.
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

## CI

`.github/workflows/ci.yml` runs `npm ci` and `npm run check` on pull
requests and pushes to `main`. The job is named `check`, as in Mixtura;
this is the status check name for a branch-protection ruleset (the
repository has no `.github/rulesets/` file yet). Actions are pinned to a
commit SHA; Dependabot updates npm and GitHub Actions weekly
(`.github/dependabot.yml`).

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
needed to read more: `schema.org`, `developers.google.com` (Recipe
structured data), `openrecipeformat.readthedocs.io` (ORF field
reference), `opentextbc.ca` and `workforce.libretexts.org` (yield
testing, as purchased and edible portion), `ajv.js.org`,
`www.theperfectloaf.com`, `www.thefreshloaf.com`, `busbysbakery.com`.

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
