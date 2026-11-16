---
type: Guide
title: Development
description: Setup, commands, layout and the engine's purity rule for Mixtura, the CI job name, and the network hosts the research needed.
tags: [development, tooling, ci, network]
generated: { by: claude-code/2.1.326, at: 2026-11-16 }
---

# Development

## Setup

Node 22 (`.nvmrc`, `engines.node` `>=22.12.0`), then:

```sh
npm ci
```

## Commands

| Command                | What it does                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `npm run check`        | format check, lint, typecheck, tests, build, in that order; stops at the first error |
| `npm run format`       | Prettier writes all files                                                            |
| `npm run format:check` | Prettier checks all files                                                            |
| `npm run lint`         | ESLint (flat config, typescript-eslint, purity rule for the engine)                  |
| `npm run typecheck`    | `tsc --noEmit` in both packages                                                      |
| `npm test`             | vitest in both packages                                                              |
| `npm run build`        | `packages/engine/dist/engine.mjs` and `packages/app/dist/` (`index.html`, `main.js`) |

## Layout

- `packages/engine` (`@mixtura/engine`): the pure engine. `src/index.ts`,
  `vectors/` for the test vectors of every rule and formula, `test/`.
- `packages/app` (`@mixtura/app`): the web app, built with esbuild, no UI
  framework; imports the engine. A placeholder page for now.
- `tsconfig.base.json` (strict) is extended by one `tsconfig.json` per package.
- Every dependency is pinned exactly; see [dependencies](dependencies.md).

## The engine is pure

`packages/engine/src/**` may not use the clock (`Date`, `performance`),
randomness (`Math.random`, `crypto`), `console`, DOM or host globals
(`window`, `document`, `navigator`, `indexedDB`, `fetch`, `localStorage`,
`process`) or import from `packages/app`; time and random numbers come in
as input. ESLint enforces it in `eslint.config.js`;
`packages/engine/test/purity.test.ts` lints fixture files that must fail,
so the rule cannot be removed silently
([two apps, one engine](decisions/two-apps-one-engine.md)).

## CI

`.github/workflows/ci.yml` runs `npm ci` and `npm run check` on pull
requests and pushes to `main`. The job is named `check`; this is the
required status check name for the branch-protection ruleset. Actions are
pinned to a commit SHA, Dependabot updates npm and GitHub Actions weekly.

## Network hosts

Needed to check the facts in [existing tools and data](existing-tools.md);
reachable on 2026-11-16:

```
www.thecocktaildb.com
docs.barassistant.app
bar-assistant.github.io
cosylab.iiitd.edu.in
apps.gnome.org
```

`bar-assistant.github.io` only redirects to `docs.barassistant.app`.
For the seed data ([seed data](seed-data.md#network-hosts)), reachable
through the session proxy on 2026-11-17 (`git clone` of
`bar-assistant/data` and raw file download; the web page and API of
`github.com` answered 403 for curl):

```
github.com
raw.githubusercontent.com
```

`foodb.ca` answers automated requests with 403 itself, so FooDB's
licence stays unverified.

Needed to verify the numbers of [balance](balance.md) and [units](units.md),
blocked on 2026-11-17 (`curl` to each gave a proxy tunnel failure, and
Wikipedia also failed to resolve):

```
cookingissues.com
www.cookingissues.com
www.diffordsguide.com
cocktail-society.com
fashioned.deathandcompany.com
www.nhs.uk
www.nist.gov
en.wikipedia.org
archive.org
books.google.com
```
