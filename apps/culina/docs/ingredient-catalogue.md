---
type: Specification
title: Ingredient catalogue
description: The catalogue of basic ingredients shipped with the app, generated from USDA FoodData Central SR Legacy; why that dataset, the selection rule, how density and unit weight are derived, the file, and what the catalogue does not have.
tags: [catalogue, ingredients, data, usda, licences, generator]
generated: { by: claude-code/2.1.326, at: 2026-11-18 }
sources:
  - id: fdc
    title: 'USDA FoodData Central: home page, Licensing (public domain, CC0 1.0 Universal)'
    url: https://fdc.nal.usda.gov/
  - id: fdcdl
    title: 'USDA FoodData Central: Download Datasets (release list)'
    url: https://fdc.nal.usda.gov/download-datasets/
  - id: srzip
    title: 'SR Legacy JSON, April 2018 (FoodData_Central_sr_legacy_food_json_2018-04.zip)'
    url: https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_json_2018-04.zip
  - id: fdczip
    title: 'Foundation Foods JSON, October 2026 (FoodData_Central_foundation_food_json_2026-10-29.zip), inspected, not used'
    url: https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_foundation_food_json_2026-10-29.zip
---

# Ingredient catalogue

A fresh notebook has no ingredients. The app ships a catalogue of basic
ingredients with what the engine needs to convert amounts: the density
(grams per millilitre) and the weight of one piece. It is **generated** by
`tools/catalogue/build.mjs` from a public-domain dataset and is rebuilt,
never edited by hand. The app offers it in the ingredient picker
([behaviour](behaviour.md#ingredient-picker)); the file's shape and how an
entry becomes a record are in [data model](data-model.md#ingredient-catalogue-file).

## Source and licence

USDA FoodData Central, **SR Legacy**, April 2018 release
(`FoodData_Central_sr_legacy_food_json_2018-04.zip`, from
`https://fdc.nal.usda.gov/fdc-datasets/`)[^srzip]. The licence statement,
read on the site's home page on 2026-11-18 (section Licensing): "USDA
FoodData Central data are in the public domain and they are not
copyrighted. They are published under CC0 1.0 Universal (CC0 1.0). No
permission is needed for their use, but we request that users list
FoodData Central as the source of the data"[^fdc]. The file names the
source in its envelope and in every number's `source`;
[dependencies](dependencies.md#data) lists it too.

**Why SR Legacy and not Foundation Foods.** Both were opened on
2026-11-18. Foundation Foods (October 2026) is the maintained dataset but
small: 424 foods, 291 with any portion, 36 with a cup, tablespoon or
teaspoon portion. SR Legacy (frozen in 2018, 7,793 foods) carries portions
for 7,533 foods, 2,850 of them with a volume portion, and states them as
text such as `1 cup`, `1 tbsp`, `1 medium (3" dia)`. Its figures are old
but are weights of foods, which do not move. Using one dataset keeps the
rules, the ids and the licence statement single; Foundation Foods can be
added later by a pull request that extends the generator.

## Selection rule

A food becomes a candidate when all of these hold:

1. Its food category is one of Baked Products, Cereal Grains and Pasta,
   Dairy and Egg Products, Fats and Oils, Fruits and Fruit Juices,
   Legumes and Legume Products, Nut and Seed Products, Spices and Herbs,
   Sweets, Vegetables and Vegetable Products.
2. In Baked Products only descriptions starting with "Leavening agents"
   (baking powder, soda, yeast), in Sweets only those starting with Cocoa,
   Honey, Molasses, Sugars or Syrups.
3. In Fruits, Legumes and Vegetables the description names the state
   `raw`.
4. The description (without its parentheses) has no word of the exclusion
   list in `tools/catalogue/derive.mjs` (cooked, canned, frozen, baked,
   roasted, prepared, babyfood, restaurant, sauce, dressing, and so on)
   and no brand (a word of three or more capital letters).

A candidate becomes a row only if a density or a unit weight can be
derived; a food with neither is no use to the engine and is left out.

## Derivation rules

- **Density.** From portions whose modifier is exactly `cup`, `tbsp`,
  `tablespoon`, `tsp` or `teaspoon` (any amount): grams / (amount x ml of
  the unit). The millilitres are read from `packages/engine/data/units.json`
  (US customary, exact), never typed again. Bulk forms such as `cup,
chopped`, `cup, sliced` or `cup (8 fl oz)` are not densities and are
  skipped. If several volume portions exist they must agree within a ratio
  of 1.1, otherwise the density is left out; the value comes from the cup,
  else tablespoon, else teaspoon, rounded to three decimals. A result
  outside 0.05 to 2.5 g/ml is treated as a data error and left out.
- **Unit weight.** From a portion of amount 1: the one whose modifier is
  `medium` (also `medium (3" dia)`); else the only `small`, `medium` or
  `large` portion; else the only portion whose modifier is one piece word
  (clove, each, item, piece, fruit, head, leaf, pepper, pod, root, spear,
  stalk), with or without a size in parentheses. If two portions qualify
  (two sizes of fruit, two mediums) there is no unit weight rather than a
  guess. Portions like `3 cloves` or `slice` are not used.
- **Name.** The FDC description without parentheses and without the word
  `raw`. If two rows would share a name, both use the full description,
  then add the FDC id. The full description is kept in `x-fdc`.
- **Nothing else is filled in.** Roles, yields, shelf life, season and
  allergens are absent because the source does not carry them.
- **Order and bytes.** Rows sorted by id; no clock; the same dataset
  gives the same file. The envelope holds the SHA-256 of the dataset file
  read.

Every number's `source` names the dataset and release, the FDC id and the
exact portion text, for example `USDA FoodData Central, SR Legacy,
release 2018-04, FDC ID 169230, portion: 1 clove = 3 g`. A density also
names the unit's millilitres.

## What the catalogue does not have

- No meat, fish, poultry, baked goods, beverages, soups, sauces, canned,
  frozen, cooked or prepared foods, and no brand products.
- No yields, shelf life, roles, seasons, allergens or nutrition figures.
- No density for foods whose only volume portion is a bulk form (chopped,
  sliced, shredded), no unit weight where the source gives several sizes
  or no single piece; many ingredients appear with a density but no unit
  weight and the other way round.
- Weights are those of the food as SR Legacy describes it (mostly the
  edible portion); a medium apple is 182 g without its core, not as
  bought. Leafy greens and herbs have low densities because the source's
  cup is loosely packed.
- English names only; US customary portions only; the data is from 2018.
- Several rows are variants of the same food (milks with different added
  vitamins, margarines, oils); the source's variants are kept.

## Regenerating and testing

How to download and regenerate: [development](development.md#ingredient-catalogue).
`packages/app/test/catalogue-file.test.ts` validates the shipped file
against the schemas, checks ids and sources, recomputes rows from fixture
excerpts of a few foods (`packages/app/test/fixtures/catalogue/`) and tests
the rules on synthetic portions. The catalogue schema and its examples
are in `packages/engine/schemas/`.

[^fdc]: USDA FoodData Central, home page, section Licensing, read 2026-11-18.

[^srzip]: USDA FoodData Central, Download Datasets, SR Legacy row "April 2018 (JSON)", read 2026-11-18.
