@../phosh-toolkit/agents/core.md

# Domus

The household apps and what they share, in one repository
([decision](docs/decisions/one-repository.md)). Knowledge of the whole:
[docs/index.md](docs/index.md); each part has its own `docs/` and its
own `AGENTS.md`, which apply in addition to this file when you work
there.

| Folder           | What                                                     |
| ---------------- | -------------------------------------------------------- |
| `packages/model` | materia, the general model: pure, no domain, no host API |
| `apps/mixtura`   | Mixtura (Drink Builder), a workbench for mixed drinks    |
| `apps/culina`    | Culina (Cook's Notebook), a helper in the kitchen        |
| `apps/emptio`    | Emptio (Shopping List), the household's shopping list    |
| `apps/domus`     | the page at the root of the one address                  |
| `scripts`        | checks and the site build that span the parts            |

These are web apps (PWA) and libraries, not GTK apps; the GTK rules do
not apply.

## Rules

- **Parts stay apart.** An app imports nothing of another app, and a
  shared package imports nothing of an app; `npm run boundaries` checks
  it. What two apps need moves to a shared package, never in advance
  and never as a copy.
- **A shared package is changed together with its users.** A change to
  `packages/model` that breaks an app is fixed in the app in the same
  commit; there are no version tags to wait for.
- **Each part keeps its rules.** Read the `AGENTS.md` of the part you
  change: the purity of the model, the sources and licences of data,
  no language model in Culina, and so on.
- **Own local data, offline first.** No server of ours, no account, no
  telemetry, in every app.

## Before committing

1. From the root: `npm run check:<part>` for every part you changed
   (`model`, `mixtura`, `culina`, `emptio`), and `npm run check` (all
   parts, the boundaries and the root files) when you changed
   `packages/`, a root file or more than one part.
2. `docs/` of the part updated in the same commit; a change that
   concerns the whole repository goes into the root `docs/`.
