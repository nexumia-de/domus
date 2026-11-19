---
type: Specification
title: Engine rules for amounts, scaling, baker's percentages and ratio templates
description: The unit table with exact factors, conversion and its errors, the explicit rounding step, scaling by weight with its cautions, baker's percentages and hydration (issue 8), and ratio templates with derivatives, family queries, the range check, scaling from an anchor, salt by basis and the seed templates with their source rows (issue 9), and components with yield, nesting, edible portion and portions (issue 10), and cross-record validation of the model with named findings (issue 36).
tags:
  [
    engine,
    units,
    conversion,
    scaling,
    bakers-percentage,
    hydration,
    rounding,
    ratio-templates,
    salt,
    range-check,
    components,
    yield,
    edible-portion,
    portions,
    validation,
    references,
    cycles,
  ]
generated: { by: claude-code/2.1.326, at: 2026-11-18 }
sources:
  - id: yardpound
    title: 'National Bureau of Standards: Refinement of values for the yard and the pound, Federal Register 24 (128), p. 5348, 1959-07-01 (F.R. Doc. 59-5442): "1 pound (avoirdupois) = 0.453 592 37 kilogram"; read 2026-11-18'
    url: https://www.govinfo.gov/content/pkg/FR-1959-07-01/pdf/FR-1959-07-01.pdf
  - id: nist
    title: 'NIST Handbook 44 (2026), Appendix C, General Tables of Units of Measurement: 1 gallon = 231 cubic inches = 128 fluid ounces; 16 ounces = 1 pound; 1 inch = 2.54 centimeters (exactly); 1 cup, measuring = 8 fluid ounces (exactly); 1 tablespoon, measuring = 3 teaspoons (exactly) = 1/2 fluid ounce (exactly); read 2026-11-18'
    url: https://www.nist.gov/system/files/documents/2025/12/30/appc-26-HB44-20251222.pdf
  - id: wm1985
    title: 'Weights and Measures Act 1985 (c. 72), Schedule 1, Part IV, Measurement of Capacity, imperial units: "Gallon = 4.546 09 cubic decimetres. Quart = 1/4 gallon. Pint = 1/2 quart. Gill = 1/4 pint. Fluid ounce = 1/20 pint."; read 2026-11-19'
    url: https://www.legislation.gov.uk/ukpga/1985/72/schedule/1
  - id: chef
    title: 'How chefs work, Operations: scaling goes by weight; cooking time and salt do not scale linearly'
    url: chef-practice.md#operations
  - id: vectors
    title: Test vector format
    url: vectors.md
  - id: ratios
    title: Ratios and salt percentages checked against sources
    url: ratios.md
  - id: datamodel
    title: Data model, ratio template
    url: data-model.md#ratio-template
  - id: yield
    title: 'Basic Kitchen and Food Service Management (BC Cook Articulation Committee, BCcampus; CC BY 4.0), chapter 3 "Food Costing", section 3.2 "Yield Testing" (AP, EP, yield percentage, factor; read 2026-11-18 on workforce.libretexts.org, the same book on opentextbc.ca answers 403)'
    url: https://workforce.libretexts.org/Bookshelves/Food_Production_Service_and_Culinary_Arts/Basic_Kitchen_and_Food_Service_Management_(BC_Campus)/03%3A_Food_Costing/3.02%3A_Yield_Testing
---

# Engine rules for amounts, scaling and baker's percentages

What the engine in `packages/engine/src/amounts`, `scale`, `bakers`,
`ratios`, `salt`, `components` and `yields` does, in the order a cook meets it. All functions are pure; a function
that can fail returns `{ ok: true, … }` or `{ ok: false, error: { code,
… } }`, never throws and never returns NaN. The engine rounds nowhere
except in [the output step](#rounding).

# Units and factors

The table is data: `packages/engine/data/units.json`. Its ids are those
of `amountUnit` in `common.schema.json`; a test fails if they differ.
The base of mass is the gram, of volume the millilitre.

| Unit        | Kind   | Factor to base | Definition                                          |
| ----------- | ------ | -------------- | --------------------------------------------------- |
| `g`         | mass   | 1              | canonical                                           |
| `kg`        | mass   | 1000           | SI prefix                                           |
| `lb`        | mass   | 453.59237      | 0.45359237 kg exactly[^yardpound]                   |
| `oz`        | mass   | 28.349523125   | lb / 16                                             |
| `ml`        | volume | 1              | canonical                                           |
| `l`         | volume | 1000           | SI                                                  |
| `cup`       | volume | 236.5882365    | 231 · 2.54³ / 16 ml: US gallon / 16[^nist]          |
| `tbsp`      | volume | 14.78676478125 | cup / 16                                            |
| `tsp`       | volume | 4.92892159375  | tbsp / 3                                            |
| `imp-quart` | volume | 1136.5225      | imperial gallon / 4[^wm1985]                        |
| `imp-pint`  | volume | 568.26125      | imperial quart / 2                                  |
| `imp-gill`  | volume | 142.0653125    | imperial pint / 4                                   |
| `imp-floz`  | volume | 28.4130625     | imperial pint / 20                                  |
| `count`     | count  | 1              | a piece; its mass is the ingredient's `unitWeightG` |

`cup`, `tbsp` and `tsp` are **US customary**, derived exactly from
1 US gallon = 231 cubic inches and 1 inch = 2.54 cm; there is no metric
cup. Both source documents were read on 2026-11-18 (the definitions are
quoted in the source list). The handbook's own millilitre figures for
cup, tablespoon and teaspoon (237, 15, 5) are rounded to the nearest
millilitre; the table here keeps the exact values that follow from the
definitions, and `test/units.test.ts` recomputes them.

`imp-quart`, `imp-pint`, `imp-gill` and `imp-floz` are the **imperial (UK)**
units of capacity, from 1 imperial gallon = 4.546 09 cubic decimetres, quart
= 1/4 gallon, pint = 1/2 quart, gill = 1/4 pint, fluid ounce = 1/20 pint
(Weights and Measures Act 1985, Schedule 1, Part IV, read 2026-11-19). They
have their own ids so that they never clash with the US `cup`, `tbsp` and
`tsp`, and `oz` stays the mass. There is no imperial tablespoon: the Act does
not define one. Imperial pint and fluid ounce are not the US ones (a US pint is
two cups, 473.176473 ml); a dish that follows an English source uses these
ids. The table has no densities and no unit weights:
those belong to an ingredient and carry their own source.

# Conversion and its errors

`toGrams(amount, facts?)` and `convert(amount, toUnit, facts?)`. `facts`
is `{ densityGPerMl?, unitWeightG? }` of the ingredient.

- Within one kind (mass, volume, count) the table alone decides; no
  facts are needed.
- Mass and volume need `densityGPerMl`; mass and count need
  `unitWeightG`; volume and count need both (the way goes through mass).
- A value that is not finite or not above 0, and facts that are not,
  give `invalid-value` (with `field`).

| Code                | When                                                                             |
| ------------------- | -------------------------------------------------------------------------------- |
| `invalid-value`     | value, density or unit weight not finite or not above 0                          |
| `unknown-unit`      | the unit is not in the table                                                     |
| `needs-density`     | volume and mass, no density (also volume and count, only density missing)        |
| `needs-unit-weight` | count and mass, no unit weight (also volume and count, only unit weight missing) |
| `not-convertible`   | volume and count with neither fact; `missing` lists both                         |

The engine never guesses a density or the weight of an egg.

# Rounding

`roundMass(g, stepG)` is the explicit output step: the nearest multiple
of the step, halves away from zero. Method: `g / step` is trimmed to 12
significant digits before rounding, so a tie as a decimal (2.675 at step
0.01, which binary arithmetic stores just below the tie) is a tie and
gives 2.68; the multiple is trimmed to 15 digits so that 27 · 0.1 is
2.7. Errors: `invalid-value`, `invalid-step`.

`displayStep(g)` is the default step: 0.1 g below 10 g, otherwise 1 g.
**Assumption, unverified**: household scales read 1 g and precision
scales 0.1 g; no source says so. The caller may pass any step to
`roundMass`. Nothing else in the engine rounds.

# Scaling by weight

Three ways, all returning `factor`, the `lines` (amounts keep their own
unit), `unscaled` and `cautions`:

- `scaleByFactor(lines, factor)`: every amount times the factor in its
  own unit; no facts needed.
- `scaleToTotal(lines, targetG, factsById)`: every measured line goes to
  grams, factor = target / total.
- `scaleFromLine(lines, lineId, have, factsById)`: factor = what the
  cook has / the line's amount. In the same unit the plain ratio of
  values is used and no facts are needed.

Percent lines (baker's percentage of a base) and lines without an amount
("salt to taste") are never changed and are listed in `unscaled` with
reason `percent` or `no-amount`. Errors: `invalid-factor`,
`invalid-target`, `invalid-value`, `zero-total` (no measured line),
`percent-line` (in the two weighing functions), `no-amount`,
`unknown-line`, and `cannot-convert` whose `cause` is the conversion
error; each names the line in `lineId` where one is meant.

**Cautions.** Cooking time and salt do not scale linearly[^chef]. The
engine adjusts neither; it returns flags:

- `time-not-linear` whenever the factor is not 1;
- `salt-not-linear` as well when a line has a role in `saltRoles`
  (default `['salt']`).

How much to change a time or a salt amount is a cook's decision (salt
from a percentage is [below](#salt-by-basis); times are out of scope).

# Baker's percentages

`bakersPercent(lines)`: lines are `{ id, g, role? }`. The flour is the
summed mass of all lines whose role is the base role (default `flour`),
so several flours together are 100 %. Each line is `100 · g / flour`;
`totalPct` is the dough over the flour. A flour mass of 0 gives
`no-base`; a negative or non-finite mass gives `invalid-value`; a
repeated id gives `duplicate-id`.

`fromBakersPercent(formula, target)`: formula lines are `{ id, pct,
role? }`, target is `{ doughG }` or `{ flourG }`. The base lines must
add up to 100 within 1e-9 (`base-not-100` with `basePct`, `no-base` when
there is none). Flour = dough / (sum of all percentages / 100); each
line is `pct / 100 · flour`. Percentages to grams and back is the
identity within floating-point error; a test checks it.

# Hydration

`hydration(lines)`: water mass over flour mass, in percent. What is
counted:

- flour: lines with the base role (default `flour`);
- water: lines whose role is in `waterRoles` (default `['water']`);
- a line with a recorded `composition { flourG, waterG }` (a preferment
  such as a poolish or a soaker; `flourAndWater` computes it from the
  preferment's [expansion](#components)) adds its own
  flour and water instead of its `g`;
- a line flagged `component` **without** composition is on neither side;
  its id is returned in `notCounted`, so the result says what it left
  out;
- everything else (salt, yeast, fat, sugar) is on neither side.

Milk, eggs, oil and the like count **only if the caller gives them a
water role**: the engine does not know the water content of any
ingredient and derives none. Flour 0 gives `no-base`. In the lean dough
of [the vector format](vectors.md) the hydration equals the water line's
percentage.

# Ratio templates

`src/ratios/`, issue 9. A template is stored as in
[the data model](data-model.md#ratio-template)[^datamodel]: a root has
`parts` (role, parts above 0, optional `range`), a derivative has
`parentId` and `changes` (`add`, `set`, `remove`, `swap`). Everything below is
pure and returns `{ ok, … }`; the errors of this chapter are about
template **data**, never about a recipe.

## Resolving a derivative

`resolveTemplate(templates, id)` walks `parentId` to the root and applies
each derivative's `changes` in order from the root down. It returns the
effective template: `parts` (role, parts, `range`, `ingredientClass`),
`anchor` and `lineage` (root first, this id last).

- Roles keep the root's order; an added role goes last; removing a role
  and adding it again puts it last.
- A range stays with its part to every descendant. A `swap` sets
  `ingredientClass` and keeps parts and range.
- `add` puts a new role last, with parts and an optional `range`.
- `set` gives an existing role new parts and an optional `range`. It
  keeps the role's `ingredientClass` and its place in the order. A range
  belongs to the parts it was sourced for: when `set` gives none, the
  inherited range is dropped, not kept. `set` works on a role added by
  an earlier derivative or change, and a later derivative may `set`
  it again. `set` of a role that is not there (unknown, or removed
  earlier) is `unknown-role`.
- The anchor is the nearest `anchor` from the template up to the root.
  If that role is not among the effective parts, the error is
  `anchor-removed`.

| Code                     | When (fields besides `code`)                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `duplicate-id`           | two templates in the set share an id (`templateId`); checked first, whatever the id                         |
| `unknown-template`       | the id asked for is not in the set (`templateId`)                                                           |
| `unknown-parent`         | a `parentId` is not in the set (`templateId`, `parentId`)                                                   |
| `cycle`                  | the parents lead back to a template (`path`: ids from the start to the first repeat, which ends it)         |
| `not-root-or-derivative` | not (`parts` and no `parentId`, `changes`) and not (`parentId`, `changes`, no `parts`) (`templateId`)       |
| `invalid-parts`          | parts not finite or not above 0, in a root, an `add` or a `set` (`templateId`, `role`)                      |
| `invalid-range`          | `min` above `max`, or a bound not finite or negative, in a root, an `add` or a `set` (`templateId`, `role`) |
| `duplicate-role`         | a root names a role twice (`templateId`, `role`)                                                            |
| `role-exists`            | `add` of a role that is already there (`templateId`, `role`)                                                |
| `unknown-role`           | `remove`, `swap` or `set` of a role that is not there (`templateId`, `role`)                                |
| `anchor-removed`         | the effective anchor is not a role (`templateId`, `role`)                                                   |

Only the chain of the template asked for is checked, apart from
`duplicate-id`.

## Family tree

By the `parentId` links, ids in input order: `templateChildren` (direct
children), `templateSiblings` (same parent, without itself; a root has
none), `templateAncestors` (nearest first, up to the root; the result
can be `cycle`, `unknown-template` or `unknown-parent`, with the same
`path` as above).

## Range check

`checkRatio(template, amounts, { anchor? })`: `amounts` are grams by
role. The anchor is the option or else the template's. The amounts are
scaled so that the anchor has its template parts: `parts = g · anchor
parts / anchor g`. Per template role, in template order, the result has
`parts`, `templateParts`, `deltaParts` (actual minus template),
`sharePct` (of the sum of all amounts given, extra roles included),
`templateSharePct` and, **only when the template gives a range for the
role**, `range`, `position` and `distance`:

| Position | Condition             | Distance (in parts) |
| -------- | --------------------- | ------------------- |
| `below`  | parts < `min`         | `min` − parts       |
| `within` | `min` ≤ parts ≤ `max` | 0                   |
| `above`  | parts > `max`         | parts − `max`       |

A role of the template with no amount has 0 parts and is also in
`notUsed`; a given role the template lacks is in `extra`. Parts, deltas
and distances are trimmed to 12 significant digits (as in
[rounding](#rounding)), so a value that is on a bound in decimals is on
it. Errors about the input: `no-anchor`, `unknown-anchor`,
`anchor-not-measured` (the anchor amount is absent or 0),
`invalid-value` (an amount not finite or negative, or a result that
overflows; with `role`).

**No verdicts.** Numbers are ranges, not verdicts: no function, field or
message says that a recipe is wrong, invalid or failed, or that
something is missing. A cook may leave a range on purpose; the app shows
the position, nothing more. A test searches the results for such words.
**Ranges are never invented**: where a source gives one ratio and no
range, the template has none and the check reports the deviation only.

## Scaling from an anchor and percentages

`scaleFromAnchor(template, role, g)`: `g_role = g · parts_role / parts of
the weighed role`; errors `unknown-role`, `invalid-value`.
`templatePercent(template)`: `parts / anchor parts · 100` per role, the
anchor 100; `no-anchor` when the template has none. Ratio and baker's
percentage are the same mechanism (parts 5 : 3 is flour 100, water 60).

Not in the engine yet: matching a recipe against all templates to find
candidates (materia's `matchTemplates`) is a later adapter once
ingredients and their roles exist.

# Salt by basis

`saltFor({ basis, pct, foodG?, waterG? })` in `src/salt/percent.ts`; the
basis is part of every salt percentage ([ratios](ratios.md)[^ratios]):

- `food`: salt = food · pct / 100;
- `water`: salt = water · pct / 100;
- `brine` (pct is salt per 100 of salt plus water): salt = water · pct /
  (100 − pct).

It returns `saltG` and `totalG` (food or water plus the salt). Errors:
`basis-needs-food`, `basis-needs-water`, `invalid-value` (a mass not
finite or negative), `pct-out-of-range` (not finite, negative, or at
least 100 on `brine`). Which percentage is usual for a use stays in
[ratios](ratios.md); the engine holds none.

# Seed templates

`data/templates.json`, read by `SEED_TEMPLATES`, each valid against
`template.schema.json`. **Rule:** only rows of [ratios](ratios.md)[^ratios]
with status confirmed or corrected, read as page or book (not excerpt
only), that are parts by weight or a baker's percentage. `source` names
the section, the row, its status and the source title; a test checks the
prefix `docs/ratios.md`, unique ids and that each resolves. A range is
there only where the row gives one. `anchor` (the first role, egg for
custard, oil for the vinaigrette) is a choice for the percentages, not a
number from a source. Two seed templates are derivatives that change
parts with `set` (issue 51): `roux-whole-butter` varies `roux` (flour 1,
fat 1; no range, so the roux range is dropped) and
`bread-dough-bakers-percent` varies `bread-dough-ratio` (flour 100, water
60 by `set`, yeast 3 and salt 2 with range 1.8–2 by `add`). Pizza dough
and ciabatta stay roots. `test/seed-templates-pinned.test.ts` pins all
12 resolved seed templates (parts, ranges, anchor, lineage).

| Template id                  | Row                               | Numbers                                                  |
| ---------------------------- | --------------------------------- | -------------------------------------------------------- |
| `bread-dough-ratio`          | Bread dough                       | flour 5, water 3                                         |
| `bread-dough-bakers-percent` | Bread dough (note) and Bread salt | flour 100, water 60, fresh yeast 3, salt 2 (range 1.8–2) |
| `pasta-dough`                | Pasta dough                       | flour 3, egg 2                                           |
| `pie-dough`                  | Pie dough                         | flour 3, fat 2, water 1                                  |
| `cookie-dough`               | Cookie dough                      | flour 3, fat 2, sugar 1                                  |
| `pound-cake`                 | Pound cake                        | flour, fat (butter), sugar, egg 1 each                   |
| `vinaigrette`                | Vinaigrette                       | oil 3, acid 1                                            |
| `roux`                       | Roux (corrected)                  | flour 3, fat 2 (clarified butter)                        |
| `roux-whole-butter`          | Roux (corrected)                  | flour 1, fat 1 (whole butter)                            |
| `free-standing-custard`      | Custard                           | liquid 2, egg 1                                          |
| `neapolitan-pizza-dough`     | Pizza hydration, Pizza salt       | flour 100, water 55.6, salt 2.95 (range 2.8–3.1)         |
| `ciabatta-stiff-biga`        | Ciabatta hydration (book part)    | flour 100, water 73, salt 2                              |

Choices where the row leaves room: the pizza salt row gives only the
range 2.8–3.1 %, so the part is its **midpoint**, 2.95, the one number
here that is arithmetic and not a source figure; pizza water is the
row's 1000 / 1800 = 55.6 %. The ciabatta range 73–76 % is **not** used,
because 76 % is from an excerpt only; 73 % and the salt 2 % are Hamelman's
(book). The pie-dough blog recipe's 2–4 oz water per 12 oz flour is a
recipe, not a range of the ratio, so pie dough has none.

**Not seed templates, and why:**

- Salt rows (soups and sauces, ferments, wet brine, pasta water): basis
  is percent of food, brine or water, not parts or baker's percent of a
  template; they belong to `saltFor`. Pasta water is also excerpt only.
- Pizza hydration 60–65 % and ciabatta 75–85 %: unverified.
- Extra lines of Ruhlman's list in ratios.md (biscuit dough, thickening,
  beurre manié): no row with status and read.
- Fermentation data (NCHFP): volumes, not parts by weight.

**Mother sauces: none included.** [How chefs
work](chef-practice.md) names béchamel, velouté, espagnole, hollandaise
and tomato, but [ratios](ratios.md) has no sourced row for the structure
of any of them. Only the roux row exists, and it is the thickener, not a
sauce. Nothing was recalled or invented; a sourced row first, then a
template with derivatives.

# Components

Code: `src/components/`. A component is a recipe with its own output
weight; the engine takes the stored record as is (`id`, `percentBase`,
`lines`, `yield`; the rest is ignored). Everything below is derived from
the stored amounts every time; nothing is stored back. materia's
`resolvePrepared` walks prepared ingredients measured in ml inside the
ingredient tree; Culina's components are separate records measured by
mass, so the walk here is Culina's own until materia's prepared lines are
measure-neutral.

## Line grams

`componentLineGrams(component, factsByIngredient)` gives the grams of
every line of one component, in line order, with `unmeasured` (the
indexes of lines without amount: kept, never an error and never guessed)
and `inputG` (the sum of the measured lines).

- Mass, volume and count go through `toGrams` with the facts of the line's
  ingredient; a failure is `cannot-convert` with the `index` of the line
  and the conversion error as `cause`.
- A `percent` line is its percent of the summed grams of the lines that
  are not in percent and whose role is the component's `percentBase`. It
  is `no-percent-base` when `percentBase` is absent or that sum is 0. A
  formula written entirely in percent therefore has no mass: give it one
  first (`fromBakersPercent` with a target) and enter the grams.
- A line that refers to a component must be a mass or a percent; volume
  and count are `component-needs-mass`, because a component has no
  density, only a yield in grams.
- A percent of 0 or less is `invalid-value`. Every error carries the
  `componentId`.

## Converting lines between weight and percent

`convertComponentLines(component, to, factsByIngredient)` rewrites the
amounts of the lines for the other way of entry; the grams of every line
stay the same, which the vectors check with `componentLineGrams` before
and after. The editor switches between weight and percent with it, so no
app code does that arithmetic.

- `to: 'percent'`: every measured line that is not a base line (role =
  `percentBase`) becomes percent of the summed base grams. Base lines keep
  their amount in whatever mass unit it was entered (several flours add up
  to 100 %), or become grams where they were percent. Without a
  `percentBase`, or with a base that has no mass, it is `no-percent-base`.
- `to: 'weight'`: every percent line becomes grams of the base; the other
  lines are kept as entered, in their unit.
- A line without amount stays without. Errors are those of
  `componentLineGrams` (`cannot-convert` for a volume without density,
  `component-needs-mass`, `invalid-value`).
- The new numbers are trimmed to 10 significant digits, so converting
  there and back does not collect binary noise; a number never becomes 0.

Vectors: `convert-lines-*` in `packages/engine/vectors/components/`.

## Expansion

`expandComponent(components, id, factsByIngredient, { outputG })` walks
the tree to the raw ingredients.

- A line that uses g grams of a sub-component takes the fraction
  g / (that sub-component's yield in grams) of the sub-component's own
  expansion, to any depth. Needing 200 g of a sauce that yields 800 g
  takes a quarter of its recipe.
- Without `outputG` the top component is one run as written (`factor` 1).
  With it the amounts are for that much output: factor = `outputG` / the
  component's yield in grams.
- A sub-component, or with `outputG` the top component, without a
  recorded yield is `no-yield` with the `componentId` that lacks it and
  the `path` to it. Nothing is assumed.
- `cycle` carries the `path` of ids from the start id to the first
  repeated id (`a`, `b`, `a`); `unknown-component` carries the missing id
  and the path; `duplicate-id` the id; `invalid-value` (field `outputG`
  or `yield`) a number that is not finite and greater than 0, or a yield
  that is not a mass. A cycle is looked for before a yield is needed, and
  only below the start id.
- `raw` lists `{ ingredientId, state?, role?, g }` aggregated by
  ingredient, state and role in first-seen order (a component reports its
  own lines first, then its sub-components in line order). The role is the
  one on the line that names the ingredient. `rawG` is their sum.
- `unmeasured` lists `{ path, index, ref }` for lines without amount
  anywhere in the tree: the raw amounts then lack them and the caller
  must show that.
- `flourAndWater(raw, { baseRole, waterRoles })` adds up the raw
  ingredients by role (defaults as in [hydration](#hydration)); the
  result is the `composition` of a preferment line for `hydration`, and
  the same call on the top component's expansion gives the total formula's
  flour and water.

## Yield and loss

`componentYield(component, factsByIngredient)` gives `inputG` (the
component's own measured lines; a sub-component line counts with the mass
used), `unmeasured` and a `yield`: `{ known: true, outputG, lossG,
yieldPct }` with loss = input - output (negative when weight is gained)
and yield % = 100 · output / input, or `{ known: false }` when no yield
is recorded. There is no default and no estimate. `zero-input` only when
a yield is recorded and the input is 0.

# Edible portion

Code: `src/yields/edible.ts`. Yield % = EP / AP x 100 (edible over as
purchased)[^yield]: the book writes "EP weight ÷ AP weight × 100 = yield
%" and calls EP "edible product"; "edible portion" is Culina's name for
the same quantity. `toEdible` is that formula solved for EP, `toPurchased`
solved for AP (the book names no formula for the amount to order, only
that the yield percentage tells "how much raw product to actually order";
the division is derived here). The helpers take the ingredient's already resolved `yields` list
(inheritance in the ingredient tree is a later issue).

- `yieldFor(yields, state)` returns `known: true` with percent and source,
  or `known: false`. An ingredient with no entry for a state is unknown,
  never 100 %. Two entries for one state are `duplicate-state`.
- `toEdible(purchasedG, yields, state)` = purchased · percent / 100;
  `toPurchased(edibleG, yields, state)` = edible · 100 / percent. Without
  a recorded yield both are `unknown-yield` with the state; grams that are
  not finite or negative, or a percent that is not finite and above 0, are
  `invalid-value`. A percent above 100 is allowed (cooked rice). The
  engine holds no yield figures: they come from user entry or sourced
  data.

# Portions

Code: `src/components/portions.ts`. `portionsFromYield(yieldG, portionG)`
gives `portions` (unrounded), `wholePortions` and `remainderG`. The whole
count floors the quotient after trimming it to 12 significant digits, so
0.3 g in portions of 0.1 g is 3 and not 2; the remainder is not negative.
`portionWeight(yieldG, count)` gives the unrounded weight of one portion.
Both need numbers that are finite and above 0 (`invalid-value` with the
field). Rounding a portion for display is the caller's step.

# Cross-record validation

`validateModel(model)` checks what the JSON Schemas cannot, because it
spans records ([data model](data-model.md#schemas-and-tests)). Input: the
collections of the export file, `ingredients`, `templates`, `components`,
`dishes`, `stock`, `affinities`, `tastings`, as stored (a record valid against its
schema is accepted as is). Only the records given exist; a collection left
out is empty, so the caller passes seed and user records together. Output:
`{ ok, findings }`; it collects every finding, never throws and does not
change its input. A finding is `{ code, kind, id, path?, ref?, ids?, role? }`:
the record (`kind`, `id`), the field (`path`, as `lines[2].ref`), the
missing id (`ref`), the ids around a cycle (`ids`) and the role.

Order: collections as above (tastings after affinities), then record order, then field order (in a
template: parent, cycle, structure and anchor, swaps; in a component:
template, lines, cycles, version). Where records share an id inside one
kind, the later ones get only `duplicate-id` and no other check; ids may
repeat across kinds.

| Code                     | Kinds                                      | When                                                                                                                                                         |
| ------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `duplicate-id`           | any                                        | the id was used by an earlier record of the same kind                                                                                                        |
| `unknown-ingredient`     | template, component, dish, stock, affinity | an ingredient id (swap `ingredientClass`, a line, slot or stock `ref` of kind `ingredient`, affinity `a` and `b`) is no ingredient                           |
| `unknown-component`      | component, dish, stock, tasting            | a `ref` of kind `component` is no component (a tasting `ref` of that kind: no component version with that id)                                                |
| `unknown-dish`           | tasting                                    | a tasting `ref` of kind `dish` is no dish (no dish version with that id)                                                                                     |
| `unknown-template`       | component                                  | `templateId` is no template                                                                                                                                  |
| `unknown-parent`         | ingredient, template, component, dish      | `parentId` or `version.parent` is no record of that kind                                                                                                     |
| `unknown-family`         | component, dish                            | `version.family`, the id of the first version, is no record of that kind                                                                                     |
| `cycle`                  | ingredient, template, component, dish      | parents loop, components nest in a loop, or version parents loop; `ids` run from the smallest id around and end with it (length 1: `[a, a]`)                 |
| `anchor-not-a-role`      | template                                   | the effective anchor (own, else the nearest ancestor's) is not among the effective roles; `role` is the anchor; `path` is `anchor` when the template sets it |
| `invalid-range`          | template                                   | a range has `min` above `max` (or is negative or not finite); `path` `parts[i].range`, or `changes[i].range` for an `add` or `set`                           |
| `not-root-or-derivative` | template                                   | not exactly parts without parent, or parent with changes without parts                                                                                       |
| `invalid-parts`          | template                                   | parts not above 0, in a root, an `add` or a `set` (the schema refuses it too)                                                                                |
| `duplicate-role`         | template                                   | a root lists a role twice                                                                                                                                    |
| `role-exists`            | template                                   | an `add` of a role the parent chain already has                                                                                                              |
| `unknown-role`           | template                                   | a `remove`, `swap` or `set` of a role the parent chain does not have                                                                                         |

**What each check is based on.**

- Template structure (the last six codes and the anchor) is the existing
  `resolveTemplate`, mapped to findings. A template is resolved only when
  its parent chain is sound (no unknown parent, no cycle), and only an error
  in the template itself is kept: an error of an ancestor is reported with
  the ancestor, so it is not repeated for each derivative. While an
  ancestor is broken, errors further down are therefore not yet visible.
- Ingredient parents and cycles are materia's `buildTree`, its errors
  mapped (`missing-parent` is `unknown-parent`). Culina's ingredients have
  no `level`; all are passed with one level so its level-order check
  cannot fire.
- Cycles of templates, components and versions are found by a small walk
  over ids only (`src/validate/graph.ts`). `expandComponent` is not reused:
  it needs amounts and yields and stops at the first error. Each cycle the
  walk meets is reported once, with the record of its smallest id; where
  cycles overlap, not every elementary cycle is listed. The walk recurses
  once per link, so a chain of many thousands of parents is out of scope.
- A tasting note's `ref.id` is the id of a version record, and every
  version is a record of its own, so it is looked up among the ids of its
  kind: `component` in `components`, `dish` in `dishes`. `unknown-dish` is
  new with tasting notes (issue 50); no existing code named a dish that
  does not exist. A note on an ingredient is no valid record (the schema
  allows only the two kinds).
- `version.family` is the id of the first version
  ([data model](data-model.md#version)), so it must be a record of the
  same kind; a family with no first version left is reported.
  `version.parent` is a record of the same kind too.
- **Anchor is optional.** Issue 36 says "exactly one anchor role"; the
  template schema allows no anchor ("absent means no percentages"), so none
  is required. The rule checked is that an anchor that exists is one of the
  effective roles. A derivative that removes the anchor role reports
  `anchor-not-a-role` unless it sets its own anchor.
- Not checked: role ids against a role list (there is none, open question
  2 of the data model), `percentBase` against the lines, amounts.

The tree and reference checks are general (nothing here knows mass or
yield) and could move to materia later; nothing was moved. Vectors:
`packages/engine/vectors/validate/`, kind `validate_model`
([vector format](vectors.md#kind-of-cross-record-validation-issue-36)).

# Versions and variations

Culina's part of the version model; the line matching is materia's
`diffVersions`, called through `src/model.ts`. Code: `src/versions/`
(`chain.ts`, `diff.ts`). Records are the stored ones: each version is a
record with `version.family`, `parent` and `date`
([data model](data-model.md#version)). Pure: the date is a field of the
record, set by the host, never read from a clock.

- **Family and head.** `versionFamily(records, id)` returns the records
  of the family of `id`, oldest first, and the head. The order is the
  depth along the `parent` chain inside the family, then date, then id, so
  versions saved on one day stay in order and a restore (a new record
  whose parent is the previous head) is the newest. Unknown `id`:
  `unknown-version`. `familyHeads` gives one head per family;
  `versionNumber` is the position in the chain, the first being 1.
- **Variations.** Built on materia's `buildFamily` and `findFamilyCycles`
  (called through `src/model.ts`). The records are mapped to `FamilySpec`:
  `lineageId` = `version.family`, `version` = the number in the chain,
  `parentId` = `version.parent` on a first version only, `createdAt` = the
  date. `variationsOf(records, id)` lists the families that are riffs of the
  family of `id` (materia's `children`, in order of creation) with each head.
  `variationParent` answers `none`, `parent` (the record it was made from) or
  `removed` when materia reports `missingParent`. `variationCycles` returns
  materia's loops of variations (only imported data can contain one). Culina
  keeps its own `versionFamily`, `familyHeads` and `versionNumber`: materia
  has no head, order or number helper for specs.
- **Diff.** `diffComponentVersions(before, after)` and
  `diffDishVersions(before, after)` return `{ ok: true, diff }` with
  `changes` (line changes first, then fields) and `empty`; different
  families give `different-family`. Lines are matched, not compared by
  position (identical lines, then the same ref, then the same role), so a
  different order is no difference. A line change names its `fields`
  (`ref`, `amount`, `role`, `state`, `note`, `optional`); an amount is
  compared as entered (1 kg is not 1000 g). A line that exists in both
  versions with no differing field is not a change. Fields compared:
  components `name`, `role`, `templateId`, `percentBase`, `yield`,
  `method`; dishes `name`, `portions`, `note`; dish slots are lines with
  their role. Change, reason, date and tasting notes are not compared. A
  sub-component in the same role replaced by another is one changed line
  (field `ref`); without a role it reads as one removed and one added
  line.

Vectors: `packages/engine/vectors/versions/`, kinds `diff_component`,
`diff_dish`, `version_family`, `variations` and `variation_cycles`
([vector format](vectors.md#kinds-of-versions-and-variations-issue-17)),
run by `test/versions-vectors.test.ts`.

# Stock

The stock item is in the [data model](data-model.md#stock-item): presence
is the whole item, the rest is optional. Code: `src/stock/`. The rules read
dates passed in; the engine has no clock. Days and statuses come from
materia's `expiry` (`daysBetween`, `addDays`) through `src/model.ts`.

- **Remaining days** (`stockExpiry(item, today, shelfLife?, options?)`).
  With an entered `useBy`: `daysLeft` is the calendar distance from today
  to it (0 on the day itself, negative after), basis `entered`. The use-by
  day is the last good day, so on that day the status is `use-soon`, from
  the next day `past`. Status `use-soon` means `daysLeft` is at most the
  window (materia's `USE_SOON_DAYS`, 2, an assumption that no source backs;
  `soonDays` overrides it), `fresh` otherwise.
- **Derived date.** Without `useBy`, if the item has `preparedOn` and
  `state` and the ingredient's recorded `shelfLife` has exactly one value
  of days for that state, the date is `preparedOn` plus those days, basis
  `shelf-life`. No record, a record for another state, or two different
  values (fridge and freezer) give status `none`. Nothing is written back
  and no shelf life is invented; every shelf life in the data has a source.
- **Presence only and always there** have status `none`: no date, no
  days left.
- **Suggestions** (`useBySuggestions(item, shelfLife)`): per storage place
  with a value for the item's state, `preparedOn` plus the days, shortest
  first. The app offers them; the user chooses.
- **Using up** (`useAmount(stock, used, facts?)`): the used amount is
  converted to the stock's unit (same kind by the unit table, other kinds
  only with the ingredient's density or unit weight, else the conversion
  error `needs-density`, `needs-unit-weight`, `not-convertible`); the rest
  is rounded to six decimals; nothing left (or more used than there is)
  is `usedUp`.
- A date that is not a real calendar date is `invalid-date` with the field
  (`today`, `useBy`, `preparedOn`).
- `validateModel` reports a stock `ref` that is no ingredient or component
  (`unknown-ingredient`, `unknown-component`, path `ref`), also for items
  with presence only.

Vectors: `packages/engine/vectors/stock/`, kinds `stock_expiry`,
`stock_suggest` and `stock_use`
([vector format](vectors.md#kinds-of-stock-issue-20)), run by
`test/stock-vectors.test.ts`; `test/stock-schema.test.ts` covers the schema.

# What the stock allows

Culina's finder (issue #21, [recipe book decision](decisions/recipe-book.md)):
`makeable(input)` says which components, dishes and ratio templates the
stock allows, fully or partly, with substitutes named. Code:
`src/makeable/` (`context.ts` the one adapter to materia, `eligible.ts`,
`amount.ts`, `evaluate.ts`, `template.ts`, `candidate.ts`, `rank.ts`,
`for-role.ts`, `uses.ts`). Pure: `today` is an input, nothing is read from a clock.
Results are `{ ok: true, candidates, useUpFirst }` or `{ ok: false, error }`
with `invalid-tree`, `invalid-date` (today, or the use-by of an item, named
by `itemId`), `cycle` (components that make each other, with `path`) or
`invalid-template` (the template error as `cause`). Every result is a list
with reasons, not a score.

**Input.** The ingredient tree (`id`, `parentId`, `roles`), components,
dishes, ratio templates, stock items, `today` (`YYYY-MM-DD`), optional
`facts` (density and unit weight per ingredient, as for conversion) and
`options`. A stock item has `ref` and optional `amount`, `state`,
`useBy` and `always`; `preparedOn` is accepted and not read, because
no use-by is derived from it here (open). The input types are structural
subsets, so stored records pass as they are. `always` is the name the
finder expects for the "always there" flag of the stock item; the stock
schema owns the field.

**Candidates are family heads.** Components and dishes enter once per
family, as the head version (`familyHeads`); a line or stock item that
refers to any version of a component is resolved to its family head. Every
ratio template is a candidate (templates have no versions).

**Per line** (a component line, a dish slot, a made sub-component's line,
a template role), `status` is one of:

| Status                 | Meaning                                                                                |
| ---------------------- | -------------------------------------------------------------------------------------- |
| `have`                 | Stock fits and the known amounts cover the need (or the line has no usable amount)     |
| `have-by-substitution` | A sibling stands in and covers the need; the `substitution` names asked and substitute |
| `have-amount-unknown`  | Fits, but an item has no amount (presence only) or one that cannot be converted        |
| `short`                | Amount known and below the need; `need` and `have` are in the line's unit              |
| `missing`              | Nothing fits; `stateMismatch` lists items of the right ingredient in the wrong state   |

The first tier that has an item decides the line: (1) the line's own
items; (2) for a component line, a sub-component made from its own lines;
(3) for an ingredient line, a sibling. Substitution is therefore consulted
only where there is nothing of the line's own, never to top up a short
amount.

- **The tree is the class mechanism.** A line that names a parent
  ingredient ("butter") is satisfied by any stocked descendant ("salted
  butter"), which is no substitution. A generic item in stock does not
  satisfy a line that names a specific child.
- **Sibling substitution** (`options.siblingSubstitution`, default `true`):
  a line that names a leaf ingredient (no children) with a parent may be
  satisfied by an item of another child of that parent, or below it. A
  line that names a class, a root or a component never takes a sibling.
  The substitute is the stocked ingredient whose item is used first
  (earliest use-by, then id); the report names it, always. **Substitution
  never changes an amount**: `need` is the line's amount, a substitute that
  is too little is `short` (test `makeable.test.ts` and vector
  `substitution-short-keeps-amount`). The effect on the result (taste,
  texture) is not computed.
- **State.** When line and item both have a state they must be equal; an
  item without a state fits; a raw item never stands for a component (a
  prepared thing).
- **Amounts.** Stock amounts are converted to the line's unit with the
  engine's `convert` and the facts of the stock item's ingredient (else the
  line's); only values already in one unit are added. Several items of one
  ingredient add up, taken earliest use-by first until the need is covered;
  the items taken are the line's `items`. A line without an amount, or a
  percent line of a made sub-component, has no `need` and cannot be short.
  An always-there item covers a line the other items cannot, without an
  amount flag.
- **Nested components.** A line that refers to a component is satisfied
  either by a stock item that is that prepared component (`source:
'stock'`) or, when there is none, by making it from its own lines
  (`source: 'made'`, with `parts`). The made lines are scaled by the amount
  needed over the recorded yield (`scaleByFactor`, `scaled: true`); without
  a yield or a mass amount they are one run as written (`scaled: false`).
  A sub-component that cannot be made makes the line `missing` and shows
  its `parts`; the threshold below applies to the outer lines only.
- **Optional lines** never count as lacking and add no role.

**Partial matches.** `options.maxMissing` (default 0) is the number of
required lines that may be `missing` or `short`. A candidate is listed when
it lacks at most that many and at least one required line is there;
`complete` means none lacking, `have-amount-unknown` counts as there.

**Ratio templates.** A template has roles and parts but no amounts, so it
cannot be short. Ingredient `roles` and template roles share one id space
([roles](data-model.md#roles)), so a role is covered by a stocked
ingredient whose roles, own or inherited from the tree (materia's
`inheritedValue`), include it; where a derivative swapped the role to an
ingredient class, by an ingredient in that class. The item used first is
the one reported. Templates are resolved with `resolveTemplate`; the
ingredient data that ships does not yet carry roles, so templates are
findable once the user's or the shipped ingredients do.

**Urgency.** The urgency of a candidate is the earliest `useBy` among the
stock items it would use (`usedItems`, through made sub-components), with
`daysLeft` from `today` (negative when past, still the most urgent) and the
item that sets it. Items without `useBy` and always-there items never drive
it; a candidate with no dated item has no urgency and is the least urgent.

**Ranking contract.** Candidates are ordered by urgency first (earliest
use-by first, none last), then by the number of distinct roles covered
(more first), then by name and id as plain string comparison; the order
does not depend on the order of the input. Complete and partial candidates
share the list (`complete`, `lacking` tell them apart); the reasons are the
urgency's item and `roles`.

**Use up first.** `useUpFirst` lists the stock items that have a use-by,
earliest first, each with the candidates that use it (in ranking order);
an item no candidate uses stays in the list, always-there items are left
out.

**Open roles.** A dish candidate carries `openRoles`: the dish roles no
slot has (`DEFAULT_DISH_ROLES`: main, sauce, crunch, acid, garnish, a
parameter `options.dishRoles`; the same rule as the app's `openRoles`,
which is not moved). `stockForRole({ ingredients, components, stock, today },
role)` lists the stock items whose ingredient roles (inherited) include the
role, or whose component has that `role`, earliest use-by first, so a
screen can offer candidates for an open slot.

**Starting from one ingredient.** `usesIngredient(input, ingredientId)`
(same input as `makeable`; ingredients, components, dishes and
`options.siblingSubstitution` are read) lists the family heads of
components and dishes that use the ingredient or one it can stand in for,
by the rules that decide a line: a line naming the ingredient, a line
naming a class above it (the tree), and, with sibling substitution on, a
line naming a leaf beside it. A line or slot that names a component counts
when that component (its head) does, through any depth; optional lines
count. Result `{ ok: true, records: [{ kind, id }] }` in name, then id
order, or the tree or date error of `makeable`. Ratio templates are not
listed (their roles are not ingredient lines). The ranking and the reasons
of a record come from `makeable`; this only says which records to keep.

**Materia.** Used: `buildTree` (the tree, with its errors), `isA` (a stocked
descendant), `inheritedValue` (roles from ancestors), `dayNumber` (dates);
the heads of families are Culina's own `familyHeads` (see
[versions](#versions-and-variations)).
Not usable: `makeableSpecs`, `missingOne` and `unlockRanking` read
presence only (no amounts, no state, no partial threshold, no component
lines), `satisfyLine` ties substitution to spec-listed stand-ins and to the
`substitutionClass` property, which Culina's ingredients do not have, and
`substitutesFor`, `sameClass` read that class too (Culina's class is the
tree). `expiry` and `limitingShelfLife` derive a date from shelf life, which
this issue does not.

**Open.** A recipe line cannot name a class beyond the tree (a "fat" that
is not an ingredient node): no schema field was added; if wanted it needs a
field on lines and slots. `useBy` is not derived from `preparedOn` plus a
shelf life. Taste effects and shopping lists are out of scope.

Vectors: `packages/engine/vectors/makeable/`, kinds `makeable`,
`stock_for_role` and `uses_ingredient` ([vector format](vectors.md#kinds-of-the-finder-issue-21)),
run by `test/makeable-vectors.test.ts`; `test/makeable.test.ts` holds the
properties (a substitute never changes an amount, the stock order does not
matter).

# Techniques, steps and classics

Issue 87 (work package 2 of the [helper plan](helper-plan.md)). Code:
`src/text/` (the text in two languages), `src/content/` (findings),
`src/steps/`, `src/techniques/`, `src/classics/` and `src/skills/`. The
formats are in the [data model](data-model.md#technique); the guide for writers
is [classic format](classic-format.md). Every function returns
`{ ok: true, ... }` or `{ ok: false, error }` and never throws; none reads a
clock or a random number.

**Validation.** The JSON Schemas check the shape; these rules span fields and
records. A validator returns `{ ok: true }` or
`{ ok: false, error: { code: 'invalid', findings } }`, every finding a
`code`, a `path` and where it helps a `value`.

| Function                                        | Checks                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `validateTechnique`, `validateTechniques`       | texts complete in both languages (`text-incomplete`: white space counts as empty), at least one source (`no-source`), each source sentence at most 25 words (`sentence-too-long`), no id twice (`duplicate-id`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `validateHandlingRule`, `validateHandlingRules` | as `validateTechnique` for `text` and `why`, plus a known `technique` and `target` when the context gives them (`unknown-technique`, `unknown-ingredient`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `validateSteps`                                 | line keys unique (`duplicate-key`), each step's text complete, its `technique` known (`unknown-technique`), each `uses` key a line (`unknown-line`), a range ending above its start (`bad-range`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `validateClassic`                               | the step rules for every component, texts complete (names, `wanted`, notes), component ids unique and not `slots` (`duplicate-id`, `reserved-id`), component references exist (`unknown-component`), no cycle (`cycle`), no unused component (`unused-component`), ingredient ids in the catalogue when the ids are passed (`unknown-ingredient`), every unit resolves (`unknown-unit`), a defined unit is used and does not shadow a table unit (`unused-unit`, `unit-shadows`), a line that refers to a component is a mass (`unit-kind`), a range ends above its start (`bad-range`), settled lines and persons have their entries and every entry its target (a settled line or slot may have no amount: its entry then records a choice) (`settled-without-entry`, `settled-target`, `persons-unsettled`, `persons-entry`) |

**Deriving a classic.** `deriveClassic(classic, { portions?, lang })`
returns the dish and the components in the shapes the model has, so the app
does no arithmetic:

- The unit of an amount is looked up in the unit table first, then in the
  classic's `units`. Mass goes to grams, volume to millilitres, count to
  count: the table's own factors for `tsp`, `tbsp` and `cup` (US customary),
  the classic's `factor` for its words. Nothing is converted between kinds:
  that still needs the ingredient's density or unit weight, as always.
- Scaling: `factor = portions / persons`, default 2 portions. Every amount
  is multiplied by the factor and trimmed to 10 significant digits; there is
  no other rounding (rounding is the display's explicit step).
- A range keeps its middle in `amount` and is listed in `ranges` with `min` and
  `max`, so the app can show "2 to 3" and the arithmetic uses one number.
- A line without an amount stays without one and is listed in `unmeasured`
  (shown as "to taste" or "as needed"); a `wanted` line is carried with its
  name in the language asked and without a `ref`.
- Names and notes come in `lang`; steps keep both languages. Errors:
  `invalid-portions`, `unknown-unit` (with `unit`), `invalid-amount`, each with
  the `path` of the amount.

**Technique notes.** `techniqueNotes(steps, techniques, learned)` gives the
notes to show along the steps of a dish: **at the first step that uses a
technique the user has not marked as learned**, not at every use. The same
note at each fold or each sear would become noise, and the cook can open the
technique again from any step that names it; a learned technique gives none.
The steps are all components' steps in cooking order. An unknown technique id
is `unknown-technique` with the step index.

**Handling rules.** `handlingRules(ingredients, rules, tree, learned, options?)`
gives the rules to show for the ingredient ids of a dish (all components
together, in order). A rule matches an ingredient when its `target` is that
ingredient or any group above it in the catalogue tree (`tree` is a list of
`{ id, parentId? }`; the walk goes up through `parentId`). An ingredient that is
not in the tree (the user's own) matches only a rule that names it. A rule whose
`technique` is in `learned` is left out, as is, when `options.used` (the set of
techniques the dish uses) is given, a rule whose technique is not in it: a rule
about pasta water stays away from a dish without pasta. Each rule shows **once**,
beside the first ingredient it matched; the result is ordered by ingredient
(list order), then by rule list order: `{ ok: true, rules: [{ rule, ingredient }] }`.
A loop in the tree is `{ ok: false, error: { code: 'cycle', id } }`.
`validateHandlingRule(rule, context?)` and `validateHandlingRules(list,
context?)` check the texts (`text-incomplete`), at least one source
(`no-source`), sentences of at most 25 words (`sentence-too-long`), unique ids
(`duplicate-id`) and, when `context` gives `techniqueIds` or `ingredientIds`, a
known technique (`unknown-technique`) and a known target (`unknown-ingredient`).
The rules are data files in `data/handling/`; the app gets them from
`dist/classics.json` (`handling`), so the engine keeps no list of them.

**Copying into the notebook.** `copyClassic(classic, { portions?, lang, date,
newId, ingredientIds? })` returns the records the app writes: one component
record per component and the dish, each version 1 of a new family (`family` is
its own id), with the source named in `version.change` and in the vendor field
`x-origin`. Amounts are the derived ones; a component's `ref` points at the new
component ids, an ingredient `ref` at `ingredientIds[id]` where the ingredient
was adopted under another id, else at the catalogue id. The source's own
wording and a range go into the line's note (`(1 Pfund)`, `(125-150 ml)`), a
slot's range shows as its middle only. The ids come from `newId` and the day from
`date`, so the function is pure. A classic with a `wanted` line cannot be
copied (`wanted-ingredient`, listing the names): the notebook has no
ingredient for it. `wantedLines(classic)` lists them.

**Skill state.** `skillRecord(technique, learned)` is the record
(`skill-<technique>`), `learnedTechniques(records)` the set of learned ids; a
record whose id is not the id of its technique is ignored.

**The shipped lists.** `TECHNIQUES` is every file of `data/techniques/`, read
through an index that `scripts/make-techniques.mjs` writes before tests and
typecheck (`techniques.generated.ts`, not committed), so adding a technique is
adding one file and touches no shared file. The classics are indexed the same
way in the app (`packages/app/make-classics.mjs`).

Vectors: `vectors/techniques/`, `vectors/classics/`, `vectors/skills/`, `vectors/handling/`
([vector format](vectors.md#kinds-of-techniques-classics-and-skills-issue-87)).

# Vectors

`packages/engine/vectors/units/` (conversion for every unit pair,
rounding, the three scalings), `vectors/percentages/` (baker's
percentages, formulas, hydration, the zero-flour and the unequal-base
errors), `vectors/ratios/templates/` (derivative resolution, nested
derivatives, every error code, family queries, the range check in all
three positions and on the bounds, a template without range, scaling from
an anchor, percentages) `vectors/ratios/salt/` (three bases, errors) and `vectors/components/` (flat, two- and three-level nesting, the 200 g of 800 g example, `outputG`, percent lines, unmeasured lines, every error, yield with loss and gain and unknown, edible round trip, a yield above 100, unknown yield, portions), `vectors/stock/` (remaining days in the future, today, past, without use-by, presence only, from a recorded shelf life, suggestions, using up an amount) in the format of [the vector format](vectors.md)[^vectors]. Each
names its basis. Expected numbers are plain arithmetic written out in
the vector's `source`; densities and unit weights in vectors are
synthetic and say so. `test/units-vectors.test.ts` and
`test/percentages-vectors.test.ts`, `test/templates-vectors.test.ts`,
`test/salt-vectors.test.ts` and `test/components-vectors.test.ts` run every file, fail on an unknown
kind and on an empty folder. The scaling property test (`test/scale.test.ts`)
scales 200 fixed factors from 0.001 to 1000 by k and then 1/k and
requires the original within a relative 1e-12.

The component property test (`test/components-property.test.ts`) builds
300 nested components of depth up to 4 from a fixed-seed generator and
requires `rawG` to equal the input weight computed on the side (the sum
over leaves of g times the product of the use fractions along the path)
within a relative 1e-12; with every sub-component's yield equal to its
own input, `rawG` equals the top component's `inputG`.
