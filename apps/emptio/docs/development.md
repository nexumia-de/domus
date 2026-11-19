---
type: Guide
title: Development
description: Setup, commands, layout of the two packages, the purity rule and its guard, how the lockfile is made, and CI.
tags: [development, setup, commands, ci]
generated: { by: claude-code/2.1.327, at: 2026-11-18 }
---

# Development

## Setup

Node 22 (the version in `.nvmrc`), then:

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

There is no build yet; it comes with the app shell (issue 13).

## Layout

- `packages/engine` (`@emptio/engine`): the pure engine. `src/index.ts`
  is its only public entry; the package exports the TypeScript file
  directly, so there is no build step. One job per file: so far
  `src/priority.ts`. `data/categories.json` holds the starting
  categories ([categories](categories.md)); `vectors/` holds the worked
  examples ([vector format](vectors.md)).
- `packages/app` (`@emptio/app`): the web app. So far only the visible
  name and a test that the engine is reached through its entry.
- materia is not a dependency yet. It is added, pinned to an exact tag,
  with the first code that uses it (the sync record of the local store,
  issue 14).

## The purity rule

The engine has no clock, no randomness, no logging, no host API and no
import from the app. `eslint.config.js` forbids these for
`packages/engine/src`; `packages/engine/test/purity.test.ts` runs
ESLint with the repository's configuration on small probes and fails if
one of the rules is no longer in force. The app may import
`@emptio/engine` only, never a file inside it.

## The lockfile

`npm install` of npm 10.9.9 (the npm of Node 22) fails on this
dependency set while resolving peers of vitest ("Cannot read properties
of null (reading 'edgesOut')"). The lockfile was written with
`npx npm@11 install`; `npm ci` of npm 10 installs from it without
error. When a dependency changes, write the lockfile the same way.

## CI

`.github/workflows/ci.yml`, job `check`: `npm ci` and
`npm run check` on every pull request and every push to `main`.
Actions are pinned to a commit. Dependabot proposes updates weekly
(`.github/dependabot.yml`).

For the owner: the branch protection ruleset of the sister apps
(phosh-toolkit `docs/branch-protection.md`) can be imported for
`main`; the required check is `check`.
