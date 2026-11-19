# materia

The general model shared by the web apps
[Mixtura](../../apps/mixtura) (drinks) and
[Culina](../../apps/culina) (cooking): the ingredient
tree, templates with role slots, versioned specs, stock and shelf life,
and the general parts of stock sync. One npm package,
`@nexumia-de/materia`, that the apps use from this repository
([decision](../../docs/decisions/one-repository.md)); the rules of the
[root](../../AGENTS.md) apply too. Knowledge of this part:
[docs/index.md](docs/index.md).

materia is a library, not an app; the GTK rules do not apply.

## Rules

- **Nothing of one domain.** No units, no drink rules (ABV, dilution),
  no kitchen rules (yields, baker's percentages). What a domain brings
  comes in as a parameter: roles, measures, compared fields, inherited
  properties.
- **Pure.** No clock, no randomness, no host API, no logging; time
  comes in as input. The lint rule, `test/purity.test.ts` and the check
  of the built bundle keep it so.
- **No runtime dependency.** The apps bundle the package; `prepare`
  builds `dist/` on install, and an app's check builds it again.
- **Every rule has a test vector** in `vectors/`, run through the
  public entry `src/index.ts` only.
- **Code moves here when a second app needs it, never in advance.**
- **The public entry is a contract.** A removed or changed export is
  changed in the apps in the same commit and gets a line in
  `docs/log.md`; `npm run check` from the root shows what it breaks.
- Examples in vectors may name drinks or food; rules may not.

## Before committing

1. From the root, `npm run check` passes (all parts, because the apps
   use this package).
2. `docs/` updated in the same commit.
