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

| Folder           | Workspace names                                                | Came from          |
| ---------------- | -------------------------------------------------------------- | ------------------ |
| `packages/model` | `@nexumia-de/materia`                                          | nexumia-de/materia |
| `packages/host`  | `@nexumia-de/hospes`                                           | new                |
| `packages/gjs`   | `@nexumia-de/gjs`; what the native Linux apps share            | new                |
| `apps/mixtura`   | `mixtura`, `@mixtura/engine`, `@mixtura/app`, `@mixtura/linux` | nexumia-de/mixtura |
| `apps/culina`    | `culina`, `@culina/engine`, `@culina/app`, `@culina/linux`     | nexumia-de/culina  |
| `apps/emptio`    | `emptio`, `@emptio/engine`, `@emptio/app`, `@emptio/linux`     | nexumia-de/emptio  |
| `apps/domus`     | `@domus/app`; Household, the app at the root of the address    | new                |
| `scripts`        | none; checks and the site build that span the parts            | new                |

Each part keeps its own `docs/`, `AGENTS.md`, ESLint and Prettier
configuration and TypeScript base, as it had them
([decision](decisions/one-repository.md)).

## Install

Node 22.12 or later (`.nvmrc`). From the root:

```sh
npm ci
```

There is one `package-lock.json`; `apps/domus` is a workspace of its own
(`@domus/app`, its tooling files are its own, `qrcode-generator` 2.0.4 is
its one dependency besides the two shared packages). The development dependencies are in
the root `package.json`; a part declares only what it alone needs.
`npm ci` also builds `packages/model/dist` (its `prepare` script), which
the engines of Mixtura and Culina import.

## Checks

From the root:

| Command                 | What                                                            |
| ----------------------- | --------------------------------------------------------------- |
| `npm run check`         | everything below, in this order                                 |
| `npm run format:check`  | Prettier on the root files (not `apps/`, not `packages/`)       |
| `npm run boundaries`    | no app imports another app, no shared package imports an app    |
| `npm run check:model`   | materia: format, lint, typecheck, tests, build                  |
| `npm run check:host`    | hospes: format, lint, typecheck, tests                          |
| `npm run check:gjs`     | gjs: format, lint, typecheck, tests                             |
| `npm run check:mixtura` | Mixtura: format, lint, typecheck, tests, build (native app too) |
| `npm run check:culina`  | Culina: format, lint, typecheck, tests                          |
| `npm run check:emptio`  | Emptio: format, lint, typecheck, tests                          |
| `npm run check:domus`   | Household: format, lint, typecheck, tests                       |

`npm run build:site` and `npm run e2e:site` build and check the whole
address ([deployment](deployment.md)). The browser checks of Household
are `npm run e2e -w @domus/app` (against a fake GitHub API on localhost,
[development](../apps/domus/docs/development.md#browser-checks)).

Other scripts of a part run with `-w`, for example
`npm run e2e -w mixtura` or `npm run build -w culina`. What they do is
in the part's own `docs/development.md`.

### CI for the native apps

`.github/workflows/ci.yml` has, for each native app, three jobs with the
same shape: `<app>-linux-check`, `<app>-flatpak` (x86_64 and aarch64) and
`<app>-release` (on a tag `<app>-v<version>`). Their steps are three
composite actions in `.github/actions/` (`native-linux-check`,
`native-flatpak`, `native-release`); a job only says which app and where
its files are. Adding a native app is three short jobs, a tag pattern in
`on.push.tags` and the app's own package. The jobs are not one matrix
because the path filter (`changes`) decides per app and a job's `if`
cannot read a matrix value, and because the job names (`emptio-linux-check`,
`emptio-flatpak (x86_64)`, `emptio-release`) stay as they were. A change
under `packages/gjs` runs both apps' checks.

**Screenshots.** The x86_64 run of `native-flatpak` takes the shots of the
app's `release.toml` (`[[screenshots.shot]]`) from the built Flatpak with
phosh-toolkit's `release.py screenshots` and `screenshot.sh`, checked out
at the tag in the job's `toolkit-ref`, and uploads them as the artifact
`<app id>-screenshots` (phone 360 x 720 and desktop 1000 x 700, light and
dark). The data is the app's recorded data: `native-linux-check` runs
`scripts/seed.mjs` into `dist/screenshot-data` and ships it with the bundle,
and the shot exposes it read-only to the sandbox (the apps write nothing
on start; checked by comparing the folder before and after). The build
composes the AppStream data with `--no-net`, so the screenshot URLs of a
tag release, which exist only after the build, are kept; the step fails
when the metainfo lists a shot that was not taken. `native-release`
attaches the shots to the GitHub Release. The metainfo's `<screenshots>`
is written by the release pull request (`release.py prepare`), so it
arrives with an app's next release, not before.

### Boundaries

`scripts/check-boundaries.mjs` reads every `import`, `export … from`,
`import()` and `require()` in the source files under `apps/` and
`packages/`. It fails when a relative path leaves the part
(`apps/<name>` or `packages/<name>`) or when a file names a package of
another app (`@<app>/…`; the scope of an app is its folder's name, so
`@domus/…` belongs to `apps/domus`, and `tools/wrangler`'s
`@domus/wrangler-pin` is not read because `tools/` is not scanned and
nothing imports it). It does not read Markdown, JSON or build
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
