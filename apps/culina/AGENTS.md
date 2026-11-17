@../phosh-toolkit/agents/core.md

# Culina

A cook's notebook for people who no longer need a recipe box: ratios and
templates instead of recipes, dishes built from components, cooking from
what is there, and your own versions with tasting notes. Visible name:
**Cook's Notebook** ([decision](docs/decisions/app-name.md)). Knowledge
of this repository: [docs/index.md](docs/index.md).

Culina is a web app (PWA) that is also installed on Android and Linux,
not a GTK app; the GTK rules do not apply. Its sister app for drinks,
[Mixtura](https://github.com/nexumia-de/mixtura), is built first
([decision](docs/decisions/after-mixtura.md)).

## Rules

- **Engine code waits for the shared-model decision** (issue #2).
  Mixtura's engine exists; until that is settled the packages hold only
  tooling placeholders.
- **Own local data, offline first.** No server, no account, no
  telemetry.
- **Not a recipe manager.** Recipe import, meal plans and shopping lists
  exist in Mealie, Tandoor and Grocy
  ([existing tools](docs/existing-tools.md)); Culina does not rebuild
  them.
- **Sources and licences.** Every ratio, pairing and data set names its
  source and licence. No data from FlavorDB or RecipeNLG.
- No code copied from Mixtura: what both need moves into shared code.

## Before committing

1. `npm run check` passes (format, lint, typecheck, tests).
2. `docs/` updated in the same commit.
