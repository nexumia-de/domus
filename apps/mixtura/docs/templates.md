---
type: Specification
title: Templates
description: The six root templates as data, how a spec is matched to a template by roles and ratios (assignment, distance, tie rule, no template as an outcome), the range check with its within, below, above and unknown results, the evidence of every number and the vectors that pin them.
tags: [templates, matching, ranges, engine, vectors]
generated: { by: claude-code/2.1.327, at: 2026-11-18 }
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
    title: "Alex Day, Nick Fauchald, David Kaplan: Cocktail Codex (Ten Speed Press, 2018), chapters 1 to 6; the quantities of the table in Evidence were read by the lead on 2026-11-18 from the owner's copy; ratios cited as facts, no text copied"
  - id: iba
    title: 'IBA, official specifications, one page per cocktail (https://iba-world.com/iba-cocktail/<slug>/, list https://iba-world.com/cocktails/all-cocktails/), read on 2026-11-17 (#116): 102 cocktails; amounts as printed in the table of the section IBA specifications read. Primary for what the IBA prints; the site no longer lists Screwdriver, Tom Collins, Jack Rose, Gimlet'
  - id: wiki-iba
    title: 'Wikipedia infoboxes of Manhattan, Martini, Screwdriver, Whiskey sour, Tom Collins, Negroni, Moscow mule (https://en.wikipedia.org/wiki/Manhattan_(cocktail) and the others, wikitext read on 2026-11-17): they reproduce an older IBA list; kept only for the Screwdriver and the Tom Collins, which the IBA site no longer has, and found to differ for Whiskey Sour and Tom Collins (see IBA specifications read); secondary'
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
Code: `src/templates/` in [materia](https://github.com/nexumia-de/materia), one job per file; data:
`packages/engine/data/templates/*.json`, one file per template, validated
against `schemas/template.schema.json`.

| File          | Job                                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------- |
| `types.ts`    | general `Template`, `MatchSpec`, `Candidate`, `MatchResult`, generic in the role id                           |
| `slots.ts`    | `fillSlots`: lines to slots by role with the caller's measure; unassigned lines, empty slots; `lineRole`      |
| `match.ts`    | `matchTemplates`: ratios of measured slots against the reference role, distance, ranking, the chosen template |
| `variants.ts` | `findVariants`: the variants of the matched template, by a variant class of the domain                        |

The drink side lives in `packages/engine/src/drink-templates/` (exported
through `src/drink.ts`):

| File        | Job                                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------------------- |
| `types.ts`  | the drink `Template` (`alcohol`, `glass`, `usual`), the role-typed shapes with the drink `Role`, `RangeCheck` |
| `match.ts`  | `matchSpec` and `variantSuggestions`: the base slot as reference, the alcohol class choosing variants         |
| `data.ts`   | `ROOT_TEMPLATES`, the six files in the order of the practice document                                         |
| `range.ts`  | `checkRange`: figures after dilution against the usual range                                                  |
| `volume.ts` | `lineMl` (the volume measure, from the unit table) and `assignSlots` with it                                  |

# Evidence

**The nominal ratios were read in the book; nothing else is verified.**
The six roots come from _Cocktail Codex_[^codex]. On 2026-11-18 the lead
read the classic recipe and the authors' root recipe of each chapter from
the owner's copy; the quantities are facts and are cited as such, no text
is copied. Parts are `2 × slot / base` ([Ratios](#ratios)):

| Chapter, template | Classic recipe                                          | Authors' root recipe                                  | Nominal spec of the data (ml) | Agrees with                         |
| ----------------- | ------------------------------------------------------- | ----------------------------------------------------- | ----------------------------- | ----------------------------------- |
| 1 Old-Fashioned   | 2 oz bourbon, 1 sugar cube, 2 dashes bitters            | 2 oz, 1 tsp syrup, 2 + 1 dashes bitters               | 60, 4.2 g sugar, 1.8 bitters  | the classic                         |
| 2 Martini         | 2 oz gin, 3/4 oz dry vermouth (vodka: 2 1/2 oz, 1/2 oz) | 2 oz gin, 1 oz dry vermouth, 1 dash orange bitters    | 60, 30                        | the root                            |
| 3 Daiquiri        | 2 oz rum, 3/4 oz lime juice, 3/4 oz simple syrup        | 2 oz rum (1 3/4 + 1/4), 1 oz lime juice, 3/4 oz syrup | 60, 22.5, 22.5                | the classic                         |
| 4 Sidecar         | 1 1/2 oz Cognac, 1 oz orange liqueur, 3/4 oz lemon      | the same plus 1 tsp simple syrup                      | 60, 40, 30 (since 2026-11-18) | the classic (before: 2 : 3/4 : 3/4) |
| 5 Highball        | 2 oz whisky, 6 oz seltzer                               | 2 oz whisky, 4 oz seltzer                             | 60, 150 (5 oz)                | between the two                     |
| 6 Flip            | 2 oz spirit or fortified wine, 2 tsp demerara, 1 egg    | 2 oz oloroso sherry, 1/2 oz syrup, 1 whole egg        | 60, 15, 45 egg                | the root                            |

The book files every other drink under one of these six: Collins, Mule,
Mojito, French 75, Whiskey Sour, Southside and Mai Tai under the Daiquiri
(chapter 3); Margarita, Cosmopolitan and Last Word under the Sidecar
(chapter 4); Negroni and Manhattan under the Martini (chapter 2); Sazerac
and Mint Julep under the Old-Fashioned (chapter 1); Aperol Spritz and
Bloody Mary under the Highball (chapter 5); Piña Colada and Eggnog under
the Flip (chapter 6). The data follows that: six roots, no seventh, and
optional slots for what the book treats as variation
([decision](decisions/six-roots-optional-slots.md)).

**What stays an assumption.** The schema has one evidence field per
template (`slotEvidence`) and one for the usual ranges (`usual.evidence`),
and neither can say "nominal ratio read, band chosen". Both stay
`assumption` for all six templates; the `source.note` of each file says
precisely what was read and what was chosen here, and a range check
returns `assumption` with every range. The schema was not extended.
Reading the table: the book states only the nominal ratios. Every band
(÷ 2 to × 2 around the nominal, the edges below, the optional slots), every
usual range (computed, [balance](balance.md#usual-ranges-per-template))
and the Highball ABV span are chosen here or computed, not read.
Since #116 the IBA specifications are read at the primary source
([below](#iba-specifications-read)); they agree with the sourced band
edges for the Martini and Manhattan, which keep `assumption` because an
edge is a chosen round number below an observed value.

| Number                                                          | Where it comes from                                                                                                                                                                                                                                                                                                                                                                                           | Status                           |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| Usual ranges (ABV, sugar, acid)                                 | the table in [balance](balance.md#usual-ranges-per-template), computed from nominal specs; a test compares the files with the table                                                                                                                                                                                                                                                                           | assumption                       |
| Lime 4.58, lemon 4.80 g acid per 100 ml in the sour acid ranges | Penniston et al. 2008, Table 1, read[^penniston]; the range around them stays computed from assumed volumes and dilution                                                                                                                                                                                                                                                                                      | input read, range assumption     |
| Highball ABV 9.1 – 12.1 %                                       | the same section: 120 to 180 ml of mixer                                                                                                                                                                                                                                                                                                                                                                      | assumption                       |
| Highball mixer 2 – 6 parts                                      | lower edge 2: 1944 Screwdriver 1 : 1 (Newsweek, quoted on Wikipedia)[^wiki-screwdriver], IBA Screwdriver 1 : 2 is 4 parts[^wiki-iba] (the IBA site no longer lists the Screwdriver, so only the Wikipedia reading remains); upper edge 6 and nominal 4 – 6: practice document, 4 to 6 oz of mixer against 2 oz of spirit                                                                                      | assumption                       |
| Nominal slot ratios (2 : 1, 2 : ¾ : ¾, 1½ : 1 : ¾ ...)          | Cocktail Codex[^codex], table above (read by the lead 2026-11-18); the schema cannot mark "nominal read, band assumed", so the field stays `assumption`                                                                                                                                                                                                                                                       | read; field stays assumption     |
| Martini modifier slot, 0.25 – 2                                 | lower edge: IBA Dry Martini 60 ml gin, 10 ml vermouth is 0.33 parts[^iba] (read at iba-world.com), Embury's Martini 7 : 1 is 0.29 (search summary of a page, unverified); 0.25 is a round number below both (assumption); upper edge 2 as before                                                                                                                                                              | secondary lower edge, assumption |
| Martini second modifier slot, 0.25 – 2 (optional)               | structure: Manhattan with equal parts sweet and dry vermouth (named on Wikipedia[^wiki-iba]; the IBA Manhattan page prints no such variant); band as the first modifier slot                                                                                                                                                                                                                                  | assumption                       |
| Daiquiri sweet and Sidecar liqueur slots, 0.25 – 1.5            | lower edge 0.25 = Embury's 1 part sweet to 8 parts base (2 x 1 / 8)[^wiki-embury]; sour 0.5 (2 x 2 / 8) was already inside 0.38 – 1.5; upper edge unchanged                                                                                                                                                                                                                                                   | secondary lower edge             |
| Sidecar acid and liqueur upper edges 2.0 and 2.67               | twice the book's nominal (1.0 and 1.33), by the band rule below; lower edges 0.38 and 0.25 unchanged                                                                                                                                                                                                                                                                                                          | assumption                       |
| Optional slots of the six templates                             | **chosen here**, each slot's `note` says so; the book files the drinks under the template but gives no ratio for them                                                                                                                                                                                                                                                                                         | assumption                       |
| Band around a nominal ratio: ÷ 2 to × 2                         | **chosen here** so that the classic riffs fit; rounded to two decimals; not from any source                                                                                                                                                                                                                                                                                                                   | assumption                       |
| Martini bitter slot, 0.02 – 2 (optional)                        | upper edge 2: **chosen here** so that Boulevardier fits (Negroni family). Lower edge 0.02 so that dashes of aromatic bitters fit: IBA Manhattan 50 ml whiskey, 20 ml vermouth, 1 dash (0.92 ml, [units](units.md)) is 0.037 parts[^iba] (read at iba-world.com); Embury names bitters among the modifying agents of the aromatic type[^wiki-embury]; the edge 0.02 is a round number below 0.037 (assumption) | assumption                       |

Bands are data, not code: changing a band is editing a JSON file. Open
question for the owner: if the schema is to say "nominal ratio verified,
band assumption" separately, `slotEvidence` needs a second field; until
then nothing is marked `verified`.

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
  equal parts. **Checked at iba-world.com on 2026-11-17**[^iba]: Manhattan,
  Dry Martini, Moscow Mule and Negroni agree; **Whiskey Sour differs**
  (45 ml bourbon, 25 ml lemon juice, 20 ml sugar syrup, not 3 : 2 : 1);
  the **Tom Collins is not on the list** and the John Collins that is
  there reads 45 : 30 : 15 : 60, not 60 : 25 : 15 : 50; the **Screwdriver
  is not on the list**. No number in a template file or vector used the
  differing figures, so no data changed.
- The Screwdriver is described in a Newsweek of 21 February 1944 as "a
  half-orange-juice and half-vodka drink"[^wiki-screwdriver]: 1 : 1 is 2
  parts, so a Screwdriver of 2 : 3 (the seed's) is a classic proportion.
- The Codex's six roots (Old-Fashioned, Martini, Daiquiri, Sidecar,
  Highball, Flip): until 2026-11-17 known only from search-result
  summaries; the quantities of the table above were read on 2026-11-18.
  Regan's, Wondrich's and Difford's families were not reachable at all.

**What changed in the data on 2026-11-18** (six roots kept, the book's
filings followed; [decision](decisions/six-roots-optional-slots.md)): the
Sidecar's nominal ratio is the book's 1½ : 1 : ¾ (liqueur 1.33, acid 1.0
parts), its band upper edges 2.0 (acid) and 2.67 (liqueur), its usual
ranges recomputed (23.7 – 25.6 %, 6.2 – 6.7 g, 0.85 – 0.92 %); optional
slots, all with bands chosen here: Daiquiri modifier 0.1 – 1.5, mixer
0.5 – 6, bitters 0.02 – 0.25, accent 0.001 – 1; Sidecar sugar 0.05 – 0.75,
second modifier 0.25 – 2.67, bitters 0.02 – 0.25, accent, mixer 0.5 – 6;
Martini sugar 0.05 – 0.5; Old-Fashioned modifier 0.02 – 0.5, accent;
Highball sour 0.05 – 0.37, sweet 0.05 – 0.5, modifier 0.1 – 0.75, bitters
0.02 – 0.25; Flip modifier 0.1 – 1, cream 0.5 – 3, accent. Each
`source` names the book and chapter.

**What changed in the data on 2026-11-17** (all lower or structural edges, each tied to
a source above; evidence stays `assumption` for the template as a whole
because the nominal ratios are unread, and the `source.note` of each file
names the sourced edge): Martini modifier slot 0.5 to 0.25, Martini bitter
slot 0.5 to 0.02, a second optional modifier slot in the Martini, Daiquiri
sweet and Sidecar liqueur slots 0.38 to 0.25, Highball mixer 4 to 2. The
usual ranges are unchanged (they describe the nominal spec, not the band).

## IBA specifications read

Read at `https://iba-world.com/iba-cocktail/<slug>/` on 2026-11-17
(#116)[^iba]; amounts as printed, the slug in the first column (add it to
that URL). "Parts" is `2 × slot / base` as in [Ratios](#ratios). The IBA
page of a drink lists no variants, only ingredients, method and garnish.

| Slug                 | Amounts as printed                                                                  | Parts (slots as the templates see them)            |
| -------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------- |
| `dry-martini`        | 60 ml gin, 10 ml dry vermouth                                                       | modifier 0.333                                     |
| `manhattan`          | 50 ml rye whiskey, 20 ml sweet red vermouth, 1 dash Angostura                       | modifier 0.8, bitters 0.037 (dash 0.92 ml)         |
| `negroni`            | 30 ml gin, 30 ml Campari, 30 ml sweet red vermouth                                  | bitter 2, modifier 2                               |
| `boulevardier`       | 45 ml bourbon or rye, 30 ml Campari, 30 ml sweet red vermouth                       | bitter 1.333, modifier 1.333                       |
| `old-fashioned`      | 45 ml bourbon or rye, 1 sugar cube, few dashes Angostura, few dashes plain water    | sugar cube and dashes have no volume on the page   |
| `daiquiri`           | 60 ml white Cuban rum, 20 ml lime juice, 2 bar spoons superfine sugar               | sour 0.667; sweet is dry sugar, not a syrup volume |
| `margarita`          | 50 ml tequila 100 % agave, 20 ml triple sec, 15 ml lime juice                       | modifier 0.8, sour 0.6                             |
| `tommys-margarita`   | 60 ml tequila 100 % agave, 30 ml lime juice, 30 ml agave nectar                     | sour 1, sweet 1                                    |
| `sidecar`            | 50 ml cognac, 20 ml triple sec, 20 ml lemon juice                                   | modifier 0.8, sour 0.8                             |
| `whiskey-sour`       | 45 ml bourbon, 25 ml lemon juice, 20 ml sugar syrup, few drops egg white (optional) | sour 1.111, sweet 0.889                            |
| `white-lady`         | 40 ml gin, 30 ml triple sec, 20 ml lemon juice                                      | modifier 1.5, sour 1                               |
| `between-the-sheets` | 30 ml white rum, 30 ml cognac, 30 ml triple sec, 20 ml lemon juice                  | two bases, modifier 2, sour 1.333                  |
| `cosmopolitan`       | 40 ml vodka citron, 15 ml Cointreau, 15 ml lime juice, 30 ml cranberry juice        | modifier 0.75, sour 0.75, juice 1.5                |
| `john-collins`       | 45 ml gin, 30 ml lemon juice, 15 ml simple syrup, 60 ml soda water                  | sour 1.333, sweet 0.667, lengthener 2.667          |
| `gin-fizz`           | 45 ml gin, 30 ml lemon juice, 10 ml simple syrup, splash soda water                 | sour 1.333, sweet 0.444, lengthener unmeasured     |
| `moscow-mule`        | 45 ml vodka, 120 ml ginger beer, 10 ml lime juice                                   | lengthener 5.333, sour 0.444                       |
| `cuba-libre`         | 50 ml white rum, 120 ml cola, 10 ml lime juice                                      | lengthener 4.8, sour 0.4                           |
| `dark-n-stormy`      | 60 ml Gosling’s rum, 100 ml ginger beer                                             | lengthener 3.333                                   |
| `french-75`          | 30 ml gin, 15 ml lemon juice, 15 ml sugar syrup, 60 ml champagne                    | sour 1, sweet 1, lengthener 4                      |
| `mojito`             | 45 ml white Cuban rum, 20 ml lime juice, 6 mint sprigs, 2 tsp sugar, soda water     | sour 0.889; soda unmeasured                        |
| `spritz`             | 90 ml prosecco, 60 ml Aperol, splash soda water                                     | no base role                                       |
| `americano`          | 30 ml Campari, 30 ml sweet red vermouth, splash soda water                          | no base role                                       |

Not on the IBA list any more (404 on the slug): Screwdriver, Tom Collins
(the John Collins is listed), Jack Rose, Gimlet, Martini (only Dry
Martini), Brandy Flip (a Porto Flip is listed), a Whisky Highball.

**Classics vectors against the IBA.** The vectors in
`vectors/classics/` take their lines from the seed specs (their `source`
says Bar Assistant), not from the IBA, so no citation was replaced. Same
amounts as the IBA: `between-the-sheets`, `boulevardier`, `cosmopolitan`,
`cuba-libre`, `negroni`, `sidecar`, `whiskey-sour`. Different amounts
(seed first, IBA second): `daiquiri` 60 : 22.5 : 22.5 against 60 : 20 : 2
bar spoons sugar; `manhattan` 60 : 30 : 2 dashes against 50 : 20 : 1;
`margarita` 60 : 22.5 : 22.5 against 50 : 20 : 15; `martini` 60 : 30
against the Dry Martini 60 : 10; `moscow-mule` 60 : 22.5 : 120 against
45 : 10 : 120; `old-fashioned` 60 and a bar spoon of syrup against 45 and a
sugar cube; `tommys-margarita` 60 : 30 : 15 against 60 : 30 : 30;
`white-lady` 45 : 30 : 22.5 against 40 : 30 : 20; no IBA page for
`screwdriver`, `gimlet`, `jack-rose`, `brandy-flip`, `whisky-highball`.
The vectors pin the engine's arithmetic for the stated lines, not the IBA
recipe, so they stay; the evidence-bearing vectors are the
`match-*-iba` ones, and their lines agree with the IBA page (the
Screwdriver one cannot be checked, see the table above).

## Books (Google Books search inside, tried 2026-11-17)

_The Fine Art of Mixing Drinks_ (Embury), _Cocktail Codex_ and _The Joy
of Mixology_ (Regan) all have `viewability` `view_no_pages` in the Google
Books feed, and search inside answers a captcha (HTTP 429) to scripted
requests ([development](development.md#network-hosts)). No snippet and
no page number could be read, so Embury's 1 : 2 : 8 with a base of at
least 75 %, the Codex root recipes and Regan's families **stay as they
were**: secondary (Embury via Wikipedia) or unread (Codex, Regan).

## Seed measurement

`node scripts/templates/run.mjs` (source `scripts/templates/unmatched.ts`;
`--examples` adds names and ratios per reason, `--all` lists every group)
matches every non-optional line set of the seed against the root templates
and groups the specs that fit none by the roles of their lines.

| Measured on 635 specs  | Before (bands of 2026-11-17) | After (#70) | Optional slots (2026-11-18) |
| ---------------------- | ---------------------------- | ----------- | --------------------------- |
| Specs with a template  | 107                          | 158         | 315                         |
| Martini                | 57                           | 104         | 112                         |
| Daiquiri               | 24                           | 25          | 127                         |
| Sidecar                | 14                           | 14          | 51                          |
| Old-Fashioned          | 8                            | 8           | 8                           |
| Highball               | 3                            | 6           | 15                          |
| Flip                   | 1                            | 1           | 2                           |
| Specs with no template | 528                          | 477         | 320                         |

(The issue counted 442 of 548 unmatched at the time of its writing; the
seed has 635 specs now.) The Manhattan (classic vector `manhattan`) now
fits the Martini and the Screwdriver (`screwdriver`) the Highball; with
the optional slots the Cosmopolitan (`cosmopolitan`) fits the Sidecar,
as the book files it. The stored `templateId` of the seed specs follows
the engine (a test compares them); 639 drinks in the app include four
that are not in this count.

**Two templates fit.** With the optional slots 37 specs fit both the
Daiquiri and the Sidecar (base, sour, sweet and liqueur: the Daiquiri's
optional modifier against the Sidecar's optional sugar), 32 of them go to
the Daiquiri and 5 to the Sidecar. None needs the id rule: the offset
(distance from the band middles, [Matching](#matching)) decides every
time. Sour and soda: a drink with a full sour part (above 0.37 parts)
and soda fits the Daiquiri through its mixer slot and not the Highball,
whose sour slot ends at 0.37 (`match-daiquiri-collins-not-highball`).

What stays unmatched, by role signature (after the optional slots;
counts of specs) and the reason the nearest template fails (a spec can
have several):

| Group (roles of the lines, method)            | Specs | Nearest, why                                                            |
| --------------------------------------------- | ----- | ----------------------------------------------------------------------- |
| base, bitter, sour, sweet (shake)             | 13    | Daiquiri (3), Martini, Flip: bitter above the 0.25 band of the Daiquiri |
| base, bitter, lengthener, sour, sweet (shake) | 13    | Daiquiri: the same, bitter above 0.25                                   |
| base, bitter, modifier (stir)                 | 11    | Martini: bitter liqueur above 2 parts or a second modifier above 2      |
| base, bitter, modifier, sour (shake)          | 8     | Martini, Sidecar: bitter liqueur with sour                              |
| base, bitter, sweet (stir)                    | 8     | Old-Fashioned: bitter liqueur above the bitter slot                     |
| bitter, lengthener (build), no base line      | 6     | Highball: Aperol Spritz and kin, no base slot filled                    |
| base, lengthener, sour (build)                | 6     | Daiquiri needs a sweet line, Highball's squeeze band ends at 0.37       |

Drinks with **no base line** (the Spritz family: aperitif, wine and soda;
liqueur-only drinks) stay unmatched on purpose: matching measures every
slot against the base slot, which is general code in
[materia](https://github.com/nexumia-de/materia). 73 of the 320 unmatched
specs have no base-role line and miss the base slot of every template
(35 of them also at the nearest Highball). The rest of the gap: Moscow
Mule, Paloma, Bloody Mary and similar drinks without a sweet line fail
the Daiquiri's required sweet slot; sours with a sour part above 1.5
(Mai Tai with a small base, Paloma with grapefruit juice) are above the
band; Mint Julep has 0.75 parts of syrup against the Old-Fashioned's
0.33; Piña Colada has no sour and its cream of coconut has role `sweet`;
Aperol Spritz has no base line. Making the sweet slot of the Daiquiri
optional was tried and measured (319 instead of 315 matched; Moscow Mule,
Paloma and Cosmopolitan fit the Daiquiri) but it also sends Bloody Mary
to the Daiquiri against the book's Highball and drops the meaning of the
sweet slot; it is not in the data and is an owner decision.

## The six roots with optional slots, as the book files them

The three kinds of drink the book files under a template are handled as
optional slots, not as new roots. The proposals of 2026-11-17 for a
Collins root (#114), a Spritz root and a stirred family with two
modifiers are **superseded** by the
[decision](decisions/six-roots-optional-slots.md): the Collins family is
the Daiquiri with its mixer slot, the stirred drinks are the Martini and
Old-Fashioned with their optional slots; only the Spritz (no base line)
stays out, and matching it needs a general rule in materia. The IBA data
points of the Collins family (John Collins 1.333 : 0.667 : 2.667, Moscow
Mule 0.444 and 5.333, Cuba Libre 0.4 and 4.8, French 75 1 : 1 : 4) are
in [IBA specifications read](#iba-specifications-read); the mixer band
0.5 – 6 is chosen here and contains them.

How a line without a volume is measured: `lineMl` gives a counted line
(leaf, sprig, pinch, whole) a volume only when the ingredient has
`unitVolumes`, and the seed has none for mint, so 87 of the 120 accent
lines of the seed are counted without volume. Such a line fills its
slot (role coverage counts), its ratio is `unmeasured` and adds nothing
to the distance (vectors `match-daiquiri-accent-unmeasured`,
`match-sidecar-accent-unmeasured`, `match-old-fashioned-accent-unmeasured`,
`match-flip-accent-unmeasured`). The other 33 accent lines (dashes of
salt solution, brine in ml, a barspoon of horseradish) are measured and
read 0.00 to 0.67 parts of the base, so the accent band is 0.001 – 1. A
second line of the same role (a second sweetener) adds to the first
slot of that role and needs no `sweet-2` slot; a second modifier goes to
the next empty modifier slot where the template has one.

# Ratios

Ratios are in parts against a reference ([data model](data-model.md#template)):
the first slot with role `base` counts as its own `minParts` / `maxParts`
(2, the "2 oz" of the practice), every other slot as
`2 × volume of the slot / volume of the reference slot`. The six
templates:

| Template      | Required slots (role, parts)                  | Optional slots (role, parts)                                                                      | Method | Parent   |
| ------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------ | -------- |
| Old-Fashioned | base 2, sweet 0.08 – 0.33, bitter 0.03 – 0.12 | modifier 0.02 – 0.5, accent 0.001 – 1                                                             | stir   |          |
| Martini       | base 2, modifier 0.25 – 2                     | modifier 0.25 – 2, bitter 0.02 – 2, sweet 0.05 – 0.5                                              | stir   |          |
| Daiquiri      | base 2, sour 0.38 – 1.5, sweet 0.25 – 1.5     | modifier 0.1 – 1.5, lengthener 0.5 – 6, bitter 0.02 – 0.25, accent 0.001 – 1                      | shake  |          |
| Sidecar       | base 2, sour 0.38 – 2, modifier 0.25 – 2.67   | sweet 0.05 – 0.75, modifier 0.25 – 2.67, bitter 0.02 – 0.25, accent 0.001 – 1, lengthener 0.5 – 6 | shake  | daiquiri |
| Highball      | base 2, lengthener 2 – 6                      | sour 0.05 – 0.37, sweet 0.05 – 0.5, modifier 0.1 – 0.75, bitter 0.02 – 0.25                       | build  |          |
| Flip          | base 2, sweet 0.25 – 1, texture 0.75 – 3      | modifier 0.1 – 1, texture (cream) 0.5 – 3, accent 0.001 – 1                                       | shake  |          |

The Sidecar is a sour whose sweet part is a liqueur: its third slot has
role `modifier` and the Daiquiri's has role `sweet`; the Sidecar's nominal
ratio is the book's 1½ : 1 : ¾ oz (2 : 1.33 : 1.0 parts). So a Margarita with
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
carbonated mixer (`lengthener`) with at most a squeeze of sour makes a
Highball, an egg or cream (`texture`) a Flip; without it, spirit and syrup
fit no template. Where optional slots let two templates fit (Daiquiri and
Sidecar; Old-Fashioned and Martini), distance 0 is shared and the offset
decides: the template whose bands are nearer to the middle for the
measured slots wins (`match-daiquiri-modifier-tie-by-offset`,
`match-old-fashioned-modifier-tie-by-offset`).

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
`tree.json`. 66 vectors, expected values worked out by hand from the
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
- Since 2026-11-18, one vector per new optional slot, each matching only
  because of it, with the parts worked out in the description:
  `match-daiquiri-collins-not-highball` (sour and soda go to the
  Daiquiri, the Highball is above its 0.37 squeeze edge),
  `match-daiquiri-bitters`, `-accent-unmeasured`, `-modifier-tie-by-offset`;
  `match-sidecar-book-ratio` (1½ : 1 : ¾), `-root-syrup`, `-second-modifier`,
  `-bitters`, `-accent-unmeasured`, `-mixer` (Cosmopolitan);
  `match-martini-sugar`; `match-old-fashioned-modifier-tie-by-offset`,
  `-accent-unmeasured`; `match-highball-sour`, `-sweet`, `-modifier`,
  `-bitter`; `match-flip-liqueur`, `-cream`, `-accent-unmeasured`; and
  the near miss `near-highball-sour-above-band`. `range-sidecar` follows
  the new nominal. Three candidate expectations changed because the
  optional slots now take a line: `match-daiquiri-classic` (Sidecar
  distance 2 to 1), `match-martini-classic` and `explicit-template-kept`
  (Daiquiri distance 3 to 2, the vermouth fits its modifier slot).
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
