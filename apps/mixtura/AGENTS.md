# Mixtura

A workbench for mixed drinks, with and without alcohol, for people who
no longer need a recipe list: drinks as templates with role slots,
balance as numbers, your own specs with versions, and what your bottles
allow. Visible name: **Drink Builder**
([decision](docs/decisions/app-name.md)). Knowledge of this repository:
[docs/index.md](docs/index.md).

Mixtura is a web app (PWA) that is also installed on Android and Linux,
not a GTK app ([decision](docs/decisions/pwa-own-data.md)); the GTK
rules do not apply. Its native Linux app (`packages/linux`,
[docs](docs/native-linux.md)) is a GTK app and has its own
[rules](packages/linux/AGENTS.md). Its sister app for cooking is
[Culina](../culina). The rules of the [root](../../AGENTS.md) apply too.

## Architecture rules

- **Own local data, offline first.** No server of ours, no account, no
  telemetry. The only requests to another host go to the storage of a
  space the household set up in the Household app; a space that is on
  this device only sends none, and local data works offline as before
  ([decision](docs/decisions/stock-in-spaces.md)).
- **Shared code lives in materia.** The general model and the pure
  rules of sync are in [materia](../../packages/model), used from this
  repository; nothing drink-specific goes there, and a bug in it is
  fixed there ([decision](docs/decisions/shared-model.md),
  [one repository](../../docs/decisions/one-repository.md)).
- **Sync is the host package's.** Spaces, their storages, the cycle and
  the loop are in [packages/host](../../packages/host)
  (`@nexumia-de/hospes`). Mixtura has no sync code, storage, secret or
  invite of its own: it reads and writes the collection `stock` of a
  space and starts the host's loop for it. Spaces are made and left in
  the Household app and also in the native apps (owner, 2026-11-22, with
  the host's `createSpace` and the shared preferences group of
  `packages/gjs`); they are shared by invitation in the Household app.
- **Stock is taps, not bookkeeping.** At hand or not; no amounts, no
  booking, nothing the app asks for. The collection is shared with the
  other apps: keep the fields you do not know.
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

1. From the root, `npm run check:mixtura` passes (format, lint,
   typecheck, tests, build).
2. `docs/` updated in the same commit.
