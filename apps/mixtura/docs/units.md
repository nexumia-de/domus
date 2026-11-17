---
type: Specification
title: Units
description: Exact definition of every unit Mixtura accepts (oz, ml, cl, tsp, bar spoon, dash, drop, splash, top, g and the counted units whole, slice, leaf, ...), which are exact and which conventions, how they behave in balance, the parsing grammar and the display rules.
tags: [units, parsing, display, engine]
generated: { by: claude-code/2.1.326, at: 2026-11-17 }
sources:
  - id: nist
    title: 'NIST SP 811 and Handbook 44: US customary and imperial volume units (definitions; only converter pages and a search summary were reachable, see Evidence)'
  - id: difford
    title: "Difford's Guide: Measures and measuring (https://www.diffordsguide.com/encyclopedia/1177/cocktails/measures-and-measuring), search-result summary only"
  - id: cocktailsociety
    title: 'Cocktail Society: How much is a dash of bitters (https://cocktail-society.com/barkeeping/what-is-a-dash/), search-result summary only'
  - id: mercer
    title: 'Mercer Culinary M37041 measured bar spoon, 1 tsp / 5 ml, retailer page (https://www.restaurantsupply.com/mercer-m37041-barfly-measured-bar-spoon-1-tsp-5-ml-6-1-2), search-result summary only'
---

# Units

The engine converts every amount to **millilitres** (volume) or **grams**
(mass) with the table below and computes in those. The same table is
machine readable in `packages/engine/data/units.json`; a test fails when
the two disagree. Display and rounding: [below](#display-and-rounding);
the stored-versus-display choice is in the
[decision](decisions/units-and-display.md). Balance formulas that use the
millilitre values: [balance](balance.md).

# Conversion table

<!-- units-table:start -->

| Id         | Kind   | Value (ml or g) | Status     | Evidence   | Overridable |
| ---------- | ------ | --------------- | ---------- | ---------- | ----------- |
| `ml`       | volume | 1               | exact      | derived    | no          |
| `cl`       | volume | 10              | exact      | derived    | no          |
| `oz_us`    | volume | 29.5735295625   | exact      | secondary  | no          |
| `oz_imp`   | volume | 28.4130625      | exact      | secondary  | no          |
| `tsp`      | volume | 5               | convention | secondary  | yes         |
| `tbsp`     | volume | 15              | convention | assumption | yes         |
| `barspoon` | volume | 5               | convention | secondary  | yes         |
| `dash`     | volume | 0.92            | convention | secondary  | yes         |
| `drop`     | volume | 0.05            | convention | assumption | yes         |
| `splash`   | volume | 5               | convention | assumption | yes         |
| `top`      | fill   | none            | convention | assumption | no          |
| `g`        | mass   | 1               | exact      | derived    | no          |
| `oz_mass`  | mass   | 28.349523125    | exact      | derived    | no          |
| `whole`    | count  | none            | convention | assumption | no          |
| `slice`    | count  | none            | convention | assumption | no          |
| `leaf`     | count  | none            | convention | assumption | no          |
| `sprig`    | count  | none            | convention | assumption | no          |
| `wedge`    | count  | none            | convention | assumption | no          |
| `piece`    | count  | none            | convention | assumption | no          |
| `pinch`    | count  | none            | convention | assumption | no          |
| `cube`     | count  | none            | convention | assumption | no          |
| `peel`     | count  | none            | convention | assumption | no          |
| `stalk`    | count  | none            | convention | assumption | no          |
| `scoop`    | count  | none            | convention | assumption | no          |
| `chunk`    | count  | none            | convention | assumption | no          |
| `yolk`     | count  | none            | convention | assumption | no          |
| `stick`    | count  | none            | convention | assumption | no          |
| `bean`     | count  | none            | convention | assumption | no          |
| `capsule`  | count  | none            | convention | assumption | no          |

<!-- units-table:end -->

Symbols the grammar accepts for each id are in `units.json`
(`symbols`). "Evidence" values:

- **derived**: follows from a definition by arithmetic (`cl` is a tenth of
  a litre; `ml` is the base; the gram is the base mass; the avoirdupois
  ounce is 1/16 of the international pound, 0.45359237 kg exactly, so
  28.349523125 g). The definitions are standard knowledge but were not
  read in a primary document in this session.
- **secondary**: stated by a source that was only reachable as a search
  summary or converter page, not read in full.
- **assumption**: no source read; adjustable as data.

## Exact conversions

- `oz_us`: the US fluid ounce is 1/128 of the US gallon; the gallon is
  exactly 231 cubic inches, 3.785411784 l, so 1 fl oz is exactly
  29.5735295625 ml[^nist]. Converter pages and a search summary agree; the
  NIST document itself was not reachable.
- `oz_imp`: the imperial fluid ounce is 1/160 of the imperial gallon,
  exactly 4.54609 l, so 28.4130625 ml[^nist]. Same evidence.

**Default for "oz": the US fluid ounce.** The cocktail books the templates
come from (Cocktail Codex, Death & Co, Liquid Intelligence) are American
and their ounces are US ounces; the two differ by 4 %, which matters for
batching and not for ratios. A setting "ounce means: US / imperial" lets
UK users choose; it changes only how `oz` is read from now on and is
recorded per spec (a spec stores the unit id, so `oz_us` and `oz_imp`
never mix silently).

## Conventions

Bars differ. Each convention has a default volume, shown in the table, and
the user may override it in settings (stored as data, applied to every
spec that uses the unit; a spec keeps the unit id, not the millilitres, so
an override re-computes balance).

- `tsp`: 5 ml, the metric teaspoon. The US customary teaspoon is 1/6 US
  fl oz, 4.929 ml (a secondary source gives 4.93 ml[^difford]); the 1.4 %
  difference is below the other uncertainties. A measured bar spoon holds
  one teaspoon, 5 ml[^mercer]; Difford's Guide defines "spoon" as 5 ml[^difford].
- `tbsp`: 15 ml, the metric tablespoon (3 tsp). Assumption; the US value
  is 14.787 ml.
- `barspoon`: 5 ml, as above. A stirring spoon is not a measuring spoon;
  recipes that say "bar spoon" mean the 5 ml measure.
- `dash`: 0.92 ml, 1/32 US fl oz[^cocktailsociety]. Sources spread widely:
  Difford's Guide implies about 0.31 ml (4 dashes 1.25 ml)[^difford]. The
  spread is why `dash` is overridable and why balance treats it as an
  estimate (below). Bitters are 1 to 2 ml in most specs, so the effect on
  the figures is small.
- `drop`: 0.05 ml. Assumption. Reported values range from 0.024 ml (41
  drops per ml)[^difford] to 0.09 ml (10 drops per dash)[^cocktailsociety]
  and 0.05 to 0.1 ml in a third source; no value is established.
- `splash`: 5 ml. Assumption, no source found. Estimated in balance.
- `top`: not a volume; see next section.
- Counted units (`whole`, `slice`, `leaf`, ...): not a volume either; see [Counted units](#counted-units).

Counts and weights: `g` and `oz_mass` serve solids such as sugar. In a
line whose ingredient is a solid, `oz` means the mass ounce `oz_mass`;
in every other line it is the fluid ounce.

# Non-volumetric amounts in balance

| Amount                                        | In balance                                                                                                                      |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `dash`, `drop`, `splash`, `tsp`, `barspoon`   | counted with their table volume; the figure is flagged "estimated" if any such line is present                                  |
| `top` with a stored volume (`topMl`)          | counted as that volume (`lines[].topMl` of the spec)                                                                            |
| `top` without a volume                        | excluded and listed in `excluded` (`top-without-volume`); the figures exclude it and say so; no range is computed               |
| counted unit with a known volume per unit     | counted as amount times the ingredient's `unitVolumes` entry; flagged "estimated" (the volume is data with its evidence)        |
| counted unit without a known volume           | excluded and listed in `excluded` (`counted-without-volume`) with its ingredient id and unit; the figures exclude it and say so |
| "to taste", garnish, rinse, aroma (no amount) | excluded and not flagged; they carry no stored amount                                                                           |

Reasoning: a derived number must never be a guess presented as a
measurement. Convention units are small and bounded, so they are counted
and marked estimated; a `top` can be 30 to 150 ml and would dominate the
result, so it is excluded unless the user states a volume, and the result
then says it excludes it. Excluding silently is not allowed. A glass has no
volume in the data, so no range "0 ml to the glass volume" is computed
([decision](decisions/counted-units.md)); the figures of such a spec are
those of the lines that are counted, and `excluded` is how a screen says
"not counted in the figures".

# Counted units

A counted unit is an amount of things: `whole` (an egg, a lemon), `slice`,
`leaf` (`leaves`), `sprig`, `wedge`, `piece`, `pinch`, `cube`, `peel`,
`stalk`, `scoop`, `chunk`, `yolk`, `stick`, `bean`, `capsule`. The table
gives them no value: a slice of lime and a slice of orange differ, and
nothing in this repository is a source for either. A counted line is
stored and shown exactly as entered (`1 whole`, `8 leaves`).

- **Volume as data.** An ingredient may say what one counted unit holds:
  `unitVolumes: { whole: { ml: 45, evidence: "assumption" } }` (see the
  [data model](data-model.md#ingredient)). The entry is per ingredient and
  per unit id, never inherited from a parent and never applied to another
  unit. `evidence` is `derived`, `secondary` or `assumption`; a number
  without a source read is `assumption`. The engine never invents one: the
  seed has none, because none was read from a source.
- **In balance.** With an entry the line counts as amount times `ml` and
  the figures are flagged estimated; without one the line is excluded and
  listed (table above). Only ml is read; a per-unit mass is not modelled.
- **Display.** A counted amount is shown to the nearest half, as a mixed
  number (`1½ whole`, `½ slice`), refined by an eighth so it never shows
  as 0; singular up to and including 1, plural above; the same in every
  display system.
- **Scaling and batching.** Scaling multiplies the stored value exactly
  (`0.5 whole` times 5 is `2.5 whole`). A batch rounds a counted amount
  **up** to a whole number of units (never below 1): an egg or a garnish
  cannot be prepared in fractions and too few is the worse error. The
  line reports the exact amount, the rounded amount, step 1 and the
  rounding error in ml when the volume is known, `null` when it is not.
- **Parts.** `part` (a ratio to the other lines) is not a counted unit and
  stays unaccepted; a ratio needs a reference volume, not a unit.

# Parsing grammar

```
amount   = number , [ space ] , unit | count , space , unit-word
number   = decimal | fraction | mixed
decimal  = digits , [ ( "." | "," ) , digits ]
fraction = digits , "/" , digits | glyph
mixed    = digits , space , ( digits , "/" , digits | glyph ) | digits , glyph
glyph    = "¼" | "½" | "¾" | "⅐" | "⅑" | "⅒" | "⅓" | "⅔" | "⅕" | "⅖" | "⅗" | "⅘"
         | "⅙" | "⅚" | "⅛" | "⅜" | "⅝" | "⅞"
unit     = a symbol from units.json, case-insensitive, plural accepted
count    = number
```

Rules:

- Whitespace around the unit is optional for symbols (`1.5oz`) and
  required for words (`2 dashes`). Leading and trailing spaces are ignored.
- A decimal comma is accepted when no thousands separator is possible
  (`1,5 oz`); more than one separator is rejected.
- Denominator zero, negative numbers, an exponent, a range (`1-2 oz`), and
  an unknown unit are rejected. A bare number has no unit and is rejected
  by the parser; the editor applies the default unit before parsing.
- Result: `{ value: number, unit: <id> }`; the value is kept exactly as
  the fraction or decimal entered (see the [decision](decisions/units-and-display.md)).

Accepted (each becomes a vector):

| Input         | Result       |
| ------------- | ------------ |
| `1 1/2 oz`    | 1.5 `oz_us`  |
| `1.5oz`       | 1.5 `oz_us`  |
| `45 ml`       | 45 `ml`      |
| `45ml`        | 45 `ml`      |
| `4,5 cl`      | 4.5 `cl`     |
| `2 dashes`    | 2 `dash`     |
| `1 dash`      | 1 `dash`     |
| `1 bar spoon` | 1 `barspoon` |
| `½ oz`        | 0.5 `oz_us`  |
| `1½ oz`       | 1.5 `oz_us`  |
| `3/4 oz`      | 0.75 `oz_us` |
| `¾oz`         | 0.75 `oz_us` |
| `2 tsp`       | 2 `tsp`      |
| `3 drops`     | 3 `drop`     |
| `1 Splash`    | 1 `splash`   |
| ` 30 mL`      | 30 `ml`      |
| `5 g`         | 5 `g`        |
| `2 slices`    | 2 `slice`    |
| `8 leaves`    | 8 `leaf`     |
| `1 whole`     | 1 `whole`    |

Rejected:

| Input        | Why                     |
| ------------ | ----------------------- |
| `` (empty)   | no amount               |
| `oz`         | no number               |
| `1/0 oz`     | denominator zero        |
| `-1 oz`      | negative                |
| `1-2 oz`     | range                   |
| `1 handful`  | unknown unit            |
| `1,000.5 ml` | more than one separator |
| `1e2 ml`     | exponent                |
| `45`         | no unit                 |

# Display and rounding

Stored amounts are never changed by display. A setting "show amounts in:
metric / US / imperial" converts only for display; entry accepts any
unit at any time.

| Display unit              | Rule                                                                                                      |
| ------------------------- | --------------------------------------------------------------------------------------------------------- |
| `oz_us`, `oz_imp`         | nearest 1/4 oz from 1/2 oz up; nearest 1/8 oz below 1/2 oz; shown as a mixed number with glyphs (`1½ oz`) |
| `ml`                      | whole ml from 5 ml up; nearest 0.5 ml below 5 ml                                                          |
| `cl`                      | one decimal                                                                                               |
| `tsp`, `barspoon`, `tbsp` | nearest 1/4                                                                                               |
| `dash`, `drop`, `splash`  | whole numbers; an amount below 1 is shown as 1                                                            |
| `g`                       | whole g from 10 g up; one decimal below                                                                   |
| counted units             | nearest 1/2 as a mixed number, refined by 1/4 and 1/8 so it never shows as 0                              |

- A converted value that rounds to zero is shown with one more step of
  precision, never as 0.
- Scaled and batch amounts round for display only; sums use unrounded
  values. A spec shown rounded may not add up to its shown total; the
  total is rounded separately.
- Where the user's entered unit equals the display unit, the entered text
  is shown unchanged.

# Implementation notes

Gaps the implementation ([engine amounts](engine-amounts.md)) closed:

- A decimal comma followed by exactly three digits after a non-zero
  integer (`1,000 ml`) is rejected as ambiguous; `0,125 oz` is accepted.
- Zero (`0 ml`) is accepted; a spelling like `2dashes` is rejected
  because words need a space.
- Plural `s` is accepted on any symbol of three or more letters (`tsps`).
- "top 90 ml" is not read by the amount parser; the spec model carries a
  `top` line and its volume separately as `topMl` on the line.
- Mass ounces: shown as `oz av` in the US and imperial systems with the
  ounce rounding (quarters, eighths below 1/2); in metric they become
  grams. Grams are never converted to ounces.
- Rounding is half up; the refinement for values that round to zero goes
  one step finer at a time (1/8, 1/16, 1/32 oz; 0.5, 0.1, 0.01 ml).
- Each unit shown below its step uses fixed decimals: `3.0 ml`, `5.0 g`.

[^nist]: NIST Special Publication 811 and Handbook 44, US customary and imperial volume definitions. Not opened: the host was blocked. Values agree with converter pages and a search summary; the gallon definitions (231 in³, 4.54609 l) are standard.

[^difford]: Difford's Guide, "Measures and measuring", https://www.diffordsguide.com/encyclopedia/1177/cocktails/measures-and-measuring. Read as a search-result summary: spoon 5 ml (1/6 oz), about 41 drops per ml, 12 drops to a dash, 4 dashes about 1.25 ml, teaspoon 1/6 oz or 4.93 ml. The page itself was not opened.

[^cocktailsociety]: Cocktail Society, "How much is a dash of bitters", https://cocktail-society.com/barkeeping/what-is-a-dash/. Search-result summary: 1 dash 0.92 ml or 1/32 oz, 10 drops to a dash. Page not opened.

[^mercer]: Mercer Culinary M37041 product page (retailer), measured bar spoon 1 tsp, 5 ml. Search-result summary.
