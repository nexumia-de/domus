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

From the repository root the same check is `npm run check:emptio`. More
commands, each with `-w` and the package:

| Command                             | What it does                                                                                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run build -w @emptio/app`      | The web app into `packages/app/dist` (esbuild; a service worker with the file list)                                                              |
| `npm run e2e -w @emptio/app`        | The browser checks against a fake of GitHub's API ([behaviour](behaviour.md#what-is-checked)); Chromium from `PLAYWRIGHT_CHROMIUM_PATH` when set |
| `npm run icons -w @emptio/app`      | Draws the PNG icons from the SVGs; run only when an SVG changes                                                                                  |
| `npm run build -w @emptio/linux`    | The native app as one module for GJS ([native Linux app](native-linux.md))                                                                       |
| `npm run smoke -w @emptio/linux`    | The native platform pieces in real GJS                                                                                                           |
| `npm run interact -w @emptio/linux` | The native screens driven through Broadway                                                                                                       |

## Layout

- `packages/engine` (`@emptio/engine`): the pure engine. `src/index.ts`
  is its only public entry; the package exports the TypeScript file
  directly. One job per file: `priority.ts`, `sort-key.ts`,
  `home-order.ts`, `category.ts`, `add-entry.ts`, `suggest.ts`,
  `starting-categories.ts`. `data/categories.json` holds the starting
  categories ([categories](categories.md)); `vectors/` holds the worked
  examples ([vector format](vectors.md)).
- `packages/app` (`@emptio/app`): the web app. `src/list/` is the list
  without a screen (the records, the actions, the categories, the status
  words), `src/app.ts` the running app (state, the shown space, the
  host package's loops), `src/screens/` the four screens on a small DOM
  helper, `src/core.ts` what a second shell imports
  (`@emptio/app/core`). `e2e/` holds the browser checks.
- `packages/linux` (`@emptio/linux`): the native app; `src/ui/` the pages,
  `data/` the desktop file, metainfo and icons. What GJS lacks, joining by
  link and the check tooling are in `packages/gjs`
  ([platform pieces](../../../packages/gjs/docs/platform.md)).
- The shared packages come from this repository: hospes for everything
  about spaces and sync, materia through it.

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
