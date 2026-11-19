@../phosh-toolkit/agents/core.md

# Mixtura

A workbench for mixed drinks, with and without alcohol, for people who
no longer need a recipe list: drinks as templates with role slots,
balance as numbers, your own specs with versions, and what your bottles
allow. Visible name: **Drink Builder**
([decision](docs/decisions/app-name.md)). Knowledge of this repository:
[docs/index.md](docs/index.md).

Mixtura is a web app (PWA) that is also installed on Android and Linux,
not a GTK app ([decision](docs/decisions/pwa-own-data.md)); the GTK
rules do not apply. Its sister app for cooking is
[Culina](https://github.com/nexumia-de/culina).

## Architecture rules

- **Own local data, offline first.** No server of ours, no account, no
  telemetry. The only requests to another host go to storage the user
  configured for stock sync, which is off by default; a place without a
  binding sends none, and local data works offline as before
  ([decision](docs/decisions/stock-sync.md)).
- **Shared code lives in materia.** The general model and the general
  parts of sync are in [materia](https://github.com/nexumia-de/materia),
  pinned to an exact tag; nothing drink-specific goes there, and a bug
  in it is fixed there ([decision](docs/decisions/shared-model.md)).
- **Derive, don't store.** What can be made, balance numbers, cost and
  "what unlocks the most" are computed from specs, ingredients and stock
  every time; only what the user entered is stored.
- **The engine is pure**: no clock, no randomness, no host API. Every
  rule and formula has a test vector.
- **Numbers are ranges, not verdicts.** Balance figures are shown
  against the usual range of a template and never call a drink wrong.
- **Sources and licences.** Every seed recipe, ingredient property and
  pairing names its source and licence in the data. No data from
  TheCocktailDB or FlavorDB ([existing tools](docs/existing-tools.md)).
- Screens work at 360 × 720 with touch and at desktop size.

## Before committing

1. Build and tests pass (once there is code).
2. `docs/` updated in the same commit.
