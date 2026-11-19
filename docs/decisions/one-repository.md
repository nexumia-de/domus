---
type: Decision Record
title: One repository for the apps and what they share
description: Decided by the owner on 2026-11-19. Mixtura, Culina, Emptio and materia move with their histories into one private repository, domus, with one npm workspace; shared packages are used from the repository instead of a version tag; a check keeps the parts apart; one origin, spaces and a sync server were discussed and are not decided here.
tags: [decision, repository, monorepo, workspace, materia, boundaries]
generated: { by: claude-code, at: 2026-11-19 }
sources:
  - id: mixtura-shared
    title: 'Mixtura: where the shared model lives (the rule this replaces)'
    url: ../../apps/mixtura/docs/decisions/shared-model.md
  - id: emptio-plan
    title: 'Emptio: how it is built (shared host code hospes, catalogue cibus)'
    url: ../../apps/emptio/docs/architecture.md
---

# One repository for the apps and what they share

**Status: decided by the owner on 2026-11-19**, in the session that
planned sync for all three apps. Points the agent chose are marked
"agent".

## Context

There were four repositories (materia, Mixtura, Culina, Emptio) and
three more were planned: the shared host code (hospes), the ingredient
catalogue (cibus) and a sync server. The apps installed materia from a
git tag[^mixtura-shared]. A change to shared code therefore needed a
pull request in materia, a tag set by the owner, and a pin update with
its own check in every app. One person works on all of it, and the apps
are close: one household place, hand-over between them, the same
sync[^emptio-plan].

## Decision

1. **One repository, `domus`**, private for now, on the owner's account
   `suitably`. The four repositories were imported with their full
   histories into `packages/model` (materia), `apps/mixtura`,
   `apps/culina` and `apps/emptio`.
2. **One npm workspace** at the root with one lockfile. The development
   dependencies, which were the same versions everywhere, are declared
   once at the root (agent).
3. **Shared packages are used from the repository.** The apps depend on
   `@nexumia-de/materia` by its version and npm links the workspace
   package; the git tag pin and its test are gone. A change that breaks
   an app is fixed in the same commit, and the checks of all parts show
   it.
4. **The parts stay apart by a check, not by repositories.** No app
   imports another app, no shared package imports an app
   (`scripts/check-boundaries.mjs`, agent). The rules each part had
   (purity of the model, sources and licences, no language model in
   Culina) stay in its own `AGENTS.md`.
5. **Names stay.** Mixtura, Culina, Emptio and materia keep their
   names, their package names and their own `docs/`. Package names keep
   the scope `@nexumia-de` until the owner says otherwise.
6. **The old repositories are archived by the owner** once this
   repository's checks run. Their issues and pull requests stay there;
   commit messages here name them in full
   (`nexumia-de/mixtura#114`).

## Not decided here

Discussed in the same session and left open here; the first three were
decided the same day in
[one address, spaces, storages](one-origin-spaces-storages.md):

- **One origin for all apps** (one address with a folder per app, so
  the apps share local data and sync is set up once). Today each app is
  deployed to its own address.
- **Spaces**: one unit of sharing with one secret and one invite,
  instead of place, library and profile with a passphrase each.
- **A sync server of the household's own** (one code base as a
  container and as a Cloudflare Worker) and further storage adapters.
- **New shared packages** (host code, catalogue): they are added when a
  second app needs them, as before.

## Consequences

- "Pinned to an exact tag" and "the owner sets the tags" no longer
  apply; the parts' rules say so.
- A session that works on one app can read and change every part.
- Unmerged branches of the old repositories were not imported; work on
  them has to be brought over by hand.
- Deploys still go to the addresses of each app and need their secrets
  in this repository.
