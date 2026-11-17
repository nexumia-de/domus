---
type: Research
title: Non-alcoholic and low-ABV drinks
description: What ethanol does in a drink and what replaces it, ingredient classes with the properties the data model needs, how the six templates carry over, low-ABV bases, shelf life and food safety, the legal terms in the EU, Germany, the UK and the US, and proposed filter thresholds; every number with its source and evidence status.
tags: [research, non-alcoholic, low-abv, shelf-life, legal, ingredients, templates]
generated: { by: claude-code/2.1.326, at: 2026-11-17 }
sources:
  - id: okaru
    title: 'Okaru AO, Lachenmeier DW: Defining No and Low (NoLo) Alcohol Products, Nutrients 14(18):3873 (2022), doi:10.3390/nu14183873, PMC9506306. Full text read through the NCBI E-utilities (efetch, db=pmc).'
  - id: jang
    title: 'Jang SSIK, McIntyre L, Chan M, Brown PN, Finley J, Chen SX: Ethanol Concentration of Kombucha Teas in British Columbia, Canada, J Food Prot 84:1878-1883 (2021), doi:10.4315/JFP-21-130, PMID 34143179. Abstract read.'
  - id: njieukam
    title: 'Njieukam JA et al.: Microbiological, Functional, and Chemico-Physical Characterization of Artisanal Kombucha, Foods 13(12):1947 (2024), doi:10.3390/foods13121947, PMC11202501. Full text searched for pH.'
  - id: tepache
    title: 'Microbial community structure, physicochemical characteristics and predictive functionalities of the Mexican tepache fermented beverage, Microbiol Res (2022), PMID 35525167. Abstract read; authors not recorded.'
  - id: sy
    title: 'Sy H, Chan M, Finley J: Determination of Ethanol Content in Water Kefir Using HS-GC-MS, J AOAC Int 106(2):348-355 (2023), doi:10.1093/jaoacint/qsac125, PMID 36264117. Abstract read; it gives no ethanol values.'
  - id: tsachaki
    title: 'Tsachaki M et al.: Effect of ethanol, temperature, and gas flow rate on volatile release from aqueous solutions under dynamic headspace dilution conditions, J Agric Food Chem 56:5308-5315 (2008), doi:10.1021/jf800225y, PMID 18529063. Abstract read.'
  - id: cfr114
    title: 'US Code of Federal Regulations, 21 CFR 114.3 (acidified foods: definitions of acid, acidified and low-acid foods, water activity). Hosts of the legal text are blocked; the wording was read only in search-result excerpts of the eCFR and GPO text.'
  - id: juice
    title: 'US FDA, juice HACCP (21 CFR 120) and the juice warning label (21 CFR 101.17(g)); read only in search-result excerpts of FDA guidance pages and the Federal Register.'
  - id: ttb-kombucha
    title: 'US TTB, Kombucha information and FAQ pages (https://www.ttb.gov/kombucha); read only in search-result excerpts.'
  - id: ttb-malt
    title: 'US TTB, malt beverage alcohol content labelling and 27 CFR 7.65 (https://www.ttb.gov/regulated-commodities/beverage-alcohol/beer/labeling/malt-beverage-alcohol-content); read only in search-result excerpts.'
  - id: campden
    title: 'Campden BRI: dealcoholisation guidelines (https://www.campdenbri.co.uk/news/dealcoholisation-guidelines.php), quoting UK government guidance; search-result excerpt only.'
  - id: drinkaware
    title: 'Drinkaware: Low alcohol drinks (https://www.drinkaware.co.uk/advice/how-to-reduce-your-drinking/low-alcohol-drinks); search-result excerpt only.'
  - id: uk-consult
    title: 'UK Office for Health Improvement and Disparities: Updating labelling guidance for no and low alcohol alternatives, consultation of 28 September 2023, closed 23 November 2023 (https://www.gov.uk/government/consultations/updating-labelling-guidance-for-no-and-low-alcohol-alternatives); search-result excerpt only.'
  - id: brauerbund
    title: 'German brewers and consumer sources on "alkoholfrei" for beer up to 0.5 % vol (Deutscher Brauer-Bund document hosted by foodwatch, 2012, and press pieces); search-result excerpts only.'
  - id: fic
    title: 'Regulation (EU) No 1169/2011 on food information to consumers, Article 28 and Annex XII (alcoholic strength of beverages above 1.2 % vol); read in search-result excerpts of the legislation.gov.uk copy and through [^okaru].'
  - id: eu-wine
    title: 'Regulation (EU) 2021/2117 amending Regulation (EU) No 1308/2013 (dealcoholised and partially dealcoholised wine) and the Commission Q&A on dealcoholisation; search-result excerpts only.'
  - id: eu-spirits
    title: 'Regulation (EU) 2019/787, definition of a spirit drink (minimum 15 % vol); search-result excerpt of the EUR-Lex and legislation.gov.uk text only.'
  - id: bitters
    title: 'Search-result excerpts of consumer pages (Tasting Table, Cocktail Society, Alcademics) for bitters ABV and dash volume; no manufacturer page was read.'
  - id: extension
    title: 'Ask Extension (US Cooperative Extension Q&A): "Extension does not have any instructions for preserving Simple Syrup other than refrigeration" and a Q&A on cold-process fruit syrups; search-result excerpts only.'
  - id: arnold
    title: 'Dave Arnold: Liquid Intelligence (2014); not at hand, see [balance](balance.md).'
  - id: bainbridge
    title: 'Julia Bainbridge: Good Drinks (2020); not at hand.'
---

# Non-alcoholic and low-ABV drinks

Research for the issues on ingredient classes, templates, seed drinks
(#36) and on shelf life, filters and variants (#37). Parent: #34.

**Read this first.** Most hosts of primary sources are blocked in this
environment ([development](development.md#network-hosts)). What was
actually read, and how, decides every status below:

| Status                   | Meaning                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------ |
| `read`                   | Read in the source itself (here: PubMed abstracts and PMC full text through NCBI E-utilities).   |
| `secondary`              | Seen only as a search-result excerpt or quoted in a read paper; the primary text was not opened. |
| `derived`                | Arithmetic on stated inputs; the inputs carry their own status.                                  |
| `assumption, unverified` | No source seen; kept adjustable as data, never hard-coded.                                       |

Neither _Liquid Intelligence_ nor _Good Drinks_ was at hand, so no claim
of the practice document about them is confirmed. This is information
about published rules, not legal advice. Legal statements were checked
on **2026-11-17**.

# What ethanol does and what replaces it

The practice document names five jobs[^bainbridge]. Result of checking:

| Job of ethanol            | Claim                                                                                                                                                                             | Evidence                                                                                                                                                                                             |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Solvent and aroma release | Ethanol changes how volatile aroma compounds partition and move out of the liquid; in a 12 % ethanol solution, mass transfer of 17 compounds was higher than in water[^tsachaki]. | `read` (abstract, one model system at 12 % ethanol; no statement for cocktails). That ethanol also extracts non-water-soluble flavour from botanicals is common knowledge: `assumption, unverified`. |
| Body, viscosity           | Ethanol-water mixtures are more viscous than either pure liquid at some ratios.                                                                                                   | `assumption, unverified`: searches reached no physical-chemistry source; no value is given.                                                                                                          |
| Bite (heat, "burn")       | Replaced by ginger, chilli, tannin from tea, acid, carbonation.                                                                                                                   | Practice only (practice document); no measurement seen.                                                                                                                                              |
| Preservation              | Ethanol suppresses microbes at higher concentrations.                                                                                                                             | `assumption, unverified` for any concentration. Consequence kept: a drink without ethanol gets no preservation credit; see [shelf life](#shelf-life-and-food-safety).                                |
| Dilution behaviour        | The balance model is `V = V0 (1 + f)` with `f` by method ([balance](balance.md#dilution-model)).                                                                                  | See below.                                                                                                                                                                                           |

**Dilution without ethanol.** The model of [balance](balance.md) already
takes water of dilution as a fraction of the volume before dilution
and its fractions are all `secondary` or `assumption`. Arnold's point
that dilution depends on the drink's components and ABV, and that drinks at
the same final temperature have the same dilution[^arnold], was seen only
as a summary. A drink without ethanol and with sugar freezes at a
different temperature, so the dilution fraction of a shaken
non-alcoholic drink may differ. **No source was found for the size of
that difference.** Proposed: the engine keeps the existing fractions for
drinks without alcohol and marks the result `assumption, unverified`
(reuse of the balance evidence status), until a measurement is read.
That keeps the shown ABV after dilution correct in any case, because
it is computed from the volume.

What replaces each job is practice, not measurement. The classes
below say what each carries; none of the following is a source for the
claim that it "replaces" ethanol.

# Ingredient classes

Properties are those of the [data model](data-model.md#ingredient)
(`role`, `abv`, `sugar`, `acid`, `shelfLifeDays`). A value without a
source is `assumption, unverified` and must stay editable data.

| Class                                | Examples                                             | What it contributes in a drink                                                                  |
| ------------------------------------ | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Non-alcoholic distillate or aperitif | Seedlip, Lyre's, non-alcoholic bitter aperitifs      | depth, a base for a sour or a highball; strengths differ by product and are read from the label |
| Tea and tisane                       | black tea, rooibos, hibiscus, smoked tea             | tannin (bite), aroma, base                                                                      |
| Verjus                               | white or red verjus                                  | acid with some fruit character; milder than citrus                                              |
| Shrub, vinegar                       | fruit and vinegar shrub, drinking vinegar            | acid and sugar in one prepared ingredient                                                       |
| Ferment                              | kombucha, water kefir, tepache                       | acid, carbonation, depth; contains some ethanol                                                 |
| Acid solution                        | citric, malic, tartaric acid in water ("acid blend") | acid without flavour; strength is the maker's choice                                            |
| Saline                               | salt solution in dropper                             | lifts flavour; used in drops                                                                    |
| Bitters, alcohol-based               | Angostura, Peychaud's                                | depth in drops; contains ethanol                                                                |
| Bitters, non-alcoholic               | glycerin- or water-based bitters                     | depth in drops without ethanol                                                                  |
| Sweetener                            | simple syrup, rich syrup, honey, agave               | sugar (balance)                                                                                 |
| Texture agent                        | glycerin, gum syrup, aquafaba                        | body without sugar or with it                                                                   |
| Juice                                | lemon, lime, apple                                   | acid, sugar, fruit                                                                              |

Claims and evidence per class:

- **Ferments contain ethanol.** Kombucha from retail and producers in
  British Columbia: 684 samples, mean 0.77 %, median 0.62 %, range
  not detected to 3.62 % ABV, 31.5 % of samples above the province's 1 %
  limit for non-alcoholic beverages; naturally fermented kombucha is
  stated to contain 0 to 3 % ABV[^jang] (`read`, abstract). Brazilian
  kombucha is classed "low alcohol" below 0.5 % and "alcoholic" from 0.5
  to 8 % [^okaru] (`secondary`: quoted in the paper). Water kefir: the
  ethanol content "may be present at varying levels"[^sy] (`read`; no
  value). Tepache after 72 h of fermentation: 9.5 Brix and acidic pH,
  ethanol and acetic acid among the volatile compounds[^tepache]
  (`read`, abstract; ethanol value not read). So no typical ABV can be
  given for a ferment; the data holds the value the user measured or
  the label states, and an unmeasured ferment has `abv` unknown, not 0.
- **Kombucha pH.** Samples generally between 2.5 and 3.8[^njieukam]
  (`read`, quoted from the paper's discussion of the literature).
- **Alcohol-based bitters.** Angostura 44.7 % and Peychaud's 35 %
  ABV, one dash about 0.92 ml (1/32 oz), other estimates 0.7 to 0.8 ml[^bitters]
  (`secondary`: consumer pages; no manufacturer page read). Ethanol per
  dash `derived`: 0.92 ml × 0.447 = 0.41 ml for Angostura, 0.92 ml ×
  0.35 = 0.32 ml for Peychaud's. Effect on a drink, `derived`: two dashes
  of Angostura (1.84 ml, 0.82 ml ethanol) in a finished drink of about
  120 ml come to about 0.7 % ABV; one dash in 150 ml about 0.3 %. So a
  drink with two dashes of alcohol-based bitters is above 0.5 % by
  calculation. The inputs are `secondary`; the point of the
  calculation is that the app must compute, not assume 0.
- **Non-alcoholic distillates and aperitifs.** Strength is on each
  label. This research found no label or data sheet (hosts blocked) and
  gives no ABV per product: `assumption, unverified`. UK and EU terms
  for a bottle labelled "alcohol-free" are in [the legal section](#legal-terms).
- **Acid.** A reference acid and the content of a juice are in
  [ingredients](ingredients.md) and [balance](balance.md); this research
  did not verify new juice or verjus values (`assumption, unverified`).
  The searches for verjus and citrus acidity returned no usable source.
- **Glycerin, gum syrup, aquafaba.** Searches gave no source for the
  sweetness or viscosity of glycerin and none for the shelf life of
  aquafaba (`assumption, unverified`). Studies on aquafaba's foaming
  exist (for example PMID 41895942, 2026) but their abstracts were not
  read for this document.

# How the six templates carry over

Roles are those of [templates](templates.md#ratios). Without a spirit
the `base` slot is filled by a different class; the slot and ratio
stay, so the match and the range check keep working. Whether the
usual ranges of [templates](templates.md#evidence) (all assumptions)
fit a drink without ethanol is **open**: the ABV range is meaningless
for a non-alcoholic drink, the sugar and acid ranges are
`assumption`.

| Template      | Role that changes                                                                               | Non-alcoholic form (practice, no source)                                         |
| ------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Old-Fashioned | `base`: tea, non-alcoholic distillate; `bitter`: drops, ethanol-free bitters                    | stirred, small sugar part                                                        |
| Martini       | `base`: non-alcoholic distillate; `modifier`: verjus or a tea; `bitter`: non-alcoholic aperitif | the modifier carries acid and the bitter slot is optional                        |
| Daiquiri      | `base`: tea or distillate; `sour`: citrus, verjus, acid solution; `sweet`: syrup                | the sour template carries over unchanged                                         |
| Sidecar       | `modifier`: a non-alcoholic fruit liqueur substitute or a shrub                                 | the same as the Daiquiri with a flavoured third part                             |
| Highball      | `base`: distillate, tea, ferment; `lengthener`: soda, tonic, ginger beer                        | carries over; ferments as lengthener add ethanol, see the table above            |
| Flip          | `base`: tea or distillate; `texture`: aquafaba instead of egg                                   | the texture slot is why aquafaba is listed; shelf life of aquafaba is unverified |

# Low-ABV drinks

A low-ABV drink uses a fortified wine, aromatised wine or amaro as the
base or as the large part, so ethanol is present and the drink is
shown with its computed ABV.

| Base                          | ABV                                                                                                                   | Evidence                                                                                                                     |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Spirit drink (legal)          | at least 15 % vol, with exceptions (category 39, such as egg liqueur at 14 %)                                         | `secondary`: Regulation (EU) 2019/787, search excerpt[^eu-spirits]. So a "spirit drink" is not a low-ABV base by definition. |
| Vermouth, sherry, port, amaro | not verified: the EU limits for aromatised wine (Regulation (EU) No 251/2014), for sherry and for port were not found | `assumption, unverified`. Each product's label ABV is data on the ingredient, not a class value.                             |

Shelf life of an opened fortified or aromatised wine: no source found;
`assumption, unverified`.

# Shelf life and food safety

**This document gives no shelf life as a fact.** Food-safety authorities
define limits by pH, water activity and process, not by a number of
days for a bartender's syrup.

Food-safety guidance found (`secondary`, text of 21 CFR 114.3 via
search excerpts)[^cfr114]:

- acid foods: natural pH 4.6 or below;
- low-acid foods (other than alcoholic beverages): finished equilibrium
  pH above 4.6 and water activity above 0.85;
- acidified foods: low-acid foods to which acid or acid food is added,
  finished equilibrium pH 4.6 or below, water activity above 0.85.

These are definitions for canned and bottled foods, not storage
instructions for a drink at home. The figures say only where the
regulation draws the line. The pH and water activity of a given syrup,
shrub or cordial were not measured and not found.

Fresh juice: in the US a juice that has not been processed to a 5-log
reduction of the pertinent pathogen must carry a warning label;
retailers selling directly to consumers are exempt from HACCP but not
from the labelling rule[^juice] (`secondary`). No number of days was found
from any authority.

"Commonly stated" values, from consumer and recipe pages in search
results, are not food-safety guidance and disagree widely: plain 1:1
syrup from about two weeks to six months refrigerated, infused syrup one
to two weeks, cordial about one month, rich syrup longer than 1:1[^extension]
(`secondary`, low quality). The Cooperative Extension Q&A found says
that it has no instructions for preserving simple syrup other than
refrigeration, and that freezing keeps fresh-fruit flavour better than
refrigeration in cold-process fruit syrups[^extension] (`secondary`).

| Prepared ingredient            | Safety evidence found                                                                                                                | `shelfLifeDays` for the data |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- |
| Syrup 1:1, rich syrup          | none from an authority; pH and water activity not found                                                                              | `null` (unknown)             |
| Shrub, cordial                 | none; no pH of any recipe found                                                                                                      | `null`                       |
| Tea, tisane                    | none                                                                                                                                 | `null`                       |
| Fresh juice                    | labelling rule for unprocessed juice (US); no days                                                                                   | `null`                       |
| Verjus after opening           | none                                                                                                                                 | `null`                       |
| Kombucha, water kefir, tepache | ethanol can rise during storage: TTB states that a kombucha under 0.5 % at bottling can keep fermenting[^ttb-kombucha] (`secondary`) | `null`                       |
| Aquafaba                       | none                                                                                                                                 | `null`                       |

The app may let the user enter a date made and a own "use within" value
and show them as the user's own entries, not as safety advice.

# Legal terms

Information only. Texts of the regulations could not be opened (hosts
in [development](development.md#network-hosts)); every statement below
is `secondary` unless marked otherwise.

| Jurisdiction | "Alcohol-free" / "non-alcoholic"                                                                                                                                                                                    | "De-alcoholised"                                                                                                                          | "Low alcohol"                                           | Basis and status                                                                                                                                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| EU           | No harmonised EU definition below 1.2 % vol. Beverages above 1.2 % vol are "alcoholic" for labelling of strength. Most countries use below 0.5 % vol for "no alcohol"[^okaru].                                      | Wine: the label terms "de-alcoholised" and "partially de-alcoholised" with the 0.5 % vol line, since Regulation (EU) 2021/2117[^eu-wine]. | Not defined; the cited review proposes 0.5 to 1.2 % vol | `secondary`: [^fic][^okaru][^eu-wine]. The wording "less than 0.5 %" for the whole category was not found in an excerpt of the wine text; the search result itself noted conflicting wording.                            |
| Germany      | "alkoholfrei" for beer allowed up to 0.5 % vol since 1972[^brauerbund]; for wine under 0.5 % vol[^brauerbund]; below 0.5 % in the review[^okaru]. "0,0 %" described by consumer sources as below 0.05 % vol.        | not found                                                                                                                                 | not found                                               | `secondary`; no German legal text read (Diätverordnung and Weinverordnung paragraphs not verified).                                                                                                                      |
| UK           | Guidance: "alcohol-free" up to 0.05 % abv, alcohol removed; "non-alcoholic" only for sacramental wine[^campden]; stated to be 0.05 % in the review[^okaru].                                                         | up to 0.5 % abv, alcohol removed[^campden]                                                                                                | up to 1.2 % abv[^campden]                               | `secondary`. Described as voluntary guidance, not law[^drinkaware]. A consultation (28 Sep 2023 to 23 Nov 2023) proposed changing the "alcohol-free" descriptor[^uk-consult]; **the outcome was not found: unverified.** |
| US           | Malt beverages: "non-alcoholic" only with the adjacent statement "contains less than 0.5 percent (or .5%) alcohol by volume"; "alcohol free" only if no alcohol[^ttb-malt]. Review: no more than 0.5 % vol[^okaru]. | not found                                                                                                                                 | not found                                               | `secondary`. 27 CFR 7.65 applies to malt beverages; wine and spirits not checked. Kombucha at or above 0.5 % at any time is regulated by TTB[^ttb-kombucha].                                                             |

Other countries in the review (`secondary`): Spain 1 % vol and France
1.2 % vol for alcohol-free beer, Japan 1 %, China 0.5 %[^okaru].

**What the app may claim.** The app computes ABV from ingredient data
that the user or the seed data entered; it measures nothing. It
therefore does not state that a drink is "alcohol-free", "non-alcoholic"
or "de-alcoholised" in the legal sense, and does not say a drink is safe
to drink. It shows the computed ABV, says it is calculated, and says
which inputs are unknown. This is a proposal for the owner
(`needs decision`).

# Terms and thresholds for the filters

The computed ABV after dilution (balance) is the value filtered. A
drink with any unknown ABV (for example an unmeasured ferment) is in
neither filter, and is shown as "unknown".

| Filter          | Proposed threshold                                                                                                                                                                                                                                                                                   | Legal basis                                                                                                                                                                                                                                               | Status           |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| Without alcohol | computed ABV below 0.5 %, and the strict "no ethanol" option 0                                                                                                                                                                                                                                       | 0.5 % is the line for "no alcohol" in most European countries, Germany, the US labelling line and the UK "de-alcoholised" line[^okaru][^campden][^ttb-malt]; the UK "alcohol-free" line is 0.05 %[^campden], so the filter does not claim "alcohol-free". | `needs decision` |
| Low ABV         | computed ABV up to 1.2 % is the legal "low alcohol" line (UK, EU review)[^campden][^okaru], but few cocktails fall there; a bar sense of "low ABV" (a sherry or vermouth drink, roughly 5 to 12 %) is **not defined by any source read**. Proposed: filter "Low ABV" up to 10 %, adjustable setting. | 1.2 %: `secondary` as above. 10 %: `assumption, unverified`.                                                                                                                                                                                              | `needs decision` |

`docs/decisions/low-abv-threshold.md` is written once the owner decides.

# Ingredient class table for the data model

Values are those the data issue may use. `null` means: no source seen,
leave the field empty so that the engine reports it as unknown.

| Class                          | `role`               | `abv`                                           | `sugar`       | `acid`                                                        | `shelfLifeDays` | Evidence status                                 |
| ------------------------------ | -------------------- | ----------------------------------------------- | ------------- | ------------------------------------------------------------- | --------------- | ----------------------------------------------- |
| Non-alcoholic distillate       | `base`               | per product from the label                      | `null`        | `null`                                                        | `null`          | structure `assumption`; no label read           |
| Non-alcoholic aperitif         | `bitter`             | per product from the label                      | `null`        | `null`                                                        | `null`          | `assumption`                                    |
| Tea, tisane                    | `base`, `lengthener` | 0 (unfermented)                                 | 0 unsweetened | `null`                                                        | `null`          | `assumption, unverified`                        |
| Verjus                         | `sour`               | 0                                               | `null`        | `null`                                                        | `null`          | `assumption, unverified`                        |
| Shrub, drinking vinegar        | `sour`, `sweet`      | 0                                               | `null`        | `null`                                                        | `null`          | `assumption, unverified`                        |
| Kombucha, water kefir, tepache | `lengthener`, `base` | `null` (0 to 3.62 observed for kombucha[^jang]) | `null`        | pH 2.5 to 3.8 for kombucha[^njieukam], not an acid percentage | `null`          | kombucha `read`; kefir, tepache `null`          |
| Acid solution                  | `sour`               | 0                                               | 0             | maker's choice                                                | `null`          | `assumption`                                    |
| Saline                         | none (drops)         | 0                                               | 0             | 0                                                             | `null`          | `assumption`                                    |
| Bitters, alcohol-based         | `bitter`             | 44.7 Angostura, 35 Peychaud's[^bitters]         | 0 not read    | `null`                                                        | `null`          | `secondary`; per-dash ethanol `derived`         |
| Bitters, non-alcoholic         | `bitter`             | per product from the label                      | `null`        | `null`                                                        | `null`          | `assumption`                                    |
| Syrup, rich syrup              | `sweet`              | 0                                               | `null`        | 0                                                             | `null`          | `assumption`                                    |
| Glycerin, gum syrup            | `texture`            | 0                                               | `null`        | 0                                                             | `null`          | `assumption, unverified`                        |
| Aquafaba                       | `texture`            | 0                                               | `null`        | `null`                                                        | `null`          | `assumption, unverified`                        |
| Juice                          | `sour`               | 0                                               | `null`        | `null`                                                        | `null`          | `assumption`; see [ingredients](ingredients.md) |

The sugar column holds no new value because none was read; existing
values for juices and syrups are in [ingredients](ingredients.md) and
[seed data](seed-data.md).

# Proposed templates and variants

Justified by the claims above, not by a source that says they work:

1. **Non-alcoholic sour** (variant of Daiquiri): `base` tea or
   non-alcoholic distillate, `sour` citrus, verjus or acid solution,
   `sweet` syrup. Shake.
2. **Non-alcoholic highball** (variant of Highball): `base` distillate or
   tea, `lengthener` soda, tonic or a ferment. Ferment as lengthener
   raises ABV: kombucha 0 to 3.62 % observed[^jang].
3. **Spritz** (variant of Highball with a `bitter` slot): bitter
   aperitif plus a lengthener; the existing templates have no `bitter`
   slot in the highball, so a new optional slot is needed.
4. **Shrub drink**: `sour` and `sweet` from one prepared shrub plus a
   `lengthener`.
5. **Foamed drink** (variant of Flip): aquafaba in the `texture` slot.
6. **Low-ABV stirred drink** (variant of Martini): `base` fortified or
   aromatised wine at its label ABV, optional `bitter`; computed ABV
   shown.

Whether these are variants of existing templates or new templates is
for the owner.

# Open questions for the owner

1. Thresholds of the two filters, above (`needs decision`).
2. Whether the app states any legal term at all or only the computed ABV.
3. Whether a ferment of unknown ABV counts as "unknown" (proposed) or
   is excluded from "Without alcohol".
4. Who reads _Liquid Intelligence_, _Cocktail Codex_ and _Good Drinks_ for the
   points marked `assumption, unverified` (dilution without ethanol,
   ethanol and viscosity, glycerin and gum syrup, aquafaba).
5. Whether to allow the blocked hosts listed in
   [development](development.md#network-hosts) so that the legal texts
   and the food-safety pages can be read.

# Not done

- No primary legal text was opened (EUR-Lex, gesetze-im-internet.de,
  legislation.gov.uk, eCFR, TTB and FDA pages were blocked).
- No measurement of pH, sugar or water activity of a cocktail
  ingredient was found.
- The UK government's decision after its 2023 consultation was not found.

[^okaru]: Okaru and Lachenmeier 2022 (sources above).

[^jang]: Jang et al. 2021.

[^njieukam]: Njieukam et al. 2024.

[^tepache]: Tepache study 2022.

[^sy]: Sy, Chan, Finley 2023.

[^tsachaki]: Tsachaki et al. 2008.

[^cfr114]: 21 CFR 114.3.

[^juice]: FDA juice HACCP and labelling.

[^ttb-kombucha]: TTB kombucha pages.

[^ttb-malt]: TTB malt beverage labelling.

[^campden]: Campden BRI.

[^drinkaware]: Drinkaware.

[^uk-consult]: UK consultation 2023.

[^brauerbund]: German brewers and press.

[^fic]: Regulation (EU) No 1169/2011.

[^eu-wine]: Regulation (EU) 2021/2117.

[^eu-spirits]: Regulation (EU) 2019/787.

[^bitters]: Consumer pages on bitters.

[^extension]: Ask Extension.

[^arnold]: Arnold 2014.

[^bainbridge]: Bainbridge 2020.
