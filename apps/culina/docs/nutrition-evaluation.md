---
type: Research
title: Evaluation of nutrition values and food tracking
description: Whether nutrition figures and a food diary fit Culina; nutrient databases and their licences read at the source, how per-portion figures derive from a recipe by weight and how precise they are, handing a dish to an existing tracker, the EU rules that apply, and the recommendation.
tags: [research, nutrition, licences, data, trackers, export, eu-law]
generated: { by: claude-code/2.1.326, at: 2026-11-17 }
sources:
  - id: fdc
    title: 'USDA FoodData Central: home page, licensing statement (CC0 1.0, public domain)'
    url: https://fdc.nal.usda.gov/
  - id: fdcapi
    title: 'USDA FoodData Central: API Guide (data.gov key, key responsibility, rate limits, licensing)'
    url: https://fdc.nal.usda.gov/api-guide/
  - id: fdcdl
    title: 'USDA FoodData Central: Download Datasets (formats, zipped and unzipped sizes, release dates)'
    url: https://fdc.nal.usda.gov/download-datasets/
  - id: fdcfiles
    title: 'FoodData Central downloads read for counts: Foundation Foods JSON 2026-10-29 and SR Legacy JSON 2018-04'
    url: https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_foundation_food_json_2026-10-29.zip
  - id: offdata
    title: 'Open Food Facts: Data (conditions for reuse, simplified ODbL summary, exports)'
    url: https://world.openfoodfacts.org/data
  - id: offterms
    title: 'Open Food Facts: Terms of use, contribution and re-use'
    url: https://world.openfoodfacts.org/terms-of-use
  - id: energize
    title: 'Energize (codeberg.org/epinez/Energize, AGPL-3.0): README, Features wiki, bundled assets/food_databases/sfcd.csv and the script that builds it from the BLV downloads'
    url: https://codeberg.org/epinez/Energize
  - id: waistline
    title: 'Waistline (github.com/davidhealey/waistline, GPL-3.0): README and FAQ.md, section on Import Foods'
    url: https://github.com/davidhealey/waistline/blob/master/FAQ.md
  - id: foodyou
    title: 'Food You (github.com/maksimowiczm/FoodYou, GPL-3.0-or-later): README'
    url: https://github.com/maksimowiczm/FoodYou
  - id: fdroid
    title: 'F-Droid repository index (index-v2.json, read 2026-11-17): Waistline 3.11.1, Energize 0.15.0, Food You 3.4.9, OpenFoodFacts 4.23.0, with licences and descriptions'
    url: https://f-droid.org/repo/index-v2.json
  - id: schema
    title: 'schema.org vocabulary source, data/schema.ttl in schemaorg/schemaorg (main, read 2026-11-17): NutritionInformation and Recipe.nutrition'
    url: https://github.com/schemaorg/schemaorg/blob/main/data/schema.ttl
  - id: kenya
    title: 'Raw versus cooked food matching: nutrient intake using the 2015/16 Kenya Integrated Household Budget Survey, J Food Compost Anal 102 (2021), PMC8356072, CC BY-NC-ND 4.0'
    url: https://pubmed.ncbi.nlm.nih.gov/34483479/
  - id: korea
    title: 'Yun et al.: Application of cooked meat codes to improve the validity of nutrient content estimation in a recipe-based food ingredient database, Nutr Res Pract 19(6):1002-1010 (2025), PMID 41377597 (abstract)'
    url: https://pubmed.ncbi.nlm.nih.gov/41377597/
  - id: urban
    title: 'Urban et al.: Accuracy of stated energy contents of restaurant foods, JAMA 306(3) (2011), PMID 21771989 (abstract)'
    url: https://pubmed.ncbi.nlm.nih.gov/21771989/
  - id: retn
    title: 'USDA Table of Nutrient Retention Factors, Release 6 (2007), Google Books catalogue entry; the table itself (ars.usda.gov) was not reachable'
    url: https://books.google.com/books?id=x-upnQAACAAJ
  - id: fic1
    title: 'Regulation (EU) No 1169/2011, Article 1, as adopted (legislation.gov.uk)'
    url: https://www.legislation.gov.uk/eur/2011/1169/article/1/adopted
  - id: fic15
    title: 'Regulation (EU) No 1169/2011, recital 15, as adopted (legislation.gov.uk)'
    url: https://www.legislation.gov.uk/eur/2011/1169/introduction/adopted
  - id: fic31
    title: 'Regulation (EU) No 1169/2011, Article 31 (calculation), as adopted (legislation.gov.uk)'
    url: https://www.legislation.gov.uk/eur/2011/1169/article/31/adopted
  - id: fic33
    title: 'Regulation (EU) No 1169/2011, Article 33 (per portion), legislation.gov.uk'
    url: https://www.legislation.gov.uk/eur/2011/1169/article/33
  - id: fici
    title: 'Regulation (EU) No 1169/2011, Annex I (definitions, salt = sodium × 2.5), as adopted (legislation.gov.uk)'
    url: https://www.legislation.gov.uk/eur/2011/1169/annex/I/adopted
  - id: cfr1019
    title: 'Code of Federal Regulations, Title 21, section 101.9 (nutrition labelling of food), paragraph (c) (rounding of declared amounts), eCFR, read 2026-11-19'
    url: https://www.ecfr.gov/current/title-21/part-101/section-101.9
  - id: ficxiv
    title: 'Regulation (EU) No 1169/2011, Annex XIV (energy conversion factors), as adopted (legislation.gov.uk)'
    url: https://www.legislation.gov.uk/eur/2011/1169/annex/XIV/adopted
  - id: gfl
    title: 'Regulation (EC) No 178/2002, Article 3 (definitions of food business and food business operator), legislation.gov.uk'
    url: https://www.legislation.gov.uk/eur/2002/178/article/3
  - id: claims
    title: 'Regulation (EC) No 1924/2006 (nutrition and health claims), Article 1, as adopted (legislation.gov.uk)'
    url: https://www.legislation.gov.uk/eur/2006/1924/article/1/adopted
---

# Evaluation of nutrition values and food tracking

> Re-creation. A first version was written on 2026-11-17 at the
> owner's request but never committed (issue #32). This one is written
> again from sources read on 2026-11-17; the hosts that stayed blocked
> are in [development](development.md). "Read" below means the page
> itself was read; everything else is marked unverified.

The question: should Culina show nutrition figures for a dish, keep a
food diary, or hand dishes to a tracker, under its rules of own local
data, offline first, no backend and not a recipe manager.

# Nutrient databases and their licences

| Database                                   | Licence                                                                                                 | Read at the source                     | Formats and size                                                                                                                                                                              | Fit for Culina                                                             |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| USDA FoodData Central (FDC)                | Public domain, "published under CC0 1.0"; USDA asks to be named as source and suggests a citation[^fdc] | yes                                    | JSON and CSV per data type. Foundation Foods (10/2026) 681 KB zipped JSON, 9 MB unzipped; SR Legacy (04/2018) 12.3 MB / 205 MB; Branded 187 MB / 3 GB; everything 463 MB / 3.1 GB CSV[^fdcdl] | Yes, as a bundled subset of generic foods                                  |
| Open Food Facts                            | Database ODbL, contents DbCL, images CC BY-SA[^offdata][^offterms]                                      | yes                                    | Nightly CSV (about 0.9 GB gzip, 9 GB unzipped), MongoDB dump, Parquet, API[^offdata]                                                                                                          | No: packaged products by barcode, and share-alike on any adapted database  |
| Bundeslebensmittelschlüssel (BLS, Germany) | _unverified_                                                                                            | no, `www.blsdb.de` and the MRI blocked | –                                                                                                                                                                                             | Not until the licence is read; whether it became free could not be checked |
| CIQUAL (ANSES, France)                     | _unverified_                                                                                            | no, `ciqual.anses.fr` blocked          | –                                                                                                                                                                                             | Not until read                                                             |
| Swiss Food Composition Database (BLV)      | _unverified_                                                                                            | no, BLV hosts blocked                  | Energize bundles a 425 KB CSV built from the BLV's Excel downloads[^energize]                                                                                                                 | Not until read; another FOSS app bundling it is no licence                 |
| EuroFIR                                    | _unverified_                                                                                            | no, `www.eurofir.org` blocked          | –                                                                                                                                                                                             | Not until read                                                             |

## USDA FoodData Central in detail

- **Licence**: "USDA FoodData Central data are in the public domain and
  they are not copyrighted. They are published under CC0 1.0 Universal";
  no permission needed, attribution requested[^fdc].
- **API**: every request needs a data.gov key; "It is the API Key
  holder's responsibility to ensure that their key is not made publicly
  available. Any API keys discovered online … will be deactivated"; the
  limit is 1,000 requests per hour per IP[^fdcapi]. A PWA without a
  backend would have to ship the key in its code, so the API is out;
  only bundled data fits.
- **Content** (counted in the downloads[^fdcfiles]): Foundation Foods
  holds 424 foods with a median of 31 nutrient values each, and per-food
  energy conversion factors (for example hummus: protein 3.47, fat 8.37,
  carbohydrate 4.07 kcal/g). SR Legacy, frozen since 2018, holds 7,793
  foods with a median of 85 values; 1,806 of them are cooked forms
  ("cooked, boiled", "roasted"), which matters for yield (below).
- **Bundle size** (own measurement): all 7,793 SR Legacy foods with
  energy (kcal, kJ), protein, fat, saturated fat, carbohydrate, fibre and
  sodium as compact JSON are 2.1 MB, 0.3 MB gzipped. A curated subset of
  the ingredients cooks use is smaller still.

## Open Food Facts in detail

The simplified ODbL summary on the data page: attribute any public use
("Contains data from Open Food Facts, available under the Open Database
License"); "If you publicly use any adapted version of this database, or
works produced from an adapted database, you must also offer that
adapted database under the ODbL and share your modifications back"; no
DRM without an unrestricted copy. The project also asks for prominent
attribution in the UI and for contributions to be sent back[^offdata].

For Culina this means: a bundled extract would be an adapted database
under ODbL, kept separate from the app's code and from the user's own
data, with attribution in the UI. The data is about packaged products
found by barcode, while a cook's ingredients are mostly generic (flour,
onion, butter), which FDC covers. Online lookups would be network
requests, allowed only when the user starts them. Already noted in
[existing tools](existing-tools.md).

# Per-portion figures from a recipe by weight

## Method

1. Each ingredient's mass times its composition per 100 g gives the
   nutrients of the raw recipe; Culina already works by weight.
2. Cooking changes mass. The yield is cooked mass / raw mass; weighing
   the finished pot gives it directly. Dividing the totals by the cooked
   mass gives values per 100 g of dish, and per portion by the portion's
   mass or the number of portions.
3. Fat and water leave the food in some methods (grilling, roasting,
   draining). There, the raw composition overstates what is eaten: a
   study of grilled meat found yields of about 65 % for pork and 80 % for
   beef, and using raw instead of cooked composition with measured
   yields overstated energy by 10–50 % and fat by 20–60 %[^korea]. Using
   the cooked form of a food (SR Legacy has 1,806) is the remedy.
4. Retention factors correct heat-labile vitamins and some minerals,
   not energy and macronutrients. A survey analysis concluded that
   energy and macronutrient assessment does not require matching foods
   in cooked form, while vitamins and minerals do; it applied yield
   factors to raw quantities and retention factors to raw nutrient
   values, from the Kenyan and USDA tables and EuroFIR[^kenya]. The USDA
   Table of Nutrient Retention Factors, Release 6 (2007)[^retn] is the
   usual reference; its host was blocked, so no factor is quoted here.
5. Energy from macronutrients uses the EU conversion factors (per g:
   carbohydrate 4 kcal, protein 4, fat 9, alcohol 7, organic acid 3,
   fibre 2, polyols 2.4)[^ficxiv]; FDC's food-specific factors differ
   slightly (hummus above). Either choice must be stated.

## Honest precision

- Even professional figures scatter: stated restaurant energy was right
  on average, but 19 % of 269 items held at least 100 kcal per portion
  more than stated[^urban].
- A home cook's figure adds unknown varieties, brands, trimming and
  yield. So Culina shows rounded figures or a range (for example from
  "no fat lost" to "measured yield"), says which ingredients have no
  data, and never calls a dish too fatty or too much: numbers are
  ranges, not verdicts.
- First version: energy, protein, fat, carbohydrate, fibre and salt
  (salt = sodium × 2.5 in EU law[^fici]). No
  vitamins or minerals until retention factors can be read and sourced.

# Handing a dish to an existing tracker

| Tracker                               | Licence and source                  | Can it take a dish from a file?                                                                                                                                                                                                                                                                                                                | Read         |
| ------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Waistline (Android, F-Droid)          | GPL-3.0[^waistline][^fdroid]        | Yes: _Settings → Import/Export → Import Foods_ reads UTF-8 JSON `{ "version": 1, "foodList": [ … ] }`; each item needs `name`, `portion`, `unit` and takes `nutrition` with keys such as `calories`, `proteins`, `fat`, `carbohydrates`, `fiber`, `sodium`[^waistline]                                                                         | yes          |
| Energize (Android, F-Droid, web)      | AGPL-3.0[^energize][^fdroid]        | No import format documented; custom foods are entered in the app; encrypted backups (local, WebDAV)[^energize]                                                                                                                                                                                                                                 | yes          |
| Food You (Android, F-Droid)           | GPL-3.0-or-later[^foodyou][^fdroid] | Builds recipes itself from FDC, Open Food Facts and the Swiss database; no import format in the README[^foodyou]                                                                                                                                                                                                                               | yes          |
| OpenFoodFacts app (Android, F-Droid)  | Apache-2.0[^fdroid]                 | A product scanner and contribution tool, not a diary; no target for a dish[^fdroid]                                                                                                                                                                                                                                                            | yes          |
| Cronometer, MyFitnessPal, Yazio, FDDB | proprietary                         | _unverified_: their help pages were blocked                                                                                                                                                                                                                                                                                                    | no           |
| schema.org `NutritionInformation`     | vocabulary                          | A `Recipe` has `nutrition` with `calories` (Energy), `fatContent`, `saturatedFatContent`, `transFatContent`, `unsaturatedFatContent`, `carbohydrateContent`, `sugarContent`, `fiberContent`, `proteinContent`, `cholesterolContent`, `sodiumContent` (Mass, as "number unit") and `servingSize`[^schema]. Which trackers read it is unverified | yes (source) |

Waistline is the one documented, offline path: Culina can write one
food item per dish and portion into a file the user saves and imports.
schema.org stays out for now, in line with the
[Cooklang record](decisions/cooklang.md) (no schema.org export in the
first version).

# EU rules if figures are shown

- Regulation (EU) 1169/2011 "shall apply to food business operators at
  all stages of the food chain, where their activities concern the
  provision of food information to consumers"[^fic1]. A food business is
  "any undertaking, whether for profit or not … carrying out any of the
  activities related to any stage of production, processing and
  distribution of food"[^gfl]. Recital 15: the rules "should apply only
  to undertakings, the concept of which implies a certain continuity of
  activities and a certain degree of organisation"; occasional serving
  and selling of food by private persons is out of scope[^fic15].
- A cook computing figures for their own food in a private app is not a
  food business providing food information, so the nutrition
  declaration rules and the Commission's tolerance guidance for labels
  (not read; its host was blocked) do not bind Culina's display.
- Calculation is a method the regulation accepts for labels: declared
  values may be averages based on analysis, "a calculation from the
  known or actual average values of the ingredients used" or "a
  calculation from generally established and accepted data"[^fic31];
  per-portion values may be given in addition to per 100 g[^fic33]. A
  user who sells food is a food business operator and needs the label
  rules, which Culina does not cover; the app says so where it shows
  figures.
- Nutrition and health claims (Regulation (EC) 1924/2006) apply to
  claims "made in commercial communications"[^claims]. Culina makes no
  claims ("low fat", "healthy") anyway; it shows numbers.
- This is a reading of the texts, not legal advice. Quotations are from
  the versions as adopted by the EU, except Article 33, read in the UK
  version.

# Recommendation

1. **Per-portion figures as a derived value: yes.** The engine computes
   energy, protein, fat, carbohydrate, fibre and salt from ingredient
   masses, the yield (weighed or estimated) and the number of portions,
   using a bundled subset of USDA FoodData Central (CC0), with the source
   named. Figures are rounded or shown as ranges with their coverage,
   never as a verdict, and are not stored but derived.
2. **No food diary.** Logging meals, goals and weight is what Waistline,
   Energize and Food You do offline and openly; Culina does not rebuild
   them, as it does not rebuild a recipe manager.
3. **Hand dishes to a tracker** through a file the user exports: first
   Waistline's Import Foods JSON, one item per portion.
4. **No backend and no API.** FDC's API needs a private key; Open Food
   Facts lookups would be network requests. Neither is needed for
   generic ingredients.
5. **Only data whose licence was read.** USDA FDC now; Open Food Facts
   only as a separate ODbL extract with attribution if packaged products
   are ever wanted; BLS, CIQUAL, the Swiss database and EuroFIR only
   after their terms are read at the source.

This matches the conclusion of the lost version (per-portion figures
yes, no diary, hand-over to a tracker, no backend). The sources add two
points it did not have: only USDA FoodData Central is cleared for
bundling so far, and figures stay at energy, macronutrients and salt
until retention factors can be sourced.

# What was built

Work package 11 of the [helper plan](helper-plan.md) (issue 94). It follows the
recommendation above: figures are derived, never stored, never a verdict.

- **Data.** The catalogue generator reads from the same USDA SR Legacy file
  energy (kcal and kJ), protein, fat, carbohydrate, fibre and sodium per 100 g
  of every food row (`x-nutrition`, [catalogue](ingredient-catalogue.md#nutrition)).
  No number is typed by hand. Foods with no fibre or sodium figure have none
  (unknown, not zero).
- **Salt** is computed, not stored: sodium x 2.5, the formula of Annex I,
  point 11 of Regulation (EU) No 1169/2011, read in the adopted text[^fici]
  ("`salt` means the salt equivalent content calculated using the formula:
  salt = sodium x 2,5").
- **Engine.** `dishNutrition` sums the lines of a derived dish by weight
  (mass directly, volume by density, count by unit weight) and divides by the
  portions; `roundNutrition` rounds for display
  ([engine rules](engine-rules.md#nutrition)). Amounts are used as the recipe
  gives them (raw, as bought): no yield, edible portion or cooking loss is
  applied, because the dish data does not say which state an amount is in. The
  raw composition overstates grilled or roasted food, as the sources above
  show; the section says so in one line.
- **Coverage.** A line that cannot be turned into grams, has no amount, is
  not in the catalogue yet, is optional or has no nutrient data is left out
  and named, with the count "counted 6 of 9" and, where every line left out
  has a known weight, the share of the weight the figures rest on. Fibre and
  salt are shown only when every counted line has the figure.
- **Rounding** follows 21 CFR 101.9(c)[^cfr1019], the only rounding rule that
  could be read: the European Commission's guidance on tolerances and
  rounding for nutrition declarations was not readable in this session (its
  hosts `food.ec.europa.eu` and `ec.europa.eu` were refused by the proxy,
  `eur-lex.europa.eu` answered an empty body). The US steps are used as a
  display convention and the screen names them; they are not claimed to be
  the EU rule. Where the US rule is silent (kJ, salt) the choice is Culina's
  and is marked as such.
- **Screen.** On the dish of a classic, "Nutrition per portion", closed behind
  a tap: the rounded figures, the coverage in words, the method, the rounding
  rule, the data source and one line that this is not a food label (the EU
  rules above apply to anyone who sells food). No colour, no daily value, no
  judgement.
- **Portion reference per course: none shipped.** The reference must come
  from a source read in this session. The open cook textbooks on
  workforce.libretexts.org (Garde Manger, Flavors of the Saucier, Introduction
  to Food Production and Service) and PubMed Central searches gave recipe
  yields and examples but no statement of portion sizes per course or food
  group; `food.ec.europa.eu`, `www.health.gov`, `www.dge.de` and
  `www.nutrition.org.uk` were refused by the proxy. So figures are per
  portion of the dish as the recipe defines it, with no reference, and the
  section does not compare them with one.
- **Hosts tested on 2026-11-19.** Answered: `fdc.nal.usda.gov` (200),
  `www.legislation.gov.uk` (200), `www.ecfr.gov` (200),
  `workforce.libretexts.org` (200), `eutils.ncbi.nlm.nih.gov` (200),
  `pmc.ncbi.nlm.nih.gov` (200). Refused (403 from the proxy):
  `food.ec.europa.eu`, `ec.europa.eu`, `assets.publishing.service.gov.uk`,
  `www.fao.org`, `www.dge.de`, `www.nutrition.org.uk`, `www.health.gov`;
  `eur-lex.europa.eu` answered 202 with an empty body.

# Figures only where they mean something (2026-11-21)

A tester used the built app in German with the shipped content and found the
herb omelette at "5 kcal / 20 kJ" per portion, fat 0 g, though a portion holds
three eggs and 45 g of butter; under it "2 of 5 ingredients are counted. Not
counted: egg (weight unknown), ... butter (no nutrition data)". Artusi's crema
showed "0 of 4" with "sugar (no nutrition data), milk (weight unknown)", the
Eierkuchen "milk (weight unknown)". A figure of 5 kcal for an omelette misleads;
no figure is better than that one.

## Why each line was not counted

Reproduced on the merged branch with the shipped catalogue (the view as the
screen gets it, every dish for its own number of persons):

| Dish (persons)                | Line                  | Record the line points at                      | What is absent, and why                                                                                                                   |
| ----------------------------- | --------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Omelette aux fines herbes (2) | 6 œufs (count)        | `fdc-group-egg-whole`, a parent of 3 rows      | `unitWeightG`: only the fresh egg has a piece (44 g); the two dried egg powders have none, and the parent rule wants every row to have it |
|                               | 90 g beurre           | `fdc-group-butter`, 5 rows                     | `x-nutrition`: the rows run from 499 to 731 kcal per 100 g (light, whipped, salted, unsalted), so they do not agree within 1.05           |
|                               | persil, no amount     | `fdc-170416`                                   | the amount: Gouffé gives a spoon whose size he states for flour only                                                                      |
|                               | 5 g salt, 3 g pepper  | `fdc-173468`, `fdc-170931`                     | nothing: counted, 1.5 g pepper x 251 kcal per 100 g = 3.8 kcal a portion, shown as 5 kcal                                                 |
| Crema (Artusi, 6)             | 8 yolks (count)       | `fdc-group-egg-yolk`, 2 rows                   | `unitWeightG`: fresh yolk 17 g, dried yolk none                                                                                           |
|                               | 200 g zucchero        | `fdc-group-sugars`, 3 rows                     | `x-nutrition`: granulated 387, powdered 389, maple 354 kcal; largest / smallest 1.099, above 1.05                                         |
|                               | 1 l latte             | `fdc-group-milk`, 33 rows                      | `densityGPerMl`: the rows include dried milk (0.29 to 0.54 g/ml) and fluid milk (1.03 to 1.07)                                            |
|                               | vanilla, no amount    | `fdc-173471`                                   | the amount                                                                                                                                |
| Eierkuchen (4)                | 1 large cupful milk   | `fdc-group-milk`                               | `densityGPerMl`, as above                                                                                                                 |
|                               | 8 eggs (count)        | `fdc-group-egg-whole`                          | `unitWeightG`, as above                                                                                                                   |
|                               | butter, sugar, spices | groups and spice rows, no amount in the source | the amount                                                                                                                                |

The view then showed figures whenever two lines and a quarter of all were
counted (`MIN_COUNTED`, `MIN_SHARE`, a judgement in the app). Lines are not what
matters: salt and pepper are two lines. `MIN_MEASURED_FIGURES` in the engine
(0.8 of the lines with a mass) belongs to the characters, counts lines as well,
and was never applied to the nutrition.

## The rules now

1. **A group line is counted with the group's usual member.** Where a parent's
   rows disagree, `tools/catalogue/usual.json` names the row a recipe that
   names no kind means (a fresh egg, butter without salt, whole milk,
   granulated sugar, white all-purpose flour; 20 parents, each with its
   reason), the generator writes it as `x-group.usual` with the range of energy
   over the rows, and the engine takes the member's density, piece weight and
   figures for a line naming that parent, and for nothing else
   ([catalogue](ingredient-catalogue.md#usual-member),
   [engine rules](engine-rules.md#nutrition)). This is a judgement of the
   project, stated as one on every parent and on the screen ("Where the recipe
   names no kind, the usual one is counted: Egg, whole as Egg, whole, fresh").
   No range is shown: the range over "Egg, whole" runs to egg powder, which no
   omelette is made of.
2. **Figures are shown only when nothing that can carry energy is left out.**
   A line left out keeps every figure back unless it is optional, a seasoning
   (USDA's category "Spices and Herbs"), water (USDA: 0 kcal, FDC 173647) or an
   ingredient of at most 50 kcal per 100 g (judgement). The screen then shows no
   energy at all, names the lines that keep it back and shows the coverage.
   A line without an amount counts like any other: butter "for the pan" and
   sugar "to sprinkle" add energy whatever the source left unsaid.

## Before and after on the 48 shipped dishes

Before: 15 dishes showed figures, among them the omelette (5 kcal), the sauce
hollandaise (0 kcal: only its salt and white pepper counted, not the yolks and
butter), the poulet bourguignonne (100 kcal, without the chicken), the rote
Grütze (140 kcal, without the berries). After: **9 dishes show figures**, all
with every line that carries energy counted: tortilla de patatas (1280 kcal a
portion), haricots verts au beurre (130), mayonnaise (2380: a quart of oil
for the 4 persons the dish data settles on), œufs à la neige (580), omelette aux
fines herbes (520), sauce hollandaise (240), soufflé au parmesan (1440), crema
(310) and latte brûlé (180). The other 39 show what is counted and what keeps
the figures back. What keeps them back most often: a group or food without an
amount in the source (butter in 12 dishes, flour, sugar, potatoes, oil, parmesan),
a line not in the catalogue (beef bones, chocolate, fresh berries, orange-flower
water, fine herbs, kidney suet), and a piece whose weight USDA does not give
(the chicken of the poulet and the pollo, the herring). Each dish is pinned in
`packages/app/test/nutrition-shipped.test.ts`.

**Checked by hand from the USDA figures.** Omelette, a portion: 3 x 44 g egg
(FDC 171287: 143 kcal, 599 kJ, 12.6 g protein, 9.51 g fat, 0.72 g
carbohydrate, 142 mg sodium per 100 g), 45 g butter without salt (FDC 173430:
717 kcal, 3000 kJ, 0.85, 81.1, 0.06, 11 mg), 2.5 g salt (FDC 173468: 38,800 mg
sodium), 1.5 g black pepper (FDC 170931: 251 kcal, 1050 kJ, 10.4, 3.26, 64,
20 mg). Energy 188.76 + 322.65 + 3.77 = 515.2 kcal, shown 520; 2156 kJ, shown
2160; fat 49.1 g, shown 49; protein 17.2 g, shown 17; salt (1162.7 mg sodium x
2.5) 2.91 g. The screen shows the same. Crema, a portion of 6: 22.7 g yolk (FDC
172184, 322 kcal) 73.0 + 33.3 g sugar (FDC 169655, 387 kcal) 129.0 + 171.8 g
milk (1 l x 1.031 g/ml / 6; FDC 172217, 61 kcal) 104.8 = 306.8 kcal, shown 310.

## What the figures still are not

- **Raw figures for a cooked dish.** Every amount is counted as the raw food the
  source names; no yield, no loss of water or fat, no retention factor (none
  could be read, see above).
- **No fat taken up or left behind.** The butter of the omelette is counted
  whole, though some stays in the pan; the oil of a fried dish is counted only
  when the source gives it an amount, and then whole.
- **The sources' vague amounts.** A "large cupful", "a piece of lemon peel",
  "for 4 persons" settled by the project: the figure is as exact as these.
  USDA's "medium" egg is 44 g without shell; a European size M egg is heavier.
- **The usual member is a judgement**, not the cook's product; salted butter
  would raise the salt of the omelette by about 0.7 g a portion (632 mg more sodium per 100 g, FDC 173410 against 173430).
- **Not a nutrition declaration** under Regulation (EU) No 1169/2011, as above.
