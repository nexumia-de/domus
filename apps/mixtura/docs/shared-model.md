---
type: Specification
title: Shared model inventory
description: Which engine modules are general and which are drink-specific, read from the code; the places where general modules still depend on drink rules; what Culina needs differently; and the order in which the general model can move out with Mixtura's public engine API unchanged.
tags: [engine, architecture, culina, shared-code]
generated: { by: claude-code/2.1.326, at: 2026-11-17 }
sources:
  - id: two-apps
    title: 'Decision: two apps, one engine'
    url: decisions/two-apps-one-engine.md
  - id: engine
    title: 'Engine (public entry, general model apart from drink rules)'
    url: engine.md
  - id: code
    title: 'packages/engine/src at commit b28e70e (imports and exports read with grep, 2026-11-17)'
    url: ../packages/engine/src/index.ts
  - id: chef
    title: 'Culina: How chefs work, at commit deccaf4'
    url: https://github.com/nexumia-de/culina/blob/main/docs/chef-practice.md
  - id: culina-roadmap
    title: 'Culina: Roadmap, at commit deccaf4'
    url: https://github.com/nexumia-de/culina/blob/main/docs/roadmap.md
  - id: culina-after
    title: 'Culina: Culina follows Mixtura on the same engine, at commit deccaf4'
    url: https://github.com/nexumia-de/culina/blob/main/docs/decisions/after-mixtura.md
---

# Shared model inventory

The first part of Mixtura issue #43 (Culina issue #2): what of the engine
is the general model that Culina will share, and what is drink-specific.
Read from the code at commit `b28e70e`[^code] by imports and exports; the
split already exists as two files, `src/model.ts` (general) and
`src/drink.ts` (drink-specific)[^engine], but the folders behind
`model.ts` are not yet free of drink rules. Where the package lives is
the [shared model decision](decisions/shared-model.md) (needs decision).

# Modules

| Module (`packages/engine/src/`)                                    | Exported through                           | Kind                            | Notes                                                                                       |
| ------------------------------------------------------------------ | ------------------------------------------ | ------------------------------- | ------------------------------------------------------------------------------------------- |
| `amounts/` (parse, convert, scale, format, rounding, unit table)   | `model.ts`                                 | Mixtura only (step 6)           | not moved to materia; unit table `data/units.json`; `UnitId` is a closed union              |
| `ingredients/tree.ts`, `properties.ts` (tree, levels, inheritance) | `model.ts`                                 | general (step 3)                | `ancestors`, `descendants`, `isA`, `resolveCost`; generic `inheritedValue` internal         |
| `drink-ingredients/` (step 3)                                      | `drink.ts`                                 | drink-specific                  | `Ingredient`, `Role`, `InheritedProperty`, `resolveProperty`, `resolveAll`, `INHERITED`     |
| `ingredients/substitution.ts`, `swap-candidates.ts`                | `model.ts`                                 | general                         | substitution classes, `swapCandidates` groups by class, role and tree                       |
| `ingredients/prepared.ts` (prepared components)                    | types through `model.ts`                   | general (step 2)                | `resolvePrepared` walks nesting and cycles with a caller's fold; internal                   |
| `balance/prepared.ts` (step 2)                                     | `drink.ts`                                 | drink-specific                  | `computePrepared`: ABV, sugar and acid by the mixing formulas                               |
| `balance/mixture.ts` (step 1)                                      | types only, through `drink.ts`             | drink-specific                  | the mixing formulas of [balance](balance.md); used by `balance/prepared.ts`                 |
| `drink-ingredients/unit-volumes.ts` (step 6)                       | not exported                               | drink-specific                  | ml per counted unit; reads the unit table                                                   |
| `templates/slots.ts`, `match.ts` (roles, slots, matching)          | `lineRole` through `model.ts`              | general                         | measure a parameter (step 5), role ids generic (step 4)                                     |
| `drink-templates/volume.ts` (step 6)                               | `assignSlots`, `lineMl` through `drink.ts` | drink-specific                  | the ml measure; reads the unit table                                                        |
| `templates/variants.ts`                                            | internal                                   | general (step 4)                | `findVariants` by a variant class of the domain                                             |
| `drink-templates/match.ts`, `types.ts` (step 4)                    | `drink.ts`                                 | drink-specific                  | `matchSpec`, `variantSuggestions`; drink `Template` and role-typed shapes                   |
| `drink-templates/range.ts`, `data.ts` (step 1)                     | `drink.ts`                                 | drink-specific                  | usual ABV, sugar, acid ranges; the six root and four variant templates                      |
| `specs/` (versions: diff, family, riff summary)                    | `model.ts`                                 | general (step 7)                | `diffVersions` takes the compared fields (internal); comparison types generic               |
| `drink-specs/` (step 7)                                            | `drink.ts`                                 | drink-specific                  | `diffSpecs` with `method`, `glass`, `garnish`, `topMl`; `DiffLine`, `DiffSpec`, `SpecField` |
| `stock/` (makeable, missing one, unlock ranking)                   | `model.ts`                                 | general                         | imports only `ingredients/`; stock is present or not                                        |
| `shelf/` (dates, expiry, limiting shelf life)                      | `model.ts`                                 | general                         | whole-day calendar arithmetic, `fresh`, `use-soon`, `past`                                  |
| `balance/` (dilution, figures, lines, sums)                        | `drink.ts`                                 | drink-specific                  | dilution model `data/dilution.json`                                                         |
| `batch/` (scale lines, pre-diluted batch, batch shelf life)        | `drink.ts`                                 | drink-specific, scaling general | `scaleLine` and `scaleLines` take balance lines                                             |
| `alcohol/` (classes, thresholds, presets)                          | `drink.ts`                                 | drink-specific                  | `data/alcohol-thresholds.json`                                                              |

- **Export exchange**: since issue 65 the pure parts are the engine
  module `exchange/` (`build.ts`, `merge.ts`, `migrate.ts`, `parse.ts`),
  exported through `model.ts`: general mechanisms (file envelope,
  version check, migrations, merge and replace plan). `parse.ts` calls
  `findFamilyCycles`; `build.ts` names Mixtura's entity kinds. The parts
  that use IndexedDB stay in the app, `packages/app/src/store/exchange/`.
  The export schema is `packages/engine/schemas/export.schema.json`.

Outside the engine code:

- **Schemas** in `packages/engine/schemas/` (`ingredient`, `spec`,
  `template`, `stock`, `prepared-ingredient`, `common`, `affinity`,
  `export`) carry the drink fields beside the general ones.
- **Vectors** in `packages/engine/vectors/`: `amounts`, `ingredients`,
  `specs`, `stock`, `shelf`, `templates` (matching part) and `variants`
  test general modules; `balance`, `batch`, `classics`, `non-alcoholic`
  and the range vectors of `templates` test drink rules.

# Coupling points

Places where a module exported through `model.ts` depends on drink
rules (found with `grep "from '../"` over `src/`, tests excluded):

1. **Drink properties in the ingredient type.** Resolved in step 3:
   `ingredients/types.ts` has `BaseIngredient` (role a string,
   `assumed` a string list) and `BaseInheritedProperty`;
   `drink-ingredients/types.ts` has `Ingredient` with `abv`, `sugar`,
   `acid`, `InheritedProperty` and `INGREDIENT_FIELDS`. The general walk
   `inheritedValue` (`ingredients/properties.ts`) takes the "computed
   when prepared" list; `resolveProperty`, `resolveAll` and `INHERITED`
   are in `drink-ingredients/properties.ts` and exported through
   `drink.ts`. The tree is generic (`IngredientTreeOf<I>`); the public
   `IngredientTree` and `TreeResult` are the drink trees.
2. **Drink roles as a closed union.** Resolved in steps 3 and 4:
   `Role` is in `drink-ingredients/types.ts`; the general ingredient's
   role is a string and `SwapOptions.role` takes any string. The
   general template types (`Template`, `TemplateSlot`, `MatchLine`,
   `MatchSpec`, `SlotFill`, `SlotAssignment`, `Candidate`,
   `MatchResult`, `OpenSlot`) are generic in the role id `R`, and
   `drink-templates/types.ts` gives the public names their drink shape
   with `Role`.
3. **Balance formulas used by `ingredients/`.** Resolved in steps 1
   and 2: the mixing formulas are `balance/mixture.ts`, and
   `computePrepared` is `balance/prepared.ts` (exported through
   `drink.ts`) on top of the general resolver `resolvePrepared`. The
   general `PreparedLine` still has `ml` and `sugarG`, and
   `PreparedSpec` `addedWaterMl` and `yieldMl` (volume only).
4. **Template range check in the templates folder.** Resolved in
   step 1: `range.ts` and `data.ts` are in `drink-templates/`, and
   `templates/index.ts` exports only general functions.
5. **Drink fields in the template types.** Resolved in step 4: the
   general `Template` has no `alcohol`, `usual` or `glass`; the drink
   `Template`, `MatchOptions.alcohol`, `RangeFigure`, `RangeStatus` and
   `RangeCheck` are in `drink-templates/types.ts`. Found on the way:
   `templates/match.ts` used the `base` slot as the ratio reference
   and `templates/variants.ts` replaced the `base` lines; both are now
   roles of the domain (`MatchDomain.referenceRole`,
   `VariantDomain.replacedRole`).
6. **Ratios by volume.** Resolved in step 5: `fillSlots`
   (`templates/slots.ts`), `matchTemplates` and `findVariants` take a
   measure function (`LineMeasure`: a line to a number, or an
   `UnmeasuredReason`). `templates/volume.ts` holds `lineMl` and the
   public `assignSlots`, and the drink `matchSpec` and
   `variantSuggestions` pass the volume measure. Left as they are: the
   slot sum is still the field `SlotFill.ml`, `MatchLine` has `topMl`,
   and `UnmeasuredReason` names volume reasons (`mass`,
   `top-without-volume`); `unit-volumes.ts` stays volume-only.
7. **Bar units and pour precision in amounts.** Open (step 6 not
   done). `amounts/types.ts` `UnitId` lists `barspoon`, `dash`, `drop`,
   `splash`, `top` and no `kg` or `lb`; `amounts/rounding.ts` holds the
   bar pour grid (2.5 ml steps) and the exact grid; `amounts/table.ts`
   reads `data/units.json` at build time. Found while starting step 6:
   `amounts/format.ts` also hard-codes unit words (`bar spoon`,
   `dashes`), symbols (`imp oz`), the ounce per display system, the
   display unit mapping (`displayUnit`) and the exact-grid steps;
   `amounts/parse.ts` builds its symbol map from the table at load; the
   general `ingredients/unit-volumes.ts` and `templates/volume.ts` read
   the drink table (`UNITS`) directly; and `Amount`, `UnitOverrides`
   and `UnitId` appear in public types of balance, batch and templates.
8. **Drink fields in version diffs.** Resolved in step 7: the general
   `diffVersions` (`specs/diff.ts`) takes the spec fields to compare, in
   order, and the line fields that count as the amount; the drink
   `diffSpecs` (`drink-specs/diff.ts`, exported through `drink.ts`)
   passes `method`, `glass`, `garnish` and `topMl`. `summariseRiff` is
   generic in the line and field types.
9. **Variants keyed by alcohol class.** Resolved in step 4, together
   with `templates/match.ts`, which also chose variants by
   `options.alcohol`: the general `matchTemplates` and `findVariants`
   take a `variantClass` function and the wanted class; the drink
   `matchSpec` and `variantSuggestions` (`drink-templates/match.ts`,
   exported through `drink.ts`) pass `template.alcohol` and
   `options.alcohol`. The data keeps its `alcohol` field, so the class
   is a function, not a renamed field.

`stock/` and `shelf/` have no coupling: they import only types and tree
functions from `ingredients/` (`shelf/limiting.ts` uses the general
`resolvePrepared` of `ingredients/prepared.ts` since step 2). Drink modules
depending on general ones (`balance/` on `amounts/` and `ingredients/`,
`batch/` on `balance/`, `alcohol/` on `ingredients/` and
`balance/types.ts`) are the allowed direction.

# What Culina needs differently

From Culina's own documents[^chef][^culina-roadmap][^culina-after]:

| Need                                                                                                              | What the engine has                                                           | Gap                                                                  |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Ratios by weight (bread 5 : 3, pasta 3 : 2)                                                                       | slot ratios in ml (coupling 6)                                                | measure lines by mass; a measure chosen per domain                   |
| Baker's percentages (flour = 100 %)                                                                               | parts against a reference slot in `match.ts`                                  | the same mechanism by mass, shown as percent of the reference        |
| Kitchen roles (acid, fat, aromatic, crunch, starch, umami; dish roles main, sauce, crunch, acid, garnish, starch) | closed drink `Role` union (coupling 2)                                        | roles as data per domain                                             |
| Kitchen units (kg, lb, cups of flour)                                                                             | bar units, pour grid (coupling 7)                                             | unit table per domain; volume to mass needs a density per ingredient |
| Components with yields                                                                                            | `prepared.yield` as one `Quantity` in ml                                      | yield by weight, yield per state (raw, cooked)                       |
| As purchased against edible portion: yield = edible / purchased; cost per edible unit = price / yield             | `resolveCost` per ingredient, no yield factor                                 | yield factor on the ingredient, cost per edible unit                 |
| Scaling by weight; time and salt do not scale linearly                                                            | `amounts/scale.ts` linear; batch scaling is in `batch/` (drink)               | general linear scaling; non-linear rules are kitchen rules           |
| Perishable stock: amount, state, date prepared, use-by                                                            | `StockEntry` is `present` only; the stock schema has `openedOn`, `bestBefore` | amount and state on stock records                                    |
| Expiry                                                                                                            | `shelf/` with `fresh`, `use-soon`, `past` from a made-on date                 | reusable as it is; use-by entered as a date                          |
| "What can I make" ranked by urgency, then roles covered                                                           | `unlockRanking` ranks what to buy by specs unlocked                           | a second ranking over makeable results, by days left                 |
| Versions with date, change, reason, tasting note                                                                  | `specs/` diff and family; notes stored by the app                             | general; diff fields per domain (coupling 8)                         |
| Salt figures (soups 0.8–1.2 %, bread 2 %), allergens (14 of EU Regulation 1169/2011), season, affinities          | balance figures are drink-only                                                | kitchen rules, not shared                                            |
| Recipe format: Cooklang where possible (to be confirmed)                                                          | Mixtura's export format                                                       | the exchange mechanism may be shared, the file format is per app     |

The rule "shared code moves when a second app needs it, never in
advance"[^two-apps] applies to the gaps too: the extraction makes the
seams (properties, roles, measure, units as data) general, and Culina
adds weights, perishable stock and urgency when it builds them.

# Extraction order

Each step is one pull request in Mixtura; `test/index.test.ts` and
`test/public-api.test.ts` pin the exported names and stay unchanged in
every step, and every vector passes unchanged. Drink-specific names keep
their current types by re-export (`Role`, `Ingredient`, `Template` stay
the drink shapes in Mixtura).

1. **Move the drink files out of general folders** (done). `ingredients/mixture.ts`
   to `balance/`; `templates/range.ts` and `templates/data.ts` to a drink
   folder (for example `drink-templates/`); `templates/index.ts` then
   exports only general functions. No behaviour change.
2. **Split prepared components** (done). A general resolver in
   `ingredients/prepared.ts` (nesting, cycles, unknown specs, yield) that
   takes a property function; drink `computePrepared` in `balance/`
   passes the mixing formulas. `computePrepared` keeps its name,
   signature and results; `limitingShelfLife` uses the general resolver.
3. **Properties and roles as parameters** (done). The general ingredient type
   carries `id`, `name`, `level`, `parentId`, `role` (a string),
   `shelfLifeDays`, `storage`, `substitutionClass`, `cost`,
   `unitVolumes`, `prepared`, `assumed`, `source`, `notes`; the drink
   type extends it with `abv`, `sugar`, `acid` and the drink `Role`
   union. `resolveProperty` and `INHERITED` take the inherited list from
   the domain; the "computed when prepared" list too.
4. **Template types and variants** (done). General `Template` without
   `alcohol`, `usual` and `glass`; the drink `Template` extends it.
   Variants keyed by a general class field, filled with the alcohol
   class by the drink side.
5. **Measure as a parameter** (done). `assignSlots` and `matchSpec` take a
   measure function (line to a number, or a reason); the drink side
   passes today's `lineMl`. `unit-volumes.ts` stays volume-only until
   Culina needs mass per counted unit.
6. **Units as data.** The unit table and the rounding grid become inputs
   of the amounts module, with Mixtura's table and pour grid as the
   drink default, so `parseAmount`, `formatAmount` and the rest keep
   their signatures.
   Not done: larger than described (coupling 7). It needs a unit
   system as an input of every amounts function (table, rounding and
   exact grids, words, symbols, display mapping), unit ids that are
   strings in the general model with the drink `UnitId` kept by
   re-export, and the unit system passed to `unit-volumes.ts` and the
   volume measure. Whether the shared model carries a unit system at all
   or Culina brings its own amounts module is worth deciding first.
7. **Diff fields per domain** (done). `diffSpecs` takes the list of compared
   fields; the drink side passes `method`, `glass`, `garnish`, `topMl`.
8. **Move.** `amounts/`, `ingredients/` (without the drink parts),
   `templates/` (general part), `specs/`, `stock/`, `shelf/` with their
   general vectors and schema parts move into the shared package;
   `model.ts` re-exports them from there. The engine's `dist/engine.mjs`
   bundles the shared code, so the app sees no change.
9. **Exchange mechanism**, last and only if Culina's format decision
   wants it: the engine's `exchange/` module moves to the shared package
   with the entity kinds as a parameter.

Status after steps 1 to 5 and 7 (issue #43): the public names moved
between `model.ts` and `drink.ts` where they are drink rules
(`computePrepared`, `resolveProperty`, `resolveAll`, `INHERITED`,
`matchSpec`, `variantSuggestions`, `diffSpecs`), and the general modules
hold internal generic functions (`resolvePrepared`, `inheritedValue`,
`matchTemplates`, `findVariants`, `fillSlots`, `diffVersions`) that the
drink side calls with its lists. Still drink-coupled before step 8:

- `amounts/` (coupling 7, step 6 open), and through it
  `ingredients/unit-volumes.ts` and `templates/volume.ts`, which read
  the drink unit table.
- Volume names in general types: `PreparedLine.ml` and `sugarG`,
  `PreparedSpec.addedWaterMl` and `yieldMl`, `SlotFill.ml`,
  `MatchLine.topMl`, the volume reasons of `UnmeasuredReason`.
- `exchange/` names Mixtura's entity kinds and the drink `Ingredient`
  (step 9).
- `Template.method` is in the general template (kitchen templates have
  methods too, so it was kept).

Steps 1 to 7 change only Mixtura and are useful without Culina; step 8
needs the [decision](decisions/shared-model.md) on where the package
lives.

## Decided on 2026-11-18

The [decision](decisions/shared-model.md) is accepted: the package is
`@nexumia-de/materia` in
[nexumia-de/materia](https://github.com/nexumia-de/materia). It changes
two steps:

- **Step 6 becomes "cut the unit table out of the general modules"**
  and is no longer "units as data". Done (#118): the two files are
  `drink-ingredients/unit-volumes.ts` and `drink-templates/volume.ts`,
  `assignSlots` and `lineMl` are exported through `drink.ts`,
  `MatchOptions` exists only as the drink type, and
  `test/general-imports.test.ts` pins that `ingredients/`,
  `templates/`, `specs/`, `stock/` and `shelf/` import nothing from
  another folder of the engine. `amounts/` stays in Mixtura, with
  `ingredients/unit-volumes.ts` and `templates/volume.ts`, which move to
  the drink side; the general template types no longer name
  `UnitOverrides`. materia carries no unit system until Culina needs
  one.
- **Step 8 moves** `ingredients/` (tree, properties, substitution, swap
  candidates, prepared resolver), `templates/` (slots, matching,
  variants), `specs/`, `stock/` and `shelf/` with their general vectors;
  `amounts/` is not part of it. The volume names in general types
  (`PreparedLine.ml`, `SlotFill.ml`, `MatchLine.topMl`, the volume
  reasons of `UnmeasuredReason`) move as they are, because renaming
  them would change Mixtura's public API; they are renamed when Culina
  needs a mass measure.
- Step 9 (exchange) stays as written: not now.

[^code]: `packages/engine/src` at commit `b28e70e`, read 2026-11-17.

[^engine]: [Engine](engine.md)

[^two-apps]: [Two apps, one engine](decisions/two-apps-one-engine.md)

[^chef]: [Culina: How chefs work](https://github.com/nexumia-de/culina/blob/main/docs/chef-practice.md), sections Structures instead of recipes, Cooking from what is there, Operations, Data model that follows.

[^culina-roadmap]: [Culina: Roadmap](https://github.com/nexumia-de/culina/blob/main/docs/roadmap.md)

[^culina-after]: [Culina: Culina follows Mixtura on the same engine](https://github.com/nexumia-de/culina/blob/main/docs/decisions/after-mixtura.md)
