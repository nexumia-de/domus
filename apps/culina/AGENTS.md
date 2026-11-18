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

- **The general model comes from materia**, pinned to an exact version
  tag ([decision](docs/decisions/shared-model.md)). Culina's engine adds
  the kitchen rules (mass, baker's percentages, yields); what Mixtura
  needs too moves to materia by a pull request there.
- **Own local data, offline first.** No server, no account, no
  telemetry.
- **Your own recipe book**: recipes are components and dishes with
  versions. No scraping of recipe sites and no meal plans; those exist
  in Mealie, Tandoor and Grocy
  ([existing tools](docs/existing-tools.md)). No shopping list inside
  Culina: that is the planned sister app emptio; Culina only offers to
  hand missing ingredients to it
  ([decision](docs/decisions/recipe-book.md)).
- **Sources and licences.** Every ratio, pairing and data set names its
  source and licence. No data from FlavorDB or RecipeNLG.
- No code copied from Mixtura or materia.

## Before committing

1. `npm run check` passes (format, lint, typecheck, tests).
2. `docs/` updated in the same commit.
