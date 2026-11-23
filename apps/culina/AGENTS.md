# Culina

The user opens the app and finds quickly what they want to cook or can
cook ([decision](docs/decisions/building-kit.md)). It answers two
problems: no idea what to cook, and not knowing what goes together. A
dish is put together from a building kit (shipped bases such as sauces,
doughs and frames like tacos or pizza, components that fill slots,
ingredients; [recipe app](docs/decisions/scope-recipe-app.md)); a recipe
is a notebook entry of what was built, with versions and tasting notes;
taste profiles of ingredients are to say what a dish still needs and
what fits (not built); skills with sourced notes are there to learn
abilities ([helper](docs/decisions/mentor.md)). Scripted, without a
language model. Visible name:
**Cook's Workbench** ([decision](docs/decisions/app-name.md)). Knowledge
of this repository: [docs/index.md](docs/index.md).

Culina is a web app (PWA) that is also installed on Android and Linux,
not a GTK app; the GTK rules do not apply. The exception is its native
Linux app (`packages/linux`, [docs](docs/native-linux.md)), a GTK app with
its own `AGENTS.md`. Its sister app for drinks,
[Mixtura](../mixtura), was built first
([decision](docs/decisions/after-mixtura.md)). The rules of the
[root](../../AGENTS.md) apply too.

## Rules

- **The general model comes from materia**, used from this repository
  ([decision](docs/decisions/shared-model.md),
  [one repository](../../docs/decisions/one-repository.md)). Culina's
  engine adds the kitchen rules (mass, baker's percentages, yields);
  what Mixtura needs too moves to materia.
- **Own local data, offline first.** No server, no account, no
  telemetry.
- **Recipes**: shipped bases and dishes, read-only, each with its cuisine and
  following one named source (amounts as facts, method in our own words,
  no copied text, no bulk import of a site), and the user's own
  components and dishes with versions; both in one list with one filter
  ([one dish list](docs/decisions/one-dish-list.md)). A frame (tacos, bowl) is the project's own
  composition and says so; each component in it keeps its source
  ([building kit](docs/decisions/building-kit.md)). No meal plans and no food diary; the notebook
  may keep the date a dish was cooked, no more. No shopping list inside
  Culina: that is the sister app emptio; Culina only offers to hand
  missing ingredients to it
  ([helper](docs/decisions/mentor.md),
  [recipe book](docs/decisions/recipe-book.md)).
- **Help is scripted and sourced.** No language model. Every
  caution, question and explanation names a paper or textbook, or is
  marked as a judgement. Teaching notes belong to skills; a skill the user
  marked as learned is not taught again.
- **Sources and licences.** Every ratio, pairing and data set names its
  source and licence. Pairings come from FlavorDB (CC BY-NC-SA 3.0), kept
  as one data file of its own that names source, licence and changes
  ([decision](docs/decisions/flavordb.md)); Culina is non-commercial. No
  data from RecipeNLG.
- No code copied from Mixtura or materia.

## Before committing

1. From the root, `npm run check:culina` passes (format, lint,
   typecheck, tests).
2. `docs/` updated in the same commit.
