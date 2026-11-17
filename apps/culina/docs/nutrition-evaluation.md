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
