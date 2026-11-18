---
type: Specification
title: Engine rules for amounts, scaling and baker's percentages
description: The unit table with exact factors, conversion and its errors, the explicit rounding step, scaling by weight with its cautions, baker's percentages and hydration with what is counted, as implemented in the engine (issue 8).
tags: [engine, units, conversion, scaling, bakers-percentage, hydration, rounding]
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
---

# Engine rules for amounts, scaling and baker's percentages

What the engine in `packages/engine/src/amounts`, `scale` and `bakers`
does, in the order a cook meets it. All functions are pure; a function
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
percentages are issue 9, times are out of scope).

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
  such as a poolish or a soaker; issue 10 will compute it) adds its own
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

# Vectors

`packages/engine/vectors/units/` (conversion for every unit pair,
rounding, the three scalings) and `vectors/percentages/` (baker's
percentages, formulas, hydration, the zero-flour and the unequal-base
errors) in the format of [the vector format](vectors.md)[^vectors]. Each
names its basis. Expected numbers are plain arithmetic written out in
the vector's `source`; densities and unit weights in vectors are
synthetic and say so. `test/units-vectors.test.ts` and
`test/percentages-vectors.test.ts` run every file, fail on an unknown
kind and on an empty folder. The scaling property test (`test/scale.test.ts`)
scales 200 fixed factors from 0.001 to 1000 by k and then 1/k and
requires the original within a relative 1e-12.
