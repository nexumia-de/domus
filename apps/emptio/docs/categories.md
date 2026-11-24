---
type: Reference
title: Starting categories and usual items
description: The 19 categories a household starts with, in English and German, curated by the project; how the food groups of the USDA data map to them; the list of usual items that gives a typed name its category; and the third-party taxonomies that were looked at and not used.
tags: [categories, data, licences, household-goods]
generated: { by: claude-code/2.1.327, at: 2026-11-18 }
sources:
  - id: off-terms
    title: Open Food Facts, data and terms of use (ODbL, DbCL, CC BY-SA for images)
    url: https://world.openfoodfacts.org/terms-of-use
  - id: off-categories
    title: Open Food Facts, taxonomies/food/categories.txt
    url: https://raw.githubusercontent.com/openfoodfacts/openfoodfacts-server/main/taxonomies/food/categories.txt
  - id: usda-groups
    title: USDA National Nutrient Database for Standard Reference, Release 28, FD_GROUP.txt (the 25 food groups)
    url: https://www.ars.usda.gov/ARSUserFiles/80400535/DATA/SR/sr28/dnload/sr28asc.zip
  - id: culina-catalogue
    title: Culina, tools/catalogue/derive.mjs at 7b0ed3e (USDA food categories read by the generator)
    url: ../../culina/tools/catalogue/derive.mjs
---

# Starting categories and usual items

# The categories

`packages/engine/data/categories.json`, in the order a new household
sees them at home. The ids are fixed; the household can rename, hide
and add ([data model](data-model.md#category)). `other` is where
everything without a category goes and cannot be hidden.

| Id          | English               | German                    |
| ----------- | --------------------- | ------------------------- |
| `produce`   | Fruit & vegetables    | Obst & Gemüse             |
| `bakery`    | Bread & bakery        | Brot & Backwaren          |
| `dairy`     | Dairy & eggs          | Milchprodukte & Eier      |
| `meat`      | Meat & sausages       | Fleisch & Wurst           |
| `fish`      | Fish                  | Fisch                     |
| `frozen`    | Frozen                | Tiefkühl                  |
| `pantry`    | Pasta, rice & tins    | Nudeln, Reis & Konserven  |
| `baking`    | Baking                | Backzutaten               |
| `seasoning` | Oil, vinegar & spices | Öl, Essig & Gewürze       |
| `breakfast` | Cereal & spreads      | Müsli & Aufstriche        |
| `snacks`    | Sweets & snacks       | Süßes & Snacks            |
| `drinks`    | Drinks                | Getränke                  |
| `alcohol`   | Wine, beer & spirits  | Wein, Bier & Spirituosen  |
| `baby`      | Baby                  | Baby                      |
| `pets`      | Pets                  | Tierbedarf                |
| `cleaning`  | Cleaning & laundry    | Putzen & Waschen          |
| `household` | Household & paper     | Haushalt & Papier         |
| `care`      | Body care & health    | Körperpflege & Gesundheit |
| `other`     | Other                 | Sonstiges                 |

**Source and licence**: curated by the project on 2026-11-18 from the
usual departments of German supermarkets and drugstores; own work under
the repository's licence. Nothing was taken from another list. The
German names are not yet reviewed by a native speaker; the owner is
asked to read them.

The order is the common pattern of a supermarket (fresh goods first,
[store layouts](store-layouts.md#are-stores-laid-out-alike)) and serves
as the general starting route until a store has its own.

# From the food catalogue to a category

Culina's catalogue is generated from USDA FoodData Central SR Legacy,
whose rows carry a food category. The generator reads it but does not
write it out yet ([architecture](architecture.md#catalogue)). The 25
food groups of the USDA data[^usda-groups] and the category each gives
by default:

| USDA food group                     | Category    |
| ----------------------------------- | ----------- |
| Dairy and Egg Products              | `dairy`     |
| Spices and Herbs                    | `seasoning` |
| Baby Foods                          | `baby`      |
| Fats and Oils                       | `seasoning` |
| Poultry Products                    | `meat`      |
| Soups, Sauces, and Gravies          | `pantry`    |
| Sausages and Luncheon Meats         | `meat`      |
| Breakfast Cereals                   | `breakfast` |
| Fruits and Fruit Juices             | `produce`   |
| Pork Products                       | `meat`      |
| Vegetables and Vegetable Products   | `produce`   |
| Nut and Seed Products               | `baking`    |
| Beef Products                       | `meat`      |
| Beverages                           | `drinks`    |
| Finfish and Shellfish Products      | `fish`      |
| Legumes and Legume Products         | `pantry`    |
| Lamb, Veal, and Game Products       | `meat`      |
| Baked Products                      | `bakery`    |
| Sweets                              | `snacks`    |
| Cereal Grains and Pasta             | `pantry`    |
| Fast Foods                          | `other`     |
| Meals, Entrees, and Side Dishes     | `other`     |
| Snacks                              | `snacks`    |
| American Indian/Alaska Native Foods | `other`     |
| Restaurant Foods                    | `other`     |

The names are those of the SR28 group file; that SR Legacy's category
descriptions are spelled the same was checked only for the ten the
generator names[^culina-catalogue].

A group is too coarse for some foods (fruit juice is a drink, butter is
in "Dairy and Egg Products" but oil in "Fats and Oils", fresh herbs are
produce, flour is in "Cereal Grains and Pasta" but belongs to
`baking`). The catalogue package therefore needs a category per food
with the group as the default and exceptions by hand.

# Usual items

`packages/list/data/usual-items.json` of the shared
[list package](../../../packages/list/docs/rules.md#usual-items) (until
2026-11-24 in Emptio's engine; Culina's hand-over uses it too): per
category the names of what
a household usually buys, in German and English (about 750 names), foods
and household goods alike. A typed name that the household never had
gets its category from this list
([rule 4](../../../packages/list/docs/rules.md#4-category-of-a-new-entry)); it is not offered
as a suggestion. It stands in for the shared food catalogue
([architecture](architecture.md#catalogue)) until that exists, and stays
for household goods, which are in no food catalogue.

**Source and licence**: curated by the project on 2026-11-20 from what
German households usually buy in supermarkets and drugstores; own work
under the repository's licence, stated in the file. Nothing was taken
from another list. The German names are not yet reviewed by a native
speaker.

A name stands under one category only; the engine's tests
(`categories-data.test.ts`, which reads this list and the starting categories) check that,
and that every name of the list is found under its own category by the
rule. What the list does not know stays in Other until the household
gives it a category once.

# Looked at and not used

- **Open Food Facts categories**: German names exist, but the taxonomy
  has thousands of entries, far finer than departments; the data is
  under ODbL with share-alike, and the file itself states no
  licence[^off-terms][^off-categories].
- **Default categories of KitchenOwl and Specifically Clementines**:
  could not be read; and KitchenOwl's would bring AGPL text of another
  project into the data for no gain.
- **GS1 Global Product Classification, Google product taxonomy,
  Wikidata**: not read, see below.
- No openly licensed list of household goods was found; none was
  searched for beyond the above.

# Not read

These hosts were blocked on 2026-11-18 (tested with `curl`):

```
www.gs1.org
support.google.com
```

They hold the terms of the GS1 and Google taxonomies. Neither is
needed while the categories are the project's own.

[^off-terms]: Open Food Facts, https://world.openfoodfacts.org/terms-of-use and https://world.openfoodfacts.org/data

[^off-categories]: Open Food Facts, https://raw.githubusercontent.com/openfoodfacts/openfoodfacts-server/main/taxonomies/food/categories.txt

[^culina-catalogue]: Culina, tools/catalogue/derive.mjs, ../../culina/tools/catalogue/derive.mjs

[^usda-groups]: USDA National Nutrient Database for Standard Reference, Release 28, file FD_GROUP.txt in sr28asc.zip, https://www.ars.usda.gov/ARSUserFiles/80400535/DATA/SR/sr28/dnload/sr28asc.zip
