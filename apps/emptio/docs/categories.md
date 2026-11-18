---
type: Reference
title: Starting categories and household goods
description: The 19 categories a household starts with, in English and German, curated by the project; how the food groups of the USDA data map to them; usual household goods that are in no food catalogue; and the third-party taxonomies that were looked at and not used.
tags: [categories, data, licences, household-goods]
generated: { by: claude-code/2.1.327, at: 2026-11-18 }
sources:
  - id: off-terms
    title: Open Food Facts, data and terms of use (ODbL, DbCL, CC BY-SA for images)
    url: https://world.openfoodfacts.org/terms-of-use
  - id: off-categories
    title: Open Food Facts, taxonomies/food/categories.txt
    url: https://raw.githubusercontent.com/openfoodfacts/openfoodfacts-server/main/taxonomies/food/categories.txt
  - id: culina-catalogue
    title: Culina, tools/catalogue/derive.mjs at 7b0ed3e (USDA food categories read by the generator)
    url: https://github.com/nexumia-de/culina/blob/main/tools/catalogue/derive.mjs
---

# Starting categories and household goods

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
write it out yet ([architecture](architecture.md#catalogue)). The table
for the categories that generator names[^culina-catalogue]:

| USDA food category                | Category    |
| --------------------------------- | ----------- |
| Vegetables and Vegetable Products | `produce`   |
| Fruits and Fruit Juices           | `produce`   |
| Dairy and Egg Products            | `dairy`     |
| Baked Products                    | `bakery`    |
| Cereal Grains and Pasta           | `pantry`    |
| Legumes and Legume Products       | `pantry`    |
| Nut and Seed Products             | `baking`    |
| Spices and Herbs                  | `seasoning` |
| Fats and Oils                     | `seasoning` |
| Sweets                            | `snacks`    |

A group is too coarse for some foods (fruit juice is a drink, butter is
in "Dairy and Egg Products" but oil in "Fats and Oils", fresh herbs are
produce). The catalogue package therefore needs a category per food
with the group as the default and exceptions by hand. The full list of
USDA groups was not read at its source (the host was blocked) and the
remaining groups are mapped when the generator writes them out.

# Household goods

In no food catalogue. A starting list for the search, curated by the
project like the categories (own work, same licence); it becomes data
of the app with the adding screen (issue 16).

| Category    | Items                                                                                                                                           |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `cleaning`  | Dish soap, dishwasher tabs, laundry detergent, fabric softener, all-purpose cleaner, toilet cleaner, sponges                                    |
| `household` | Toilet paper, kitchen roll, tissues, bin bags, freezer bags, baking paper, aluminium foil, cling film, batteries, light bulbs, candles, matches |
| `care`      | Toothpaste, toothbrushes, shower gel, shampoo, soap, deodorant, razor blades, cotton pads, plasters, sunscreen                                  |
| `baby`      | Nappies, wet wipes                                                                                                                              |
| `pets`      | Cat food, dog food, cat litter                                                                                                                  |

German names follow with the German texts of the app.

# Looked at and not used

- **Open Food Facts categories**: German names exist, but the taxonomy
  has thousands of entries, far finer than departments; the data is
  under ODbL with share-alike, and the file itself states no
  licence[^off-terms][^off-categories].
- **Default categories of KitchenOwl and Specifically Clementines**:
  could not be read; and KitchenOwl's would bring AGPL text of another
  project into the data for no gain.
- **GS1 Global Product Classification, Google product taxonomy, the
  USDA documentation, Wikidata**: not read, see below.
- No openly licensed list of household goods was found; none was
  searched for beyond the above.

# Not read

These hosts were blocked on 2026-11-18 (tested with `curl`):

```
www.gs1.org
support.google.com
www.ars.usda.gov
```

The first two hold the terms of the GS1 and Google taxonomies, the
third the documentation of SR Legacy with the full list of food groups.

[^off-terms]: Open Food Facts, https://world.openfoodfacts.org/terms-of-use and https://world.openfoodfacts.org/data

[^off-categories]: Open Food Facts, https://raw.githubusercontent.com/openfoodfacts/openfoodfacts-server/main/taxonomies/food/categories.txt

[^culina-catalogue]: Culina, tools/catalogue/derive.mjs, https://github.com/nexumia-de/culina/blob/main/tools/catalogue/derive.mjs
