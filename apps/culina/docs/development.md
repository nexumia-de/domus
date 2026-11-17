---
type: Guide
title: Development
description: Setup, commands, layout and the engine's purity rule for Culina, the CI job name, and the network hosts the research needed.
tags: [development, tooling, ci, network]
generated: { by: claude-code/2.1.326, at: 2026-11-17 }
---

# Development

Tooling mirrors the sister repository Mixtura; the packages hold only
placeholders until the shared-model decision (issue #2) settles what the
engine contains.

## Setup

Node 22 (`.nvmrc`, `engines.node` `>=22.12.0`), then:

```sh
npm ci
```

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
  its only public entry and, for now, its source: the package exports the
  TypeScript file directly, so there is no build step. Add one when the
  app needs a bundle.
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
