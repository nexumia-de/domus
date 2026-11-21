# Culina

A helper in the kitchen that teaches until it is no longer needed
([decision](docs/decisions/mentor.md)): scripted, without a language
model, from research and textbooks; ratios and templates, dishes built
from components, cooking from what is there, and your own versions with
tasting notes. Visible name:
**Cook's Notebook** ([decision](docs/decisions/app-name.md)). Knowledge
of this repository: [docs/index.md](docs/index.md).

Culina is a web app (PWA) that is also installed on Android and Linux,
not a GTK app; the GTK rules do not apply. The exception is its native
Linux app (`packages/linux`, [docs](docs/native-linux.md)), a GTK app with
its own `AGENTS.md`. Its sister app for drinks,
[Mixtura](../mixtura), is built first
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
- **Recipes**: shipped dishes, read-only, each with its country and
  following one named source (amounts as facts, method in our own words,
  no copied text, no bulk import of a site), and the user's own
  components and dishes with versions; both in one list with one filter
  ([one dish list](docs/decisions/one-dish-list.md)). No meal plans and no food diary. No shopping list inside
  Culina: that is the sister app emptio; Culina only offers to hand
  missing ingredients to it
  ([helper](docs/decisions/mentor.md),
  [recipe book](docs/decisions/recipe-book.md)).
- **Teaching is scripted and sourced.** No language model. Every
  caution, question and explanation names a paper or textbook, or is
  marked as a judgement. Teaching belongs to skills; a skill the user
  marked as learned is not taught again.
- **Sources and licences.** Every ratio, pairing and data set names its
  source and licence. No data from FlavorDB or RecipeNLG.
- No code copied from Mixtura or materia.

## Before committing

1. From the root, `npm run check:culina` passes (format, lint,
   typecheck, tests).
2. `docs/` updated in the same commit.
