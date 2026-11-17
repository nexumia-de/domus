---
type: Specification
title: Balance
description: Formulas, engine module and pre-diluted batching for ABV, sugar, acid, volume and units of alcohol before and after dilution, the adjustable dilution model, usual ranges per root template with what is verified, the vector file format and the first worked examples.
tags: [balance, dilution, formulas, vectors, engine]
generated: { by: claude-code/2.1.326, at: 2026-11-17 }
sources:
  - id: arnold-blog
    title: 'Dave Arnold, Cooking Issues posts on cocktail dilution (https://www.cookingissues.com/index.html%3Fp%3D4585.html, https://cookingissues.com/2010/09/08/cocktail-science-in-generalpart-2-of-2/, https://www.cookingissues.com/index.html%3Fp%3D1527.html); read only as search-result summaries'
  - id: arnold-book
    title: 'Dave Arnold: Liquid Intelligence (2014); not at hand, quoted only through summaries'
  - id: deathco
    title: 'Death & Co, Shaken or Stirred (https://fashioned.deathandcompany.com/pages/shaken-or-stirred); search-result summary only'
  - id: difford
    title: "Difford's Guide: Some cocktails benefit from added water (https://www.diffordsguide.com/encyclopedia/3711/cocktails/some-cocktails-benefit-from-added-water); search-result summary only"
  - id: nhs
    title: 'NHS: Calculating alcohol units (https://www.nhs.uk/live-well/alcohol-advice/calculating-alcohol-units/) and NHS trust pages; search-result summaries only'
  - id: codex
    title: 'Alex Day, Nick Fauchald, David Kaplan: Cocktail Codex (2018); not at hand'
---

# Balance

Balance figures are numbers shown against a **usual range**; a result
outside a range is worded "outside the usual range of this template",
never "wrong" ([AGENTS.md](../AGENTS.md)). The formulas are exact; the
numbers fed into them (ingredient properties, dilution) are not, and each
says how well it is known.

**Read this first.** During this work only search-result summaries were
reachable: the hosts of Dave Arnold's blog, Difford's Guide, NIST, the
NHS and others were blocked (list in [development](development.md#network-hosts)).
Neither _Liquid Intelligence_ nor _Cocktail Codex_ was at hand. So no
dilution or range number below is **verified** against a primary source.
The table [Evidence](#evidence) states for each number what was seen and
where; the owner tasks to close the gap are at its end.

# Inputs

Each line of a spec resolves to an ingredient with these properties
(fields of the [data model](data-model.md)):

| Symbol | Meaning                      | Unit         |
| ------ | ---------------------------- | ------------ |
| `v_i`  | amount of line i             | ml           |
| `a_i`  | ABV                          | % vol        |
| `s_i`  | sugar                        | g per 100 ml |
| `c_i`  | acid, titratable             | g per 100 ml |
| `m_i`  | solid sugar added (optional) | g, volume 0  |

Amounts are converted to ml with [units](units.md). "Acid %" is read as
g per 100 ml of the ingredient, as titratable acidity is reported.

# Formulas

Before dilution:

- `V0 = Σ v_i` (ml)
- `E = Σ v_i · a_i / 100` (ml of pure ethanol)
- `ABV0 = 100 · E / V0` (% vol)
- `S = Σ (v_i · s_i / 100 + m_i)` (g sugar)
- `C = Σ v_i · c_i / 100` (g acid)

Volumes are treated as additive. Mixing ethanol and water contracts the
volume by a few percent at most; ignored here (assumption, to be checked
when a source is at hand). A line with `v_i = 0` and `m_i > 0` models a
solid such as granulated sugar whose dissolved volume is ignored.

Dilution adds water as a fraction `f` of `V0` (next section). Water carries
no ethanol, sugar or acid, so after dilution:

- `V = V0 · (1 + f)` (ml)
- `ABV = 100 · E / V`
- sugar `= 100 · S / V` (g/100 ml)
- acid `= 100 · C / V` (%)
- sugar-to-acid ratio `= S / C` (g per g, unchanged by dilution; undefined,
  stored as `null`, when `C = 0`)

Units of alcohol: the **UK unit is 10 ml of pure ethanol** (8 g)[^nhs], so
`units = E / 10`. The US standard drink (14 g of ethanol, from a news
article only) is a different definition; if it is added later it is
`E · 0.789 / 14` with ethanol density 0.789 g/ml (assumption, well known,
not read in this session). The UK unit is used because it is defined in
volume, which is what the engine computes.

Pre-dilution figures (`ABV0`) are shown for batching and for reading
specs; the post-dilution figures are the ones compared with ranges.

## Prepared ingredients by mass

A syrup made from sugar and water by mass has: `volume = (m_sugar +
m_water) / ρ`, sugar `= 100 · m_sugar / volume` (g/100 ml), ABV 0, acid 0.
`ρ` is the solution density; for 1:1 by mass (50 % sugar) it is
1.2296 g/ml (assumption: recalled from sucrose density tables, not read;
adjustable as data).

# Dilution model

One rule, parameters as data in
`packages/engine/data/dilution.json` (schema next to it):

`V = V0 · (1 + f)` with `f` chosen by method, `f_low ≤ f_default ≤ f_high`.
The engine uses `f_default` unless a spec stores its own `f` or the user
asks for the range (then ABV is shown for `f_high … f_low`).

| Method  | `f_low` | `f_default` | `f_high` | Evidence   |
| ------- | ------- | ----------- | -------- | ---------- |
| `none`  | 0       | 0           | 0        | derived    |
| `stir`  | 0.15    | 0.20        | 0.25     | secondary  |
| `shake` | 0.20    | 0.25        | 0.30     | secondary  |
| `build` | 0.05    | 0.10        | 0.15     | assumption |
| `blend` | 0.75    | 1.00        | 1.50     | assumption |

What the sources say, as far as it was seen:

- Stir 15–20 % and shake 20–25 % (Death & Co library page)[^deathco];
  stirring about 20 % with Difford's ice[^difford]. Other pages in the
  search results gave 15–20 % for stirring and 25–35 % for shaking, or
  0.5–0.75 oz for 30 s of stirring and 0.75–1.25 oz for 10–15 s of
  shaking; these are low-quality pages and are not used. The table spans
  the Death & Co and Difford figures; its defaults are mid-range
  choices, not source values.
- Arnold: ice type and shaking style change final temperature and
  dilution little if shaken 12–15 s; stirring is inefficient shaking and
  can take over two minutes to match 15 s of shaking; there is no single
  ideal dilution, it depends on the drink's components and ABV; drinks
  at the same final temperature have the same dilution regardless of
  technique[^arnold-blog]. Seen as summaries.
- _Liquid Intelligence_ gives equations for dilution as a function of
  starting ABV for shaken and stirred drinks. Two reader summaries
  disagree on the printed form (a blog says the printed shaken equation
  lacks a minus sign) and one quotes "50–60 % dilution (p. 125)" for shaken drinks, a
  figure that conflicts with the 20–30 % above unless defined
  differently. The equations are **not used** because they could not be
  read; a model that depends on ABV, sugar and time replaces the
  constant fraction once the book is at hand (open issue, below)[^arnold-book].
- `build` (a drink poured over ice, with a mixer): no source; the
  figure is a placeholder. `blend`: one calculator page lists 100–150 ml
  of water for a blended drink; as a fraction of a roughly 100 ml base
  that is 1.0–1.5, hence the row. Both are assumptions.

Not modelled in version 1: dependence on ice size, time, sugar and
starting ABV; carbonated mixers' loss of gas; ice added to the glass.

# Usual ranges per template

Computed, not quoted: the nominal spec of each root template[^codex]
(volumes and ingredient properties in the table below, all
assumptions) is run through the formulas with `f_high` and `f_low`. The
range is therefore only as good as those inputs and the dilution table;
the spread between authors could not be shown because no author's figures
were read. Ingredient properties used: spirit 40 % vol; dry vermouth
16 %; aromatic bitters 45 % and 1.8 ml (2 dashes); lime and lemon juice
6 % acid, 1.5 g sugar per 100 ml; 1:1 syrup 61.48 g/100 ml; triple sec
40 % and 25 g sugar per 100 ml; whole egg 45 ml, no ABV, no sugar; solid
sugar 4.2 g per teaspoon. All assumption, unverified.

| Template      | Nominal spec (ml)                      | Method | ABV after, % | Sugar, g/100 ml | Acid, %     |
| ------------- | -------------------------------------- | ------ | ------------ | --------------- | ----------- |
| Old-Fashioned | 60 whiskey, 4.2 g sugar, 1.8 bitters   | stir   | 32.1 – 34.9  | 5.4 – 5.9       | 0           |
| Martini       | 60 gin, 30 dry vermouth                | stir   | 25.6 – 27.8  | 0               | 0           |
| Daiquiri      | 60 rum, 22.5 lime, 22.5 syrup          | shake  | 17.6 – 19.0  | 10.4 – 11.2     | 0.99 – 1.07 |
| Sidecar       | 60 cognac, 22.5 lemon, 22.5 triple sec | shake  | 24.2 – 26.2  | 4.4 – 4.7       | 0.99 – 1.07 |
| Highball      | 60 spirit, 150 soda                    | build  | 9.9 – 10.9   | 0               | 0           |
| Flip          | 60 brandy, 15 syrup, 45 egg            | shake  | 15.4 – 16.7  | 5.9 – 6.4       | 0           |

(First value `f_high`, second `f_low`.) Highball with 120 to 180 ml of
mixer spans 9.1 to 12.1 %. The practice document's "sours 0.8–1.2 % acid
and 8–12 g sugar per 100 ml" is consistent with the Daiquiri row but is
itself unsourced; no source for acid or sugar ranges was found.

## How precise a range is shown

The band is narrow because it holds only one source of spread: the
dilution table (`f_high` to `f_low`) applied to **one nominal spec** with
assumed ingredient properties. It does not contain the spread between
authors, between brands (a rum is 40 %, 37.5 % or 43 %), between juices
or between ratios, none of which was read. A band of 17.6 to 19.0 %
therefore says less than it looks like, and a "Within" next to it would
claim a precision nobody has.

Two ways to present this honestly were considered:

1. Widen the bands in the data to what the assumptions support. Rejected:
   the width could only come from new numbers (spread of brands, authors,
   ratios) that no source supports; choosing a width would be inventing
   a number, and a wider band still carries the same evidence status.
2. Keep the data, change the presentation by evidence. **Chosen.** The
   range check returns the evidence of the range
   ([templates](templates.md#range-check)); the screens read it:
   - evidence `verified`, `secondary` or `derived`: the figure, the band,
     the position word (Within, Below, Above) and "Usual range lo-hi";
   - evidence `assumption` or not stated: the figure and the band drawn
     dashed, labelled "Assumed range lo-hi", **no position word**, and a
     diamond that is always filled (hollow would say "outside"). The
     accessible name says "assumed range ..., not checked against a
     source".

   The rule lives in `rangeIsAssumed` (`screens/spec/balance-vm.ts`) and
   is tested with a template whose evidence is changed to each value.
   When a range is verified, only its `evidence` changes in the data and
   the screens show position words again; no code changes. No verdict
   word is used in either form.

# What is not captured

Aroma, bitterness (bitters count only as volume and ABV), carbonation and
its loss, texture and body (egg, aquafaba, gum), temperature, perceived
sweetness (it also depends on acid and ethanol), and the sugar and acid
in juices beyond the single figures above.

# Vector file format

Files in `packages/engine/vectors/`, one worked example each, validated
against `vectors/vector.schema.json` by `test/vectors.test.ts` and run
against the engine by `test/balance.test.ts` (an adapter turns each line
into an ingredient and a spec line). The vectors of the
[engine section](#engine) in `vectors/balance/` use a richer format,
described there. Fields:

- `id`: kebab-case, equal to the file name without `.json`.
- `description`: what the example is.
- `inputs`: `kind: "balance"` with `method`, `dilution_fraction` and
  `lines` (`name`, `ml`, `abv_pct`, `sugar_g_per_100ml`, `acid_pct`,
  optional `sugar_g`), or `kind: "prepared_by_mass"` with `sugar_g`,
  `water_g`, `density_g_per_ml`. Inputs are self-contained: they carry
  the properties used, so a vector does not depend on the data tables.
- `expected`: named numbers (`null` where undefined).
- `tolerance`: absolute, applied to every expected number.
- `source`: where the calculation is and how well the inputs are known.

# Engine

Code: `packages/engine/src/balance/`, one job per file. Entry point
`computeBalance(tree, spec, options)`; it reads the formulas above, the
amounts module for every unit and `ingredients/mixture.ts` for the
mixture arithmetic.

| File          | Job                                                                                                                                     |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts`    | `Figure`, `BalanceSpec`, `DilutionTable`, `BalanceFigures`, error codes                                                                 |
| `dilution.ts` | `DILUTION` (read from `data/dilution.json`), `chooseDilution(method, options)`                                                          |
| `lines.ts`    | spec lines to ml and g (counted lines by the ingredient's `unitVolumes`), properties from the tree or from a prepared ingredient's spec |
| `sums.ts`     | totals of volume, ethanol, sugar and acid                                                                                               |
| `figures.ts`  | ABV, sugar, acid before and after dilution, sugar-to-acid ratio, UK units                                                               |

**Figures.** A figure is `{ known: true, value }` or `{ known: false,
missingIds, reason }`. A property that no ancestor of a line's ingredient
defines makes the figures that need it unknown and names the ingredient;
the other figures are still computed (volume and, say, ABV when only acid
is missing). A line whose ingredient is not in the tree counts its
volume and is named as missing for every concentration. Nothing is
defaulted. The result carries numbers and flags, no verdict words;
comparing a figure with a template's range belongs to templates.

**Dilution.** The method comes from the spec. `chooseDilution` takes the
fraction from the table (`options.dilution.table`, default
`data/dilution.json`), at `bound` `low`, `default` (default) or `high`, or
an explicit `options.dilution.fraction` (a spec's own dilution). The
output says what was used: method, bound, fraction, `evidence` (the
table's marker, or `override`) and `basis`: `sourced` for `derived` and
`secondary` rows (secondary still means search-result summaries only, see
[Evidence](#evidence)), `assumption` for assumption rows, `override` for
an explicit fraction. A missing method, or a method id not in the table,
returns the figures before dilution only with `dilutionUnavailable` set
to `no-method` or `unknown-method`; no fraction is invented.

**Ambiguities the implementation had to settle** (each now a rule):

- Mass units (`g`, `oz_mass`) count as solid sugar: `grams * sugar / 100`
  g of sugar and volume 0. A mass line adds nothing else; acid or ethanol
  in a solid is not modelled.
- A `top` line counts as its `topMl` volume when given. `topMl` is the
  stored field `lines[].topMl` of the Spec schema ([data model](data-model.md#spec),
  only valid with `unit: top`); `BalanceLine` reads the same name. Without it
  the line is excluded and listed in `excluded` (`top-without-volume`). No
  range "0 ml to the glass volume" is computed: a glass has no volume in
  the data ([decision](decisions/counted-units.md)).
- <a id="counted-lines-and-open-amounts"></a>A **counted line** (`whole`,
  `slice`, `leaf`, ...; [units](units.md#counted-units)) counts as amount
  times the volume one unit of its ingredient holds, from the ingredient's
  own `unitVolumes[unit].ml` (not inherited, never guessed); `estimated`
  is true and `estimatedIds` names the line. Without such data the line is
  excluded and listed in `excluded` with reason `counted-without-volume`,
  its ingredient id and its unit. `excluded` is the engine's answer to
  "not counted in the figures": a screen shows every entry as such and
  says that the figures exclude it (`excluded` empty means every line is
  in the figures). A spec whose only unknown is a counted garnish still
  has every figure; the garnish is the one excluded line.
- Convention volumes (dash, drop, splash, tsp, tbsp, bar spoon) count
  with their table volume (overridable through `unitOverrides`);
  `estimated` is true and `estimatedIds` names the lines.
- A line's `amountMax` and `optional` are not read: the figures use
  `amount`, and an optional line counts.
- The sugar-to-acid ratio has `value: null` (known, undefined by
  definition) when the acid total is 0, as in the vectors.
- With zero volume the totals are known but every concentration is
  unknown with no ingredient to blame (reason: no volume).
- Water of dilution is `V0 * f`; `after.waterMl` reports it.

**Vectors** in `packages/engine/vectors/balance/`, schema
`balance-vector.schema.json`: a small ingredient tree, optional prepared
`specs`, a `spec` (method and lines with unit ids), optional `options`
(`unit_overrides`, `dilution` with `fraction`, `bound`, `table`) and
`expected.figures` (number, `null` or `{ unknown: [ids] }`) plus
`expected.flags`. Expected values were computed with hand-written
formulas, not by the engine. Tolerance is 0.0001 absolute: the vectors
store six decimals, and 0.0001 is far below the effect of any assumption
in the inputs while still failing a wrong formula. The files cover
lines in dash, bar spoon, g, cl and oz; a `top` line with and without
volume; a counted line with and without a volume per unit (also a
volume given for another unit only, and not inherited) and a counted
garnish as the only unknown line; a prepared ingredient; an unknown property; an unknown
ingredient; every method of `dilution.json`; a fraction override, a table
override and both bounds; no method and an unknown method; zero volume;
and a drink without alcohol.

# Batching

Code: `packages/engine/src/batch/`. A pre-diluted batch is N servings of a
spec mixed ahead with the water the method would have added to each
serving, so that a pour equals the finished drink. It uses the dilution
of [Engine](#engine), so it is exactly as (un)verified as that table.

| File            | Job                                                                                   |
| --------------- | ------------------------------------------------------------------------------------- |
| `scale.ts`      | `scaleLines(lines, servings, { targetUnit })`: amounts module `scale` and `convert`   |
| `prediluted.ts` | `prediluted(tree, spec, servings, options)`: water, volumes, yield, rounding, figures |
| `shelf.ts`      | `shelfLife(tree, ids)`: minimum of `shelfLifeDays` with the limiting ingredient id    |

**Formulas.** One serving has `V0` ml before and `V = V0 (1 + f)` after
dilution. For N servings: every line times N (unit kept; a target unit
converts lines of the same kind only), water `N · V0 · f` ml, total
volume `N · V`, pour per serving `V` ml, yield N servings. Ethanol, sugar
and acid are conserved, so the batch has the figures of one served drink
exactly (the invariant, tested over every balance vector for 1, 3 and 10
servings, unknown figures included). `top` lines are not batched (they
are poured at the glass); they are listed in `servedSeparately` and the
batch is compared with the spec without them. A spec with no method (or
an unknown one) has no dilution, so the result is the error `no-dilution`;
servings must be a number above 0 (`invalid-servings`). A counted line is
batched like any other: scaled exactly, and, when its volume is known,
part of the batch volume; without a known volume it is in `lines` (so the
bar knows how many to prepare) but not in any figure, and the batch's
`exact`, `perDrink` and `made` all list it in `excluded`.

**Rounding.** Each scaled amount is rounded by the display rules of
[units](units.md) (`formatAmountDetailed`, metric unless `system` says
otherwise), the water to whole ml. Every line reports `exact`,
`rounded`, the `step` and `roundingError` (rounded minus exact, in ml or
g; `null` for a counted line whose volume is not known); the water
reports the same. A **counted amount** is the exception to the display
rules: it is rounded **up** to a whole number of units, never below 1,
step 1 (an egg or a garnish cannot be prepared in fractions, and too few
is the worse error; [units](units.md#counted-units)). Half an egg for 5
servings is 2.5 exact and 3 rounded; with 45 ml per whole that is 22.5 ml
more in the batch, which `made` shows. `made` holds the figures of the batch
built from the rounded amounts, so they can be compared with `perDrink`;
`roundedTotalMl` and `roundedYieldServings` follow from them. Scaling by
N and then 1/N returns the original amounts to 1e-9: scaling does not
round, only the report does. How far `made` may drift is a property of
the step (a dash is a whole number, 0.5 ml below 5 ml), so each batch
vector states its own `made_tolerance`.

**Shelf life.** The minimum of the parts' `shelfLifeDays` (inherited as
usual; a prepared ingredient counts with its own stored value, not that
of its parts) and the id of the ingredient that sets it; on a tie the
first in spec order. A part without a value makes the shelf life unknown
and the result names those ids; nothing is defaulted, and the numbers in
the batch vectors are synthetic. Fresh citrus therefore limits a batch
only if the data gives it a short life.

**Vectors** in `packages/engine/vectors/batch/`, schema
`batch-vector.schema.json`: the balance vector format with `cases` (one
per number of servings: water, total, pour, rounded lines with their
error, rounded water and total, the figures of the drink and of the made
batch), `shelf_life`, `made_tolerance`; error vectors list
`error_servings` and the `error_code`. They cover 1 to 10 servings of a
shaken spec, a stirred batch, a target unit, a prepared ingredient, a
`top` line, a limiting shelf life, a tie, an unknown shelf life, invalid
servings and a missing method.

# Worked examples

All numbers by hand; the vector files hold the same values rounded to
six decimals.

**Stirred Martini** (`balance-stirred-martini`; 60 ml gin 40 %, 30 ml dry
vermouth 16 %, `f` = 0.20): `V0 = 90`; `E = 60·0.40 + 30·0.16 = 24 + 4.8 =
28.8` ml; `ABV0 = 100·28.8/90 = 32.0` %; `V = 90·1.2 = 108` ml; `ABV =
100·28.8/108 = 26.667` %; units `= 2.88`; sugar and acid 0.

**Stirred Old-Fashioned** (`balance-stirred-old-fashioned`; 60 ml whiskey
40 %, 4.2 g solid sugar, 1.8 ml bitters 45 %, `f` = 0.20): `V0 = 61.8`;
`E = 24 + 0.81 = 24.81` ml; `ABV0 = 40.146` %; `V = 74.16`; `ABV =
33.455` %; sugar `= 100·4.2/74.16 = 5.663` g/100 ml; units 2.481.

**Shaken Daiquiri** (`balance-shaken-daiquiri`; 60 ml rum 40 %, 22.5 ml
lime juice 1.5 g sugar and 6 % acid, 22.5 ml 1:1 syrup 61.48 g sugar,
`f` = 0.25): `V0 = 105`; `E = 24` ml; `ABV0 = 22.857` %; `V = 131.25`;
`ABV = 18.286` %; `S = 22.5·0.015 + 22.5·0.6148 = 0.3375 + 13.833 =
14.1705` g; sugar `= 100·14.1705/131.25 = 10.797` g/100 ml; `C =
22.5·0.06 = 1.35` g; acid `= 1.029` %; `S/C = 10.497`; units 2.4.

**Built highball** (`balance-built-highball`; 60 ml whisky 40 %, 150 ml
soda water, `f` = 0.10): `V0 = 210`; `E = 24`; `ABV0 = 11.429` %; `V =
231`; `ABV = 10.390` %; units 2.4.

**1:1 simple syrup by mass** (`prepared-simple-syrup-1-1`; 100 g sugar,
100 g water, `ρ` = 1.2296 g/ml): `volume = 200/1.2296 = 162.655` ml;
sugar `= 100·100/162.655 = 61.48` g/100 ml.

# Evidence

"Seen" means a search-result summary of the page, not the page.

| Number or claim                                                                        | Where                          | Status                                                             |
| -------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------ |
| Stir adds 15–20 % (practice doc said 20–25 %)                                          | Death & Co page, seen          | secondary                                                          |
| Shake adds 20–25 % (practice doc said 25–30 %)                                         | Death & Co page, seen          | secondary                                                          |
| Stir about 20 %                                                                        | Difford's Guide, seen          | secondary                                                          |
| 25–35 % shake, 15–20 % stir on other pages                                             | low-quality pages              | not used                                                           |
| Dilution depends on ABV and components, no single ideal                                | Arnold blog, seen              | secondary                                                          |
| Same final temperature gives same dilution                                             | Arnold, via a book summary     | secondary                                                          |
| Shake 12–15 s; stir over two minutes to match                                          | Arnold blog, seen              | secondary                                                          |
| Book equations, "50–60 % dilution (p. 125)"                                            | reader summaries that disagree | unresolved, not used                                               |
| Defaults 0.20 stir, 0.25 shake                                                         | chosen mid-range               | assumption                                                         |
| `build` 0.10, `blend` 1.0                                                              | placeholders                   | assumption                                                         |
| UK unit is 10 ml ethanol, 8 g                                                          | NHS and NHS trust pages, seen  | secondary                                                          |
| Ethanol density 0.789 g/ml                                                             | well known                     | assumption                                                         |
| Syrup density 1.2296 g/ml                                                              | recalled from tables           | assumption                                                         |
| Juice acid 6 %, sugar 1.5 g/100 ml; triple sec 25 g/100 ml; spirit 40 %; vermouth 16 % | none read                      | assumption                                                         |
| Six root templates and their ratios                                                    | Cocktail Codex, not at hand    | assumption                                                         |
| Stirred 28–32 %, shaken sours 14–18 %, highball 8–12 % (practice doc)                  | computed here instead          | replaced, see [practice](bartender-practice.md#balance-as-numbers) |

## Owner tasks (sources needed)

Pages or posts that would turn assumptions into verified numbers:

1. Dave Arnold, _Liquid Intelligence_, chapter on dilution, around pages
   123 to 126: the equations for shaken and stirred dilution against
   starting ABV, and what "dilution" is defined as in the "50–60 %" figure.
2. _Cocktail Codex_, the chapters on stirred and shaken drinks and the
   six root templates: the ratios and any dilution percentages.
3. Arnold's Cooking Issues posts "Cocktail Science V: Ideal Dilution
   Through %ABV Blind Testing" and the two cocktail-science posts above,
   read in full.
4. Ingredient data: a table of juice acid and sugar and the density of
   sucrose solutions (for example a food chemistry reference).
5. Allow the blocked hosts so the above can be read by an agent.
