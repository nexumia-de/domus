---
type: Specification
title: Engine rules for amounts, scaling, baker's percentages and ratio templates
description: The unit table with exact factors, conversion and its errors, the explicit rounding step, scaling by weight with its cautions, baker's percentages and hydration (issue 8), and ratio templates with derivatives, family queries, the range check, scaling from an anchor, salt by basis and the seed templates with their source rows (issue 9), and components with yield, nesting, edible portion and portions (issue 10).
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
  ]
generated: { by: claude-code/2.1.326, at: 2026-11-18 }
sources:
  - id: yardpound
    title: 'National Bureau of Standards: Refinement of values for the yard and the pound, Federal Register 24 (128), p. 5348, 1959-07-01 (F.R. Doc. 59-5442): "1 pound (avoirdupois) = 0.453 592 37 kilogram"; read 2026-11-18'
    url: https://www.govinfo.gov/content/pkg/FR-1959-07-01/pdf/FR-1959-07-01.pdf
  - id: nist
    title: 'NIST Handbook 44 (2026), Appendix C, General Tables of Units of Measurement: 1 gallon = 231 cubic inches = 128 fluid ounces; 16 ounces = 1 pound; 1 inch = 2.54 centimeters (exactly); 1 cup, measuring = 8 fluid ounces (exactly); 1 tablespoon, measuring = 3 teaspoons (exactly) = 1/2 fluid ounce (exactly); read 2026-11-18'
    url: https://www.nist.gov/system/files/documents/2025/12/30/appc-26-HB44-20251222.pdf
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
    title: 'Basic Kitchen and Food Service Management (BC Campus): Yield testing (AP, EP, yield percentage, cost factor; search excerpt only, host blocked)'
    url: https://opentextbc.ca/basickitchenandfoodservicemanagement/chapter/yield-testing
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

| Unit    | Kind   | Factor to base | Definition                                          |
| ------- | ------ | -------------- | --------------------------------------------------- |
| `g`     | mass   | 1              | canonical                                           |
| `kg`    | mass   | 1000           | SI prefix                                           |
| `lb`    | mass   | 453.59237      | 0.45359237 kg exactly[^yardpound]                   |
| `oz`    | mass   | 28.349523125   | lb / 16                                             |
| `ml`    | volume | 1              | canonical                                           |
| `l`     | volume | 1000           | SI                                                  |
| `cup`   | volume | 236.5882365    | 231 · 2.54³ / 16 ml: US gallon / 16[^nist]          |
| `tbsp`  | volume | 14.78676478125 | cup / 16                                            |
| `tsp`   | volume | 4.92892159375  | tbsp / 3                                            |
| `count` | count  | 1              | a piece; its mass is the ingredient's `unitWeightG` |

`cup`, `tbsp` and `tsp` are **US customary**, derived exactly from
1 US gallon = 231 cubic inches and 1 inch = 2.54 cm; there is no metric
cup. Both source documents were read on 2026-11-18 (the definitions are
quoted in the source list). The handbook's own millilitre figures for
cup, tablespoon and teaspoon (237, 15, 5) are rounded to the nearest
millilitre; the table here keeps the exact values that follow from the
definitions, and `test/units.test.ts` recomputes them. The table has no densities and no unit weights:
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
`parentId` and `changes` (`add`, `remove`, `swap`). Everything below is
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
  `ingredientClass` and keeps parts and range. No change alters parts or
  a range of an existing role: a variant with other parts is a root of
  its own.
- The anchor is the nearest `anchor` from the template up to the root.
  If that role is not among the effective parts, the error is
  `anchor-removed`.

| Code                     | When (fields besides `code`)                                                                          |
| ------------------------ | ----------------------------------------------------------------------------------------------------- |
| `duplicate-id`           | two templates in the set share an id (`templateId`); checked first, whatever the id                   |
| `unknown-template`       | the id asked for is not in the set (`templateId`)                                                     |
| `unknown-parent`         | a `parentId` is not in the set (`templateId`, `parentId`)                                             |
| `cycle`                  | the parents lead back to a template (`path`: ids from the start to the first repeat, which ends it)   |
| `not-root-or-derivative` | not (`parts` and no `parentId`, `changes`) and not (`parentId`, `changes`, no `parts`) (`templateId`) |
| `invalid-parts`          | parts not finite or not above 0, in a root or an `add` (`templateId`, `role`)                         |
| `invalid-range`          | `min` above `max`, or a bound not finite or negative (`templateId`, `role`)                           |
| `duplicate-role`         | a root names a role twice (`templateId`, `role`)                                                      |
| `role-exists`            | `add` of a role that is already there (`templateId`, `role`)                                          |
| `unknown-role`           | `remove` or `swap` of a role that is not there (`templateId`, `role`)                                 |
| `anchor-removed`         | the effective anchor is not a role (`templateId`, `role`)                                             |

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
number from a source. No seed template is a derivative: derivatives
cannot change parts, and no row is the variation of another.

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

Code: `src/yields/edible.ts`. Yield % = EP / AP x 100 (edible portion over
as purchased)[^yield]; issue 37 re-checks the definition at a readable
source. The helpers take the ingredient's already resolved `yields` list
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

# Vectors

`packages/engine/vectors/units/` (conversion for every unit pair,
rounding, the three scalings), `vectors/percentages/` (baker's
percentages, formulas, hydration, the zero-flour and the unequal-base
errors), `vectors/templates/` (derivative resolution, nested
derivatives, every error code, family queries, the range check in all
three positions and on the bounds, a template without range, scaling from
an anchor, percentages) `vectors/salt/` (three bases, errors) and `vectors/components/` (flat, two- and three-level nesting, the 200 g of 800 g example, `outputG`, percent lines, unmeasured lines, every error, yield with loss and gain and unknown, edible round trip, a yield above 100, unknown yield, portions) in the format of [the vector format](vectors.md)[^vectors]. Each
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
