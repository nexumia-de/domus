# The list package (name provisional)

The household's shopping list as every app writes it: the entry, its
record in the collection `list` of a space, and the rules for putting
something on it (the category of a new entry, twice the same). Pure.
Used by [Emptio](../../apps/emptio) (the shopping list) and
[Culina](../../apps/culina) (which hands what a dish lacks to the list),
from this repository; the rules of the [root](../../AGENTS.md) apply
too. Knowledge of this part: [docs/index.md](docs/index.md).

The folder `packages/list` and the npm name `@nexumia-de/list` are
provisional: the owner chooses the name (the neighbours are `materia`
and `hospes`). The name stands in this file, `package.json`, the
`package.json` of its users, the root `package.json`, the CI workflow
and the lockfile; everything else says "the list package".

This is a library, not an app; the GTK rules do not apply.

## Rules

- **Pure.** No clock, no randomness, no host API, no logging; time and
  ids come in as input. No dependency at run time, not on the host
  package either (`hospes`): the apps run its plans inside the host
  package's `localChange`. The lint rule, `test/purity.test.ts` and
  `npm run boundaries` keep it so.
- **Only what two apps that write the list need.** The order of the
  list, categories, stores, suggestions and KitchenOwl stay in Emptio;
  what Culina knows about dishes stays in Culina. Code moves here when a
  second app needs it, never in advance, and never as a copy.
- **A change here changes Emptio.** Every app that writes the list
  writes it by these rules; a change of a rule is a change of the
  household's list and is the owner's to decide. Today's weaknesses are
  listed in [rules](docs/rules.md#open-weaknesses) and are not changed
  without the owner.
- **Every rule has a test vector** in `vectors/`, run through the
  public entry `src/index.ts` only. Examples may name foods; rules may
  not.
- **Sources and licences.** Every data set names its source and licence
  in the data (`data/usual-items.json`).
- **The public entry is a contract.** A removed or changed export is
  changed in Emptio and Culina in the same commit and gets a line in
  `docs/log.md`.

## Before committing

1. From the root, `npm run check` passes (the list package, Emptio and
   Culina use it).
2. `docs/` updated in the same commit.
