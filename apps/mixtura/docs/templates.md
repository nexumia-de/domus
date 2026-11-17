---
type: Specification
title: Templates
description: The six root templates as data, how a spec is matched to a template by roles and ratios (assignment, distance, tie rule, no template as an outcome), the range check with its within, below, above and unknown results, the evidence of every number and the vectors that pin them.
tags: [templates, matching, ranges, engine, vectors]
generated: { by: claude-code/2.1.326, at: 2026-11-17 }
sources:
  - id: balance
    title: 'Balance, section Usual ranges per template (computed ranges, all assumptions)'
    url: balance.md#usual-ranges-per-template
  - id: practice
    title: 'How bartenders work, section Templates instead of recipes'
    url: bartender-practice.md#templates-instead-of-recipes
  - id: data-model
    title: 'Data model, section Template'
    url: data-model.md#template
  - id: codex
    title: 'Alex Day, Nick Fauchald, David Kaplan: Cocktail Codex (2018); not at hand, the six templates are known only through the practice document'
  - id: wiki-iba
    title: 'Wikipedia infoboxes of Manhattan, Martini, Screwdriver, Whiskey sour, Tom Collins, Negroni, Moscow mule (https://en.wikipedia.org/wiki/Manhattan_(cocktail) and the others, wikitext read on 2026-11-17): they reproduce the IBA official specifications; the IBA site itself (iba-world.com) is blocked, so these are secondary'
  - id: wiki-embury
    title: 'Wikipedia, The Fine Art of Mixing Drinks (https://en.wikipedia.org/wiki/The_Fine_Art_of_Mixing_Drinks), read on 2026-11-17: Embury 1948, two types (aromatic, sour), sour ratio 1 sweet : 2 sour : 8 base, base 75 % or more of the volume, six basic drinks; the book itself is not readable (archive.org lending copy, download host blocked)'
  - id: wiki-screwdriver
    title: 'Wikipedia, Screwdriver (https://en.wikipedia.org/wiki/Screwdriver_(cocktail)), read on 2026-11-17: quotes Newsweek 21 Feb 1944, p. 36, "a half-orange-juice and half-vodka drink", and the IBA specification 5 cl vodka, 10 cl orange juice'
  - id: penniston
    title: 'Penniston KL et al.: Quantitative assessment of citric acid in lemon juice, lime juice, and commercially-available fruit juice products, J Endourol 22(3):567-570 (2008), PMC2637791, Table 1'
    url: https://pmc.ncbi.nlm.nih.gov/articles/PMC2637791/
---

# Templates

Engine side of the Template entity of the [data model](data-model.md).
Code: `packages/engine/src/templates/`, one job per file; data:
`packages/engine/data/templates/*.json`, one file per template, validated
against `schemas/template.schema.json`.

| File       | Job                                                                            |
| ---------- | ------------------------------------------------------------------------------ |
| `types.ts` | `Template`, `MatchSpec`, `Candidate`, `MatchResult`, `RangeCheck`              |
| `data.ts`  | `ROOT_TEMPLATES`, the six files in the order of the practice document          |
| `slots.ts` | `assignSlots`: lines to slots by role; unassigned lines, empty slots; `lineMl` |
| `match.ts` | `matchSpec`: ratios, distance, ranking, the chosen template                    |
| `range.ts` | `checkRange`: figures after dilution against the usual range                   |

# Evidence

**No number in the six templates is verified.** _Cocktail Codex_ was not
at hand and the hosts of the primary sources are blocked
([development](development.md#network-hosts)); the templates are known
only through the [practice document](bartender-practice.md#templates-instead-of-recipes).
Every template carries `slotEvidence: assumption` and
`usual.evidence: assumption`, and its `source` says so; a range check
returns that status with every range.

| Number                                                          | Where it comes from                                                                                                                                                                                                                                                                                                                                                                        | Status                           |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| Usual ranges (ABV, sugar, acid)                                 | the table in [balance](balance.md#usual-ranges-per-template), computed from nominal specs; a test compares the files with the table                                                                                                                                                                                                                                                        | assumption                       |
| Lime 4.58, lemon 4.80 g acid per 100 ml in the sour acid ranges | Penniston et al. 2008, Table 1, read[^penniston]; the range around them stays computed from assumed volumes and dilution                                                                                                                                                                                                                                                                   | input read, range assumption     |
| Highball ABV 9.1 – 12.1 %                                       | the same section: 120 to 180 ml of mixer                                                                                                                                                                                                                                                                                                                                                   | assumption                       |
| Highball mixer 2 – 6 parts                                      | lower edge 2: 1944 Screwdriver 1 : 1 (Newsweek, quoted on Wikipedia)[^wiki-screwdriver], IBA Screwdriver 1 : 2 is 4 parts[^wiki-iba]; upper edge 6 and nominal 4 – 6: practice document, 4 to 6 oz of mixer against 2 oz of spirit                                                                                                                                                         | assumption                       |
| Nominal slot ratios (2 : 1, 2 : ¾ : ¾ ...)                      | practice document                                                                                                                                                                                                                                                                                                                                                                          | assumption                       |
| Martini modifier slot, 0.25 – 2                                 | lower edge: IBA Dry Martini 60 ml gin, 10 ml vermouth is 0.33 parts[^wiki-iba], Embury's Martini 7 : 1 is 0.29 (search summary of a page, unverified); 0.25 is a round number below both (assumption); upper edge 2 as before                                                                                                                                                              | secondary lower edge, assumption |
| Martini second modifier slot, 0.25 – 2 (optional)               | structure: Manhattan with equal parts sweet and dry vermouth[^wiki-iba]; band as the first modifier slot                                                                                                                                                                                                                                                                                   | assumption                       |
| Daiquiri sweet and Sidecar liqueur slots, 0.25 – 1.5            | lower edge 0.25 = Embury's 1 part sweet to 8 parts base (2 x 1 / 8)[^wiki-embury]; sour 0.5 (2 x 2 / 8) was already inside 0.38 – 1.5; upper edge unchanged                                                                                                                                                                                                                                | secondary lower edge             |
| Band around a nominal ratio: ÷ 2 to × 2                         | **chosen here** so that the classic riffs fit; rounded to two decimals; not from any source                                                                                                                                                                                                                                                                                                | assumption                       |
| Martini bitter slot, 0.02 – 2 (optional)                        | upper edge 2: **chosen here** so that Boulevardier fits (Negroni family). Lower edge 0.02 so that dashes of aromatic bitters fit: IBA Manhattan 50 ml whiskey, 20 ml vermouth, 1 dash (0.92 ml, [units](units.md)) is 0.037 parts[^wiki-iba]; Embury names bitters among the modifying agents of the aromatic type[^wiki-embury]; the edge 0.02 is a round number below 0.037 (assumption) | assumption                       |

Bands are data, not code: changing a band is editing a JSON file. Owner
task: read the Codex chapters on the six templates and replace the
bands by the authors' own ratios; every template that then agrees with a
source gets `verified` for that part.

**What the literature says (#70, read 2026-11-17).** Primary sources
could not be read: _Cocktail Codex_, Embury, Regan, Wondrich and the IBA
site are books or blocked hosts ([development](development.md#network-hosts));
no page that gives the Codex root ratios was reachable. Wikipedia was
reachable and quotes what is needed, as a secondary source:

- Embury (1948) sorts cocktails into two types, **aromatic** (modifiers are
  bitters or aromatic wines and spirits) and **sour** (juice and sugar),
  gives sours 1 sweet : 2 sour : 8 base, says the base is 75 % or more of
  the volume, and names six basic drinks: Daiquiri, Jack Rose, Manhattan,
  Martini, Old Fashioned, Sidecar[^wiki-embury]. His sour ratio gives the
  Daiquiri a sweet part of 2 x 1 / 8 = 0.25, below the old band minimum 0.38.
- IBA specifications as reproduced in the Wikipedia infoboxes[^wiki-iba]:
  Manhattan 50 ml rye, 20 ml sweet vermouth, 1 dash Angostura (modifier
  0.8 parts, bitters 0.037 parts); Martini (dry) 60 ml gin, 10 ml dry
  vermouth (0.33 parts, below the old minimum 0.5); Screwdriver 5 cl vodka,
  10 cl orange juice (4 parts); Tom Collins 60 ml gin, 25 ml lemon juice,
  15 ml syrup, 50 ml soda; Moscow Mule 45 ml vodka, 10 ml lime juice, 120 ml
  ginger beer; Whiskey Sour 3 : 2 : 1 (4.5 cl, 3 cl, 1.5 cl); Negroni
  equal parts.
- The Screwdriver is described in a Newsweek of 21 February 1944 as "a
  half-orange-juice and half-vodka drink"[^wiki-screwdriver]: 1 : 1 is 2
  parts, so a Screwdriver of 2 : 3 (the seed's) is a classic proportion.
- The Codex's six roots (Old-Fashioned, Martini, Daiquiri, Sidecar,
  Highball, Flip) and their structure (core, balance, seasoning) are known
  only from search-result summaries; no ratio was read, so the nominal
  ratios stay assumptions. Regan's, Wondrich's and Difford's families were
  not reachable at all.

**What changed in the data** (all lower or structural edges, each tied to
a source above; evidence stays `assumption` for the template as a whole
because the nominal ratios are unread, and the `source.note` of each file
names the sourced edge): Martini modifier slot 0.5 to 0.25, Martini bitter
slot 0.5 to 0.02, a second optional modifier slot in the Martini, Daiquiri
sweet and Sidecar liqueur slots 0.38 to 0.25, Highball mixer 4 to 2. The
usual ranges are unchanged (they describe the nominal spec, not the band).

## Seed measurement

`node scripts/templates/run.mjs` (source `scripts/templates/unmatched.ts`;
`--examples` adds names and ratios per reason, `--all` lists every group)
matches every non-optional line set of the seed against the root templates
and groups the specs that fit none by the roles of their lines.

| Measured on 635 specs  | Before (bands of 2026-11-17) | After |
| ---------------------- | ---------------------------- | ----- |
| Specs with a template  | 107                          | 158   |
| Martini                | 57                           | 104   |
| Daiquiri               | 24                           | 25    |
| Sidecar                | 14                           | 14    |
| Old-Fashioned          | 8                            | 8     |
| Highball               | 3                            | 6     |
| Flip                   | 1                            | 1     |
| Specs with no template | 528                          | 477   |

(The issue counted 442 of 548 unmatched at the time of its writing; the
seed has 635 specs now.) The Manhattan (classic vector `manhattan`) now
fits the Martini and the Screwdriver (`screwdriver`) the Highball.

What stays unmatched, by role signature (after; counts of specs) and
the reason the nearest template fails (a spec can have several):

| Group (roles of the lines, method)              | Specs | Nearest, why                                                |
| ----------------------------------------------- | ----- | ----------------------------------------------------------- |
| base, modifier, sour, sweet (shake)             | 29    | Daiquiri or Sidecar: two sweeteners, no slot for the second |
| base, lengthener, sour, sweet (shake)           | 22    | Daiquiri: no slot for a lengthener (Collins, Fizz, Mule)    |
| base, bitter, lengthener, sour, sweet (shake)   | 19    | Daiquiri, Highball: bitter and lengthener                   |
| base, bitter, sour, sweet (shake)               | 18    | Daiquiri: dashes of bitters, no slot                        |
| base, lengthener, modifier, sour, sweet (shake) | 16    | Daiquiri: tiki and multi-ingredient sours                   |
| accent, base, sour, sweet (shake)               | 13    | Daiquiri: muddled herbs or fruit (Smash, Southside)         |
| base, modifier, sour (shake)                    | 12    | Sidecar: two liqueurs or equal parts (Corpse Reviver 2)     |
| base, bitter, modifier (stir)                   | 11    | Martini: bitter liqueur above the band or two modifiers     |

Largest reasons over all unmatched specs: no slot for a lengthener (90
at the nearest Daiquiri), for bitters (73), for a second modifier (69), for
an accent (41). So the remaining gap is **structural** (families with
roles the six templates do not have), not ratio bands.

## Proposed families (not implemented)

A new root template changes the pinned "six roots" (tests, the classics
coverage, the screens' wording) and needs a source for its bands; none
of the following has a source for a band yet, so they are proposals with
measured demand, not data:

| Family                                                | Structure                                  | Specs it would take                                                            | Source needed                                                                              |
| ----------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Collins and Fizz, Mule (sour + soda)                  | base, sour, sweet, lengthener              | 18 (measured with a trial template, bands 0.38 - 1.5, 0.25 - 1.5, 1 - 4 parts) | IBA Tom Collins 60 : 25 : 15 : 50 is 0.83 : 0.5 : 1.67 parts[^wiki-iba]; more specs needed |
| Sours with a second sweetener or bitters              | Daiquiri or Sidecar with optional slots    | about 60 (groups above)                                                        | Codex Daiquiri and Sidecar chapters, Embury "special flavouring agents"                    |
| Spritz (aperitif + wine + soda)                       | no base role: bitter, lengthener, modifier | 11 (`bitter+lengthener`, `lengthener+modifier`)                                | IBA Spritz or Americano specification                                                      |
| Stirred with two modifiers and a sweetener            | base, bitter, modifier, sweet (stir)       | 9                                                                              | Codex Martini and Old-Fashioned chapters                                                   |
| Tiki and multi-spirit sours                           | several base lines, juice, syrup, liqueur  | 16 + 7                                                                         | Wondrich, Beachbum Berry (not read)                                                        |
| Flips and egg drinks, hot drinks, Champagne cocktails | texture or sparkling wine, hot method      | few in the seed                                                                | Regan, Codex Flip chapter; no method for hot drinks                                        |

The trial template for the first row was removed again: it is not in the
data. Where the sources are read, a family is added as one JSON file in
`data/templates/` plus its vectors; the matching code does not change.

# Ratios

Ratios are in parts against a reference ([data model](data-model.md#template)):
the first slot with role `base` counts as its own `minParts` / `maxParts`
(2, the "2 oz" of the practice), every other slot as
`2 × volume of the slot / volume of the reference slot`. The six
templates:

| Template      | Slots (role, parts)                                                                 | Method | Parent   |
| ------------- | ----------------------------------------------------------------------------------- | ------ | -------- |
| Old-Fashioned | base 2, sweet 0.08 – 0.33, bitter 0.03 – 0.12                                       | stir   |          |
| Martini       | base 2, modifier 0.25 – 2, modifier 0.25 – 2 (optional), bitter 0.02 – 2 (optional) | stir   |          |
| Daiquiri      | base 2, sour 0.38 – 1.5, sweet 0.25 – 1.5                                           | shake  |          |
| Sidecar       | base 2, sour 0.38 – 1.5, modifier 0.25 – 1.5                                        | shake  | daiquiri |
| Highball      | base 2, lengthener 2 – 6                                                            | build  |          |
| Flip          | base 2, sweet 0.25 – 1, texture 0.75 – 3                                            | shake  |          |

The Sidecar is a sour whose sweet part is a liqueur: its third slot has
role `modifier` and the Daiquiri's has role `sweet`. So a Margarita with
triple sec (role `modifier`) is a Sidecar and one with agave syrup is a
Daiquiri; both are the sour family.

# Matching

`matchSpec(tree, templates, spec, options)`; `options.alcohol` offers the
variants of that class ([variants](#variants-by-alcohol-class)). A spec line is
`{ ingredientId, amount, amountMax?, unit, role?, topMl? }`; a range line
counts at its middle.

1. **Role of a line**: its own `role`, else the ingredient's resolved role
   ([ingredients](ingredients.md#properties)). A line whose ingredient is
   not in the tree (`unknown-ingredient`) or has no role (`unknown-role`)
   fits no slot.
2. **Slots** (`assignSlots`): a line goes to the first slot of its role that
   is still empty, else to the first slot of that role; several lines
   may share one slot and their volumes add. A line whose role no slot has
   is unassigned (`no-slot-for-role`). The result lists, per slot, its
   lines, the unassigned lines and the empty required and optional slots.
3. **Volumes**: volume units to ml with the [amounts](engine-amounts.md)
   module; a counted line (`whole`, `slice`, ...) by the ingredient's
   `unitVolumes` ([units](units.md#counted-units)). A mass (sugar in
   grams), a `top` line without `topMl` or a counted line without a known
   volume (`counted-without-volume`) has no volume: its slot is filled (role coverage counts) but its ratio is
   `unmeasured` and adds nothing to the distance. The result says so.
4. **Ratio status** per filled slot: `reference`, `within`, `below`,
   `above` against its band, `unmeasured`, or `empty`.
5. **Distance** = number of empty required slots + number of unassigned
   lines + for each measured slot outside its band the relative excess
   (`(min − parts) / min` below, `(parts − max) / max` above).
   **Offset** = for each measured slot, `|parts − middle of band| / middle`.
   Both are rounded to 9 decimals so floating-point noise never decides.
6. **Ranking**: ascending distance, then ascending offset, then template
   id in code-point order. The same input gives the same order whatever
   the order of the template list.
7. **Fits**: distance 0. `chosen` is the best candidate if it fits; if
   not, `chosen` is absent. **No template is a normal outcome**; the
   candidates are still listed with their distances, so a screen can say
   which slot is empty or which ratio is outside its band.
8. **Tie rule**: when the best two candidates have the same distance and
   offset, the smaller id wins and `chosen.tieBrokenById` is `true`.

An explicit `templateId` on the spec is never overridden: only that
template is analysed and it is `chosen` with basis `explicit`
(`known: false` if no template has that id); matching only suggests
(basis `suggested`) when the id is missing.

The Highball and the Flip are the cases where one role decides: a
carbonated mixer (`lengthener`) makes a Highball, an egg (`texture`) a
Flip; without the egg, spirit and syrup fit no template.

# Variants by alcohol class

Four templates in `packages/engine/data/template-variants/` (export
`VARIANT_TEMPLATES`) are variants of a root template for a drink with
little or no ethanol. They are ordinary Template records with two
additions: `parentId` names the root and `alcohol` (`none` or `low`) names
the class ([data model](data-model.md#template)). The class is computed
from the ABV after dilution by `classifyAlcohol`
([non-alcoholic](non-alcoholic.md#as-built-36)); it is never stored on a
drink.

| Variant       | Parent   | Class | Differs from the parent                                                                      |
| ------------- | -------- | ----- | -------------------------------------------------------------------------------------------- |
| `na-sour`     | Daiquiri | none  | name and note only: tea, tisane or a distillate as `base`, verjus or acid solution as `sour` |
| `na-highball` | Highball | none  | an optional `bitter` slot, 0.25 - 2 parts (chosen): the spritz with a non-alcoholic aperitif |
| `na-foamed`   | Flip     | none  | aquafaba as `texture`                                                                        |
| `low-stirred` | Martini  | low   | `modifier` optional, `bitter` optional with band 0.03 - 2 (chosen)                           |

**Why variants, and why selected by class.** A match uses roles and
ratios, and ethanol is neither: a tea in the `base` slot of a sour fits the
Daiquiri exactly. A variant with the same slots would tie with its parent
on every spec, and the id order would decide, which is arbitrary. So
`matchSpec(tree, templates, spec, { alcohol })` takes the class of the drink
and rule: a template with `alcohol` is a candidate only for its own class;
a template without it is left out when a variant of it exists for that
class; all others stay. Without `options.alcohol` (or with `standard` or
`unknown`) every variant is left out and the result is exactly the result
for the root templates; a vector checks that for each spec of the
vectors. An explicit `templateId` is never replaced.

**Decisions with reasons** (the proposals of
[non-alcoholic](non-alcoholic.md#proposed-templates-and-variants)):

1. Non-alcoholic sour, highball, foamed drink and low-ABV stirred drink are
   variants of a root, because their slots are those of the root and only
   the class of the base differs.
2. The spritz and the shrub drink are not templates of their own. A
   spritz is the highball with an aperitif, hence the optional `bitter`
   slot of `na-highball`; a shrub drink is the highball with the shrub as
   `base` (set the line role): a template with the same roles would tie
   with `na-highball`. The reference slot of a template is its first `base`
   slot, so a template without one would leave every ratio unmeasured.
3. `na-highball` and the others are offered for `none` only, `low-stirred`
   for `low` only. A drink whose ABV is unknown (an unmeasured ferment, a
   distillate without a label ABV) is `unknown` and matches the root
   templates, as before. Its figure is not guessed.
4. Old-Fashioned, Martini and Sidecar made without ethanol have no variant:
   they match their root (a vector: tea, syrup and non-alcoholic bitters is
   an Old-Fashioned).

**Evidence.** Every slot ratio is `assumption` ([evidence](#evidence));
`na-sour`, `na-highball` and `na-foamed` carry sugar and acid ranges
computed from the nominal spec of the parent with the base replaced volume
for volume (so they equal the parent's: 10.4 - 11.2 g, 0.75 - 0.82 %; 0 and
0; 5.9 - 6.4 g and 0) and marked `assumption`; a test recomputes them. None
has an ABV range: the ABV of a drink without ethanol is classified, not
range-checked, and the check then reports `unknown` with the reason "no
range". `low-stirred` has no `usual`: no source and no class value for
fortified wine ABV was read.

# Range check

`checkRange(template, after)` takes the figures after dilution
(`abvPct`, `sugarPer100Ml`, `acidPct` of
[balance](balance.md#engine), or `undefined` when there are none) and
returns three entries in the order abv, sugar, acid:

| Field                  | Meaning                                                                                                                      |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `status`               | `within`, `below`, `above` or `unknown`; ends of the range count as within                                                   |
| `value`                | the figure, when known                                                                                                       |
| `range`                | `{ min, max }` of the template, when it has one                                                                              |
| `evidence`             | the range's evidence status, `unstated` if the template gives none                                                           |
| `sourceName`           | the template's source                                                                                                        |
| `reason`, `missingIds` | why the status is `unknown`: no range, no figures after dilution, an unknown figure and the ingredients that made it unknown |

Screens use `evidence` to decide how a result is worded: position words
(Within, Below, Above) only when it is `verified`, `secondary` or
`derived`; for `assumption` or `unstated` the range is shown as "Assumed
range" without a position word ([balance](balance.md#how-precise-a-range-is-shown)).
`status` stays computed either way.

The output has no field that judges the drink, and a test scans code,
data, vectors, this document and every result for such words. A figure
outside its range is worded "outside the usual range of this template"
([balance](balance.md)).

# Vectors

`packages/engine/vectors/templates/`, schema `templates-vector.schema.json`,
run by `test/templates.test.ts`; ingredients with roles only are in
`tree.json`. 45 vectors, expected values worked out by hand from the
bands above:

- `match-*` and `near-*`: a classic example and riffs per template
  (Old-Fashioned with sugar and with syrup; Martini, Boulevardier,
  50-50; Daiquiri, Whiskey Sour, Tommy's Margarita; Sidecar, Margarita;
  Highball with soda and with a `top` line; Flip), and near misses
  (missing slot, ratio outside the band). Since #70 also the sourced
  band edges, each with its working in the description:
  `match-martini-manhattan-iba`, `match-martini-dry-iba`,
  `match-martini-two-vermouths`, `match-daiquiri-embury-sour`,
  `match-sidecar-embury-sour`, `match-highball-equal-parts`,
  `match-highball-iba-screwdriver-ratio`; the three near misses for
  Martini, Sidecar and Highball were moved to ratios below the new edges
  (0.2, 0.1667 and 1 part).
- `ambiguous-*`: the tie rule (inline templates; id order, and offset
  before id).
- `unknown-*`, `role-override-*`: lines without role or ingredient,
  and a role given on the line.
- `explicit-*`, `none-*`: explicit id kept, unknown explicit id, no
  template.
- `range-*`: every template; within, below, above, unknown (unknown
  figure, no dilution, template without range); both ends inclusive.

The variants and the class rule have their own vectors in
`vectors/non-alcoholic/` (see [engine](engine.md#vectors)): the same spec
with and without a class, with class unknown or standard, the spritz
with and without the class, the Old-Fashioned that stays.

# Not in this module

Template editing, and the copy that
shows these results (see [screens](screens-browse.md)).
