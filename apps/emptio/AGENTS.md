# Emptio

The household's shopping list: entries with a priority, categories that
follow the store one is in, shared in the household, and tied to what
Culina and Mixtura know about stock. Visible name: **Shopping List**.
Knowledge of this repository: [docs/index.md](docs/index.md).

Emptio is a web app (PWA) that is also installed on Android and Linux,
not a GTK app; the GTK rules do not apply. Its sister apps are
[Culina](../culina) (cooking) and
[Mixtura](../mixtura) (drinks); the umbrella
of all of them is Domus, this repository, whose
[rules](../../AGENTS.md) apply too.

## Rules

- **Own local data, offline first.** No server of ours, no account, no
  telemetry. The only requests to another host go to storage or a
  connector the household configured; without one the app sends none.
- **Shared code is used, not copied.** The general model comes
  from [materia](../../packages/model) in this repository; nothing of
  shopping goes there. No code copied from Culina, Mixtura or materia.
- **Derive, don't store.** The order of the list, what a store hides,
  counts and proposals are computed every time; only what a person
  entered is stored.
- **The engine is pure**: no clock, no randomness, no host API. Every
  rule has a test vector, run through `packages/engine/src/index.ts`.
- **The household's order wins.** What a person arranged by hand is
  never changed by the app; the app only proposes.
- **Sources and licences.** Every category list, starting route and
  data set names its source and licence in the data.
- Screens work at 360 × 720 with touch and at desktop size.

## Planning

No milestones for Emptio
([decision 8](docs/architecture.md#decisions)): each goal of
[docs/roadmap.md](docs/roadmap.md) is an issue and its work items are
sub-issues. Work on the lowest open goal and do not start a later one
without asking.

## Before committing

1. From the root, `npm run check:emptio` passes (format, lint,
   typecheck, tests).
2. `docs/` updated in the same commit.
