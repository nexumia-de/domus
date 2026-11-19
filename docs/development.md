---
type: Guide
title: Development
description: The layout of the repository, the one npm workspace and its lockfile, the checks from the root and per part, the boundaries check, CI, how the four histories were imported, and what still points at the old repositories.
tags: [development, workspace, checks, ci, boundaries, import]
generated: { by: claude-code, at: 2026-11-19 }
sources:
  - id: decision
    title: 'Decision: one repository'
    url: decisions/one-repository.md
---

# Development

## Layout

| Folder           | Workspace names                                     | Came from          |
| ---------------- | --------------------------------------------------- | ------------------ |
| `packages/model` | `@nexumia-de/materia`                               | nexumia-de/materia |
| `apps/mixtura`   | `mixtura`, `@mixtura/engine`, `@mixtura/app`        | nexumia-de/mixtura |
| `apps/culina`    | `culina`, `@culina/engine`, `@culina/app`           | nexumia-de/culina  |
| `apps/emptio`    | `emptio`, `@emptio/engine`, `@emptio/app`           | nexumia-de/emptio  |
| `apps/domus`     | none; the static page at the root of the address    | new                |
| `scripts`        | none; checks and the site build that span the parts | new                |

Each part keeps its own `docs/`, `AGENTS.md`, ESLint and Prettier
configuration and TypeScript base, as it had them
([decision](decisions/one-repository.md)).

## Install

Node 22.12 or later (`.nvmrc`). From the root:

```sh
npm ci
```

There is one `package-lock.json`. The development dependencies are in
the root `package.json`; a part declares only what it alone needs.
`npm ci` also builds `packages/model/dist` (its `prepare` script), which
the engines of Mixtura and Culina import.

## Checks

From the root:

| Command                 | What                                                         |
| ----------------------- | ------------------------------------------------------------ |
| `npm run check`         | everything below, in this order                              |
| `npm run format:check`  | Prettier on the root files (not `apps/`, not `packages/`)    |
| `npm run boundaries`    | no app imports another app, no shared package imports an app |
| `npm run check:model`   | materia: format, lint, typecheck, tests, build               |
| `npm run check:mixtura` | Mixtura: format, lint, typecheck, tests, build               |
| `npm run check:culina`  | Culina: format, lint, typecheck, tests                       |
| `npm run check:emptio`  | Emptio: format, lint, typecheck, tests                       |

`npm run build:site` and `npm run e2e:site` build and check the whole
address ([deployment](deployment.md)).

Other scripts of a part run with `-w`, for example
`npm run e2e -w mixtura` or `npm run build -w culina`. What they do is
in the part's own `docs/development.md`.

### Boundaries

`scripts/check-boundaries.mjs` reads every `import`, `export … from`,
`import()` and `require()` in the source files under `apps/` and
`packages/`. It fails when a relative path leaves the part
(`apps/<name>` or `packages/<name>`) or when a file names a package of
another app (`@<app>/…`). It does not read Markdown, JSON or build
configuration, and it does not follow re-exports of installed packages.

## How the histories were imported

On 2026-11-19, from the `main` branch of each repository, with
`git filter-repo`: every commit was rewritten so that its files lie in
the part's folder, and the four histories were joined by three merge
commits. Changed on the way:

- Commit ids differ from the old repositories.
- Issue and pull request numbers in commit messages were prefixed with
  the old repository (`#114` became `nexumia-de/mixtura#114`), so they
  do not point at numbers of this repository.
- Tags were renamed with the repository in front (`materia-v0.3.0`).
  They exist in the import but could not be pushed from the session
  that did it; see [open points](#open-points).
- Branches other than `main` were not imported.

After the import, in one change: the root workspace and lockfile, the
tests that asserted the git tag pin of materia now assert that the
package resolves to `packages/model`, Mixtura's engine build finds
TypeScript through Node's resolution instead of a fixed path, and the
per-repository licence files, lockfiles and `.nvmrc` were removed in
favour of the root ones.

## Open points

- The tags `materia-v0.2.0` and `materia-v0.3.0` are not on the remote.
- Each part's own documents still describe some things as they were in
  its own repository (pinning by tag, the CI of that repository). The
  decision records were left as they were written; where they are
  replaced, [one repository](decisions/one-repository.md) says so.
- Deploy secrets and the ruleset have to be set up in this repository
  by the owner.
