---
type: Decision Record
title: The shared model comes from materia
description: Accepted by the owner on 2026-11-18. The general model lives in the public repository nexumia-de/materia; Culina's engine depends on its npm package as a git dependency at an exact version tag (v0.2.0) and adds the kitchen rules itself; materia has no unit system, so mass and baker's percentages are Culina's.
tags: [decision, architecture, mixtura, shared-code, dependencies, materia]
generated: { by: claude-code/2.1.326, at: 2026-11-18 }
sources:
  - id: mixdecision
    title: 'Mixtura: Where the shared model lives (options weighed, accepted 2026-11-18)'
    url: https://github.com/nexumia-de/mixtura/blob/main/docs/decisions/shared-model.md
  - id: inventory
    title: 'Mixtura: Shared model inventory (general and drink-specific modules)'
    url: https://github.com/nexumia-de/mixtura/blob/main/docs/shared-model.md
  - id: modules
    title: 'materia: docs/modules.md and src/index.ts at tag v0.2.0 (commit 588d744)'
    url: https://github.com/nexumia-de/materia/blob/v0.2.0/docs/modules.md
  - id: issue
    title: "Culina issue #2, comment of 2026-11-18 with the owner's decision"
    url: https://github.com/nexumia-de/culina/issues/2
---

# The shared model comes from materia

**Status: accepted.** The owner chose on 2026-11-18[^issue]; the options
(own repository, a package in phosh-toolkit, a monorepo, a registry,
submodules) are weighed in Mixtura's record[^mixdecision] and not
repeated here.

## Decision

1. The general model lives in
   [nexumia-de/materia](https://github.com/nexumia-de/materia) (public,
   AGPL-3.0-or-later), one npm package `@nexumia-de/materia`.
2. `@culina/engine` depends on it as a git dependency at an exact
   version tag, `github:nexumia-de/materia#v0.2.0`; the lockfile records
   the commit (`588d744`). Never a branch. A test in
   `packages/engine/test/model.test.ts` fails when the dependency is not
   a version tag or the installed version differs.
3. `packages/engine/src/model.ts` re-exports the general functions that
   need no kitchen shape. The generic functions (`inheritedValue`,
   `resolvePrepared`, `fillSlots`, `matchTemplates`, `findVariants`,
   `diffVersions`) are called by Culina's own modules with Culina's
   lists (roles, inherited properties, compared fields), as Mixtura does
   with its drink lists[^inventory].
4. materia has no unit system[^modules]. Culina's amounts (mass first,
   baker's percentages, yields) are written in Culina's engine (issue
   #8). What turns out general moves to materia by a pull request there;
   the owner sets the tag.
5. Nothing is copied from Mixtura or from materia.

## What materia 0.2.0 holds

Read from its entry at the tag[^modules]: the ingredient tree with
inheritance and substitution classes, the prepared-ingredient resolver,
templates with role slots and ratio matching (the measure is a
parameter), spec versions (diff, family, riff summary), stock (makeable,
missing one, unlock ranking), shelf life, and the general parts of sync
(record merge, places, document and envelope formats, adapter and
cipher interfaces, the pure sync step).

## Consequences

- Engine code may be written; the rule that held it back is removed
  from `AGENTS.md`.
- Culina does not build sync now. So that it can use materia's sync
  later, every stored user entity carries `updatedAt` from the start and
  removals stay representable (a removed record is kept as a marker, not
  dropped); the local store (issue #15) follows this.
- `npm ci` needs `github.com` for the git dependency and builds materia
  by its `prepare` script.
