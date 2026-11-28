# Culina

Culina is the daily driver of a cook who wants to get better at cooking
and more varied, and who has ingredients without knowing whether they go
together ([daily flow](docs/decisions/daily-flow.md)). One flow: three
ideas for today without any input (proven, new but close, in season);
"I have" and "Cooking now", which say what fits, when to add it, what
it still needs and what dish it can become
([daily helper](docs/decisions/daily-helper.md)); one learning point per
dish from the skills ([helper](docs/decisions/mentor.md)); a short verdict
after cooking. No inventory is kept except the staples, set up once. The
user still opens the app to find quickly what to cook
([building kit](docs/decisions/building-kit.md)): a dish is put together
from a building kit (shipped bases such as sauces, doughs and frames like
tacos or pizza, components that fill slots, ingredients;
[recipe app](docs/decisions/scope-recipe-app.md)), which is the way to
vary it; a recipe is a notebook entry of what was built, with versions
and tasting notes. Scripted, without a
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
- **No inventory to keep** ([daily flow](docs/decisions/daily-flow.md)).
  Nothing in the daily flow asks for stock with amounts or dates, and
  what the user ticks in "I have" or "Cooking now" is never written to
  the stock. The staples (marked "always there") are the one stock the
  flow reads.
- **Recipes**: shipped bases and dishes, read-only, each with its cuisine.
  New shipped recipes are the project's own: written by an AI model
  from general cooking knowledge, the usual modern way, with every
  amount, for a stated number of persons, read once more by another
  agent, and marked in the app as the app's own recipe that nobody
  cooked ([own recipes](docs/decisions/own-recipes.md)). A recipe that
  follows a named source stays possible (amounts as facts, method in
  our own words, no copied text, no bulk import of a site). An
  ingredient the catalogue lacks is added to the catalogue from the
  USDA data, not worked around; and the user's own
  components and dishes with versions; both in one list with one filter
  ([one dish list](docs/decisions/one-dish-list.md)). A frame (tacos, bowl) is the project's own
  composition and says so; each component in it keeps its source
  ([building kit](docs/decisions/building-kit.md)). No meal plans and no food diary; the notebook
  may keep the date a dish was cooked, no more. No shopping list inside
  Culina: that is the sister app emptio; Culina only offers to hand
  missing ingredients to it
  ([helper](docs/decisions/mentor.md),
  [recipe book](docs/decisions/recipe-book.md)).
- **Help is scripted and sourced.** No language model in the running
  app; a model writes content (recipes, pairings), which is marked. Every
  caution, question and explanation names a paper or textbook, or is
  marked as a judgement. Teaching notes belong to skills; a skill the user
  marked as learned is not taught again.
- **Sources and licences.** Every ratio, pairing and data set names its
  source and licence. A pairing or recipe of the project's own
  is marked as such. Pairings come from FlavorDB (CC BY-NC-SA 3.0), kept
  as one data file of its own that names source, licence and changes
  ([decision](docs/decisions/flavordb.md)); Culina is non-commercial. No
  data from RecipeNLG.
- No code copied from Mixtura or materia.

## Before committing

1. From the root, `npm run check:culina` passes (format, lint,
   typecheck, tests).
2. `docs/` updated in the same commit.
