---
type: Reference
title: Seed data
description: Format, measured counts, licence and field-by-field mapping of Bar Assistant's public dataset to Mixtura's ingredient, spec and template; what is missing and how it is filled; problems found; attribution text.
tags: [seed-data, bar-assistant, licence, mapping, attribution]
generated: { by: claude-code/2.1.326, at: 2026-11-17 }
sources:
  - id: badata
    title: 'Bar Assistant public data, commit 5a504d474614494119882eb91a8ffdc5491a483f (2026-09-13)'
    url: https://github.com/bar-assistant/data
---

# Seed data

Studied by cloning the repository into an empty directory outside this
repository and reading it with `jq` and Python only; nothing from it was
run and none of it is committed here. Commit studied:
`5a504d474614494119882eb91a8ffdc5491a483f` (2026-09-13, the only commit
of the shallow clone). Every number below was counted from the files.
The converter is a later issue; this document is its specification.

## Network access

`git clone --depth 1 https://github.com/bar-assistant/data` worked.
Other probes from the session proxy on 2026-11-17:

| URL                                                                  | Result |
| -------------------------------------------------------------------- | ------ |
| `https://github.com/bar-assistant/data` (curl)                       | 403    |
| `https://api.github.com/repos/bar-assistant/data`                    | 403    |
| `https://raw.githubusercontent.com/bar-assistant/data/<sha>/LICENSE` | 200    |

The 403 body says GitHub access to the repository is not enabled for the
session; the git protocol was allowed. Hosts needed to fetch the data:

```
github.com
raw.githubusercontent.com
```

`api.github.com` was not needed.

## Licence

`LICENSE` at the repository root, read from the file:

> MIT License
>
> Copyright (c) 2026 Bar Assistant
>
> Permission is hereby granted, free of charge, to any person obtaining a
> copy of this software and associated documentation files (the
> "Software"), to deal in the Software without restriction, including
> without limitation the rights to use, copy, modify, merge, publish,
> distribute, sublicense, and/or sell copies of the Software, [...] The
> above copyright notice and this permission notice shall be included in
> all copies or substantial portions of the Software. [...]

(The full standard MIT text, 21 lines; the elided parts are the usual
grant and the warranty disclaimer.) Holder: "Bar Assistant". Obligation:
keep the copyright and permission notice with all copies or substantial
portions. The README adds that every image carries copyright information
(699 images in the recipes, 262 distinct credit strings); **images are not
used by Mixtura**, so their credits do not apply. The README and the
licence say nothing about the recipe texts' own origin; 639 of 663 recipes
carry a source URL and 15 none. The MIT licence covers the repository as
published; it cannot give rights Bar Assistant did not have. Open
question for the owner: whether to ship the long ingredient descriptions
and recipe instructions at all (Mixtura needs neither for its rules), see
the proposals below.

## Format

```
data/
  base_glasses.json  base_methods.json  base_utensils.json
  base_ingredient_categories.json  base_taste_descriptors.json
  base_price_categories.json  calculators.json  starter-media-release.json
  cocktails/<slug>/data.json (+ images)      663 folders
  ingredients/<slug>/data.json (+ image)     296 folders
schema.json                                  JSON Schema, draft-07, recipes
cleanup.sh                                   normalisation script (not run)
```

Each `data.json` is one record; the folder name equals `_id` (a slug).
`schema.json` describes a recipe and lists fewer fields than the files
contain; the field lists below are from the files.

| Kind             | Records | Fields in every record                                                                                                                                                      |
| ---------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cocktail         | 663     | `_id name instructions created_at updated_at description source garnish abv tags glass method utensils parent_cocktail_id year author images ingredients`                   |
| Cocktail line    | 2,984   | `_id name sort amount units optional is_specified amount_max note substitutes`                                                                                              |
| Ingredient       | 296     | `_id _parent_id name strength description origin color category created_at updated_at images ingredient_parts prices calculator_id sugar_g_per_ml acidity distillery units` |
| Glass            | 16      | `name description volume volume_units` (volume set on 1)                                                                                                                    |
| Method           | 6       | `name dilution_percentage`: Shake 25, Stir 20, Build 10, Blend 25, Muddle 10, Layer 0                                                                                       |
| Other base files |         | 20 utensils, 51 taste descriptors, 13 ingredient categories, 0 price categories, 7 calculators                                                                              |

Measured fill of optional fields (of 663 recipes): `abv` 661, `method`
660, `glass` 629, `garnish` 530, `source` 648, `description` 635, at
least one tag 530 (54 distinct tags, 1 to 7 per recipe), `parent_cocktail_id`
51, `year` 34, `author` 22, `utensils` 3. Of 2,984 lines: 31 optional,
46 with `amount_max`, 310 with a `note`, 55 with substitutes (59
substitute entries on 51 recipes); `is_specified` is false everywhere.
Of 296 ingredients: `strength` 296 (144 are 0), `sugar_g_per_ml` 296
(241 above 0), `acidity` 1, `category` 257, `units` 208, `origin` 194,
`color` 253, `ingredient_parts` 13, `calculator_id` 2, `prices` 0.

Hierarchy: `_parent_id` forms a forest of 39 roots, depth up to 4
(153 / 70 / 33 / 1 nodes at depth 1 to 4), 39 inner nodes and 257 leaves,
no dangling parent. Recipes use 262 distinct ingredients (240 leaves, 22
inner nodes such as `gin` or `sweet-vermouth`; 686 of 2,984 lines name an
inner node). 33 ingredients are never used by a recipe.

Methods used by recipes: Shake 339, Stir 192, Build 92, Blend 19,
Muddle 15, Layer 3, none 3. Glasses: 16 distinct names plus none (Lowball 203,
Highball 131, Coupe 118, Cocktail 53, Nick and Nora 43, none 34, ...).

## Units in the data

48 distinct `units` strings on 2,984 lines: `ml` 1,816, `oz` 623, `dash`
184 and `dashes` 40, `barspoon` 78, `topup` 55, `whole` 33, `leaves` 23,
`drops` 22, `slice` 18, `sprigs` 11, `part` 8, then 30 more used
once to seven times (`teaspoon`, `tsp`, `pinch`, `wedge`, `cube`, `cup`,
`tablespoon`, `splash`, `g`, `shot`, `float`, `rinse`, `strong`,
`hand-whipped`, `1`, ...). Singular and plural both occur, and `tsp` next
to `teaspoon`. Amounts are always numbers (2,079 integers, 905 decimals);
there is no free-text amount, but non-quantities are encoded as units
(`topup`, `float`, `rinse`, `strong`, `hand-whipped`, `1`) and `part` is a
ratio, not a volume (9 lines in 9 recipes with `part`/`parts`). 307 of
663 recipes have only `ml` and `oz` lines (ignoring optional lines); 143
use `oz` and no `ml`, 21 mix both; 65 contain a top-up or part line and 90
a counted unit (whole, slice, leaves, sprig, wedge, ...). The unit ids
Mixtura needs are decided in [units](units.md); the converter maps these
strings onto them and lists every unmapped string in its report.

## Mapping

### Ingredient

| Bar Assistant                                                                                              | Mixtura                   | Rule                                                                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `_id`                                                                                                      | `id`                      | Kept as the slug.                                                                                                                                                                                        |
| `name`                                                                                                     | `name`                    | Kept.                                                                                                                                                                                                    |
| `_parent_id`                                                                                               | `parentId`                | Kept.                                                                                                                                                                                                    |
| depth and children                                                                                         | `level`                   | Derived: root with children `category`, other inner node `type`, leaf `product`. Roots without children (24) are products.                                                                               |
| `strength`                                                                                                 | `abv`                     | Percent as is (same unit). 0 is kept as 0 for liquids; see problems for 0 meaning unknown.                                                                                                               |
| `sugar_g_per_ml`                                                                                           | `sugar`                   | Divide by 10. The name says per ml but the values are grams per litre (`simple-syrup` 600, `lime-juice` 17, `sugar` 1000, `lemon-juice` 25); inferred from the values, not documented in the repository. |
| `acidity`                                                                                                  | `acid`                    | Present on one ingredient (`amontillado` 0.65); unit and reference acid unknown, so not mapped (see missing).                                                                                            |
| `ingredient_parts`                                                                                         | `prepared`                | 13 ingredients list their parts (ingredient objects without amounts); the converter makes them prepared ingredients with no spec yet; yield and amounts are missing.                                     |
| `calculators` / `calculator_id`                                                                            | none                      | 7 calculators (for example simple syrup, super juices) hold recipes as form blocks; read by hand for the 2 linked ingredients, not converted.                                                            |
| `units`                                                                                                    | none                      | Default unit hint for the editor; not part of the model.                                                                                                                                                 |
| `description`, `origin`, `color`, `distillery`, `category`, `images`, `prices`, `created_at`, `updated_at` | none (`notes` optionally) | Not needed by any rule. `category` is a text path that repeats the tree. Descriptions only as `notes` if the owner decides to ship them.                                                                 |
| (whole record)                                                                                             | `source`                  | `{ name: "Bar Assistant public data", licence: "MIT", url: <repository>, note: "commit <sha>" }`.                                                                                                        |

### Spec

| Bar Assistant                                                      | Mixtura                          | Rule                                                                                                                                            |
| ------------------------------------------------------------------ | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `_id`                                                              | `id`, `lineageId`                | Slug; `version` 1.                                                                                                                              |
| `name`                                                             | `name`                           | Kept.                                                                                                                                           |
| `parent_cocktail_id`                                               | `parentId`                       | 51 recipes; all targets exist.                                                                                                                  |
| `method`                                                           | `method`                         | Method id by name (Shake to `shake`). 3 recipes have none: left empty.                                                                          |
| `glass`                                                            | `glass`                          | Glass id by name; 34 recipes have none.                                                                                                         |
| `garnish`                                                          | `garnish`                        | Free text.                                                                                                                                      |
| `tags`                                                             | `tags`                           | Kept; some also hint at a template (see below).                                                                                                 |
| `instructions`, `description`                                      | `notes`                          | Optional, subject to the owner's decision on texts.                                                                                             |
| `source`                                                           | `source.url` or `source.note`    | URL if it starts with `http`, else the text (book reference); licence of the record is the dataset's.                                           |
| `abv`                                                              | none                             | Stored value is Bar Assistant's diluted figure; Mixtura derives its own ([balance](balance.md)). Used only as a check in the converter's tests. |
| `utensils`, `images`, `created_at`, `updated_at`, `year`, `author` | none                             | Not needed.                                                                                                                                     |
| line `_id`                                                         | `lines[].ingredientId`           | Kept.                                                                                                                                           |
| line `amount`, `units`                                             | `lines[].amount`, `lines[].unit` | Unit string mapped to a unit id; a line whose unit has no id is reported and kept out of balance and cost.                                      |
| line `amount_max`                                                  | `lines[].amountMax`              | Kept.                                                                                                                                           |
| line `optional`                                                    | `lines[].optional`               | Kept.                                                                                                                                           |
| line `note`                                                        | `lines[].note`                   | Kept.                                                                                                                                           |
| line `substitutes[]`                                               | `lines[].substitutes[]`          | `_id`, `amount` and `units` (only 3 have an amount).                                                                                            |
| line `sort`, `name`, `is_specified`                                | order of `lines`                 | Order by `sort`; `name` repeats the ingredient.                                                                                                 |
| (new)                                                              | `status`                         | `draft` for every seed spec: the seed is reference material, not a user's menu.                                                                 |

### Template, role, stock, affinity

Bar Assistant has no equivalent of templates, roles, stock records in the
dataset or affinities. Methods map to Mixtura's method vocabulary with
their `dilution_percentage` (6 values above) as input to
[balance](balance.md), whose source status is decided there.

## What is missing and how it is filled

| Mixtura needs               | In the data                                                                           | Proposal                                                                                                                                                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `role` of ingredients       | nothing                                                                               | Curated by hand in a Mixtura-owned file keyed by tree node (for example everything under `spirits` is `base`, under `bitters` `bitter`); children inherit. Every role is marked `assumed` until reviewed. |
| `sugar`                     | 241 non-zero values, in g per litre                                                   | Derived (divide by 10), `source` is the dataset. Zero is kept but flagged: 55 ingredients are exactly 0, and for syrups or liqueurs that can only mean unknown.                                           |
| `acid`                      | 1 value                                                                               | Curated in the Mixtura-owned file, each figure from a source read (for example citrus juice analyses) or marked `assumption, unverified`; left empty rather than invented.                                |
| `abv`                       | 296 values, 144 are 0                                                                 | Derived (as is); 0 on a spirit or liqueur is reported as missing.                                                                                                                                         |
| `shelfLifeDays`             | nothing                                                                               | Left empty; added by hand for prepared ingredients and fresh juices with a source.                                                                                                                        |
| `substitutionClass`         | 52 distinct substitute pairs                                                          | Proposed by rule: connected components of the pairs give 23 groups (sizes 2 to 6); curated by hand into classes in the Mixtura-owned file. Ancestors already cover "any citrus juice".                    |
| `cost`                      | no prices (0)                                                                         | Left empty; the user enters prices.                                                                                                                                                                       |
| `templateId` of specs       | tags such as Sour 66, Negroni 31, Spritz 18, Tiki 37, Old fashioned 7, Flip 4, Fizz 5 | Not assigned in bulk (out of scope). A suggestion list from tags, then by rule from method and the roles of lines once roles exist, reviewed by hand.                                                     |
| prepared ingredients' specs | 13 parts lists without amounts, 7 calculators                                         | Written by hand with amounts from a source, or left as plain ingredients.                                                                                                                                 |
| units as ids                | 48 strings                                                                            | Mapping table in the converter, driven by [units](units.md).                                                                                                                                              |

## Problems found

- **Duplicates.** No two ingredients share a name (case-insensitive).
  Near pairs where a fruit and its juice or syrup both exist
  (`lime`/`lime-juice`, `lemon`/`lemon-juice`, `honey`/`honey-syrup`,
  `ginger`/`ginger-syrup`, ...): 11 pairs; legitimate, they are different
  things. `demerara-syrup` and `honey-syrup` are children of
  `simple-syrup`, which is a mixed bag (a honey syrup is not a simple
  syrup): a tree-quality issue for review.
- **Ambiguous inner nodes.** 22 inner nodes are used directly in 686 lines
  (for example `gin`, `bitters`, `sweet-vermouth`); a recipe line naming a
  type is correct for a template slot but cannot be costed.
- **ABV.** Always present for ingredients, but 144 zeros mix "no alcohol"
  and "not filled in". Recipe `abv` is missing on 2 recipes (`bloody-caesar`,
  `clover-leaf`), 0 on 12 (all carry the Virgin tag, none contains an
  alcoholic ingredient), and no recipe with alcohol has 0. For the 306
  recipes with ml/oz lines only and an `abv`, the stored value is 0 to
  12.1 points below the undiluted ABV computed from the lines (median
  4.3), consistent with dilution already applied.
- **Units.** See above: 48 strings, singular and plural, counted and
  non-quantity units, 2 zero amounts.
- **Methods and glasses.** 3 recipes without method, 34 without glass;
  every used method and glass name exists in the base files (6 methods,
  16 glasses).
- **Template fit.** Cannot be counted until templates exist. Measured
  proxies: 24 recipes have 2 or fewer lines; 133 recipes have no tag; 65
  use top-up or part amounts; 3 use Layer. A real count belongs to the
  template-assignment issue.
- **Schema drift.** `schema.json` (draft-07) lacks several fields present
  in every record; the converter reads the files, not the schema, and
  fails on an unknown field.
- **Cleanup script.** `cleanup.sh` mentions folder and id suffixes
  `_NUMBER`; none occur in this commit (calculator ids such as
  `simple-syrup-1` do).

## Attribution

For the About screen:

> Recipes and ingredient data: Bar Assistant public data
> (https://github.com/bar-assistant/data), MIT License, Copyright (c) 2026
> Bar Assistant. Changed by Drink Builder: units, roles and balance
> figures added, some entries rewritten.

For `docs/dependencies.md`, and for the full notice shipped with the app
(the MIT text and the copyright line above are included unchanged in
the app's licence page):

| Data                         | Source                                      | Licence | Use                                  |
| ---------------------------- | ------------------------------------------- | ------- | ------------------------------------ |
| Seed recipes and ingredients | Bar Assistant public data, commit `5a504d4` | MIT     | Seed data; images and texts not used |

## Network hosts

Recorded in [development](development.md#network-hosts) as well.
