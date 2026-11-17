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
The converter (`scripts/seed/`, issue #13) implements this specification;
where it deviates, the section [Converter](#converter) says so.

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
| depth and children                                                                                         | `level`                   | Derived position: root with children `category`, other inner node `type`, leaf `product`. Roots without children (24) are products.                                                                      |
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

## Converter

Decisions of the owner for the shipped data: **names, tags, ingredients,
amounts, units, method and glass only.** Not shipped: recipe instructions,
descriptions, garnish text, line notes, images and every per-recipe source
link or book reference, because the dataset does not say where those texts
come from. `parent_cocktail_id` (a link between two recipes) and the
substitute links (ingredient ids) are kept. Each record has the dataset as
its `source` (name, MIT, repository, `commit <sha>`).

Code in `scripts/seed/`, one job per file; it reads a local checkout, uses
the engine's own `parseAmount` for units and `matchSpec` for templates
(imports, no copy), and is not part of the engine's runtime code.

| File              | Job                                                                                      |
| ----------------- | ---------------------------------------------------------------------------------------- |
| `convert.ts`      | Command line, pin check, writes the files and the report (run through `run.mjs`)         |
| `source.ts`       | Reads the checkout; a field it does not know fails the run                               |
| `levels.ts`       | Level (position) of every ingredient; the parent is the source parent                    |
| `roles.ts`        | Roles from the curated table by tree node, inheritance, list of unclassified ingredients |
| `properties.ts`   | ABV and sugar from the source; a 0 that means "not filled in" is left out                |
| `substitution.ts` | Substitution classes from the connected components of the source's substitute pairs      |
| `units.ts`        | Unit string to engine unit id through `parseAmount` (one alias: `topup` is `top`)        |
| `specs.ts`        | Cocktail to spec; template suggestion; recipes with a rejected unit are kept out         |
| `build.ts`        | Puts it together, counts, validates                                                      |
| `validate.ts`     | Ajv against `packages/engine/schemas/`, tree check, references; any problem throws       |
| `stable-json.ts`  | Sorted keys, one record per line, so a rerun gives no diff                               |
| `pinned.json`     | Repository, commit, licence, holder: the pin; the checkout's `.git/HEAD` must match it   |

### Rules and deviations from the mapping above

- **Units.** A recipe with a line the amounts module rejects is kept out
  (owner decision), not just the line. Counted units are accepted since
  issue #69 ([units](units.md#counted-units)): `whole`, `leaves`, `slice(s)`,
  `sprig(s)`, `wedge(s)`, `pinch`, `cube`, `peel`, `stalk(s)`, `scoop(s)`,
  `chunks`, `yolk`, `stick`, `beans`, `capsule`, `piece`; such a line is
  stored as entered (`leaves` becomes the unit `leaf`). Still rejected,
  **28 of 663 recipes, 13 distinct reasons**: `part`/`parts` 9 (a ratio
  to the other lines, not a unit), `amount range not above the amount` 4
  (`amount_max` not larger than `amount`), `cup` 3 (a volume nobody gave
  a source for), `amount of 0` 2, `bottle` 2 and `shot` 2 (sizes vary),
  and once each `strong`, `float`, `hand-whipped`, `rinse`, `inch` and
  `1` (not quantities); the full list per recipe is in the report.
  `topup` becomes `top`; `oz` becomes the US fluid ounce (`oz_us`) and,
  for `sugar`, the mass ounce. The source's `top` amount (1 or 120) has no
  known unit, so the seed has no `topMl` and a top line is listed as not
  counted in the figures. The seed has **no per-unit volume**
  (`unitVolumes`): none was read from a source, so every counted line is
  listed as not counted; 87 specs have a counted line, 105 counted lines
  of 2,803 (optional lines left out) are not counted, 54 `top` lines in
  55 specs likewise (130 specs have at least one line not counted).
- **Levels.** The tree keeps the source's real depth (up to five levels,
  [decision on #68](ingredients.md#tree)); every parent is the source
  parent and nothing is re-attached. `level` only describes the position:
  root with children `category`, other inner node `type`, node without
  children `product`. Before #68 the converter attached eight inner nodes
  below another `type` (`bourbon-whiskey`, `scotch-whiskey`, `dark-rum`,
  `rum`, `fruit-brandy`, `tequila`, `orange-juice`, `simple-syrup`) to a
  higher ancestor, so a recipe line naming `whiskey`, `rum`, `brandy`,
  `mezcal`, `citrus juice` or `syrups` was not satisfied by them or their descendants. Now it is. Only the parent of those eight nodes changed in
  the committed seed; roles, ABV, sugar, classes and every count below are
  unchanged (their own values or the same inherited ones). Depth of the
  296 nodes: 39 roots, 153 at depth 1, 70 at depth 2, 33 at depth 3, 1 at
  depth 4 (`demerara-rum`).
- **Where wrong-looking placements come from.** Checked on the pinned data:
  "Cocchi Aperitivo Americano counts as dry vermouth" and "Bacon Fat-Infused
  Bourbon counts as bourbon" are **the source's own parent links**
  (`cocchi-aperitivo-americano` under `dry-vermouth`,
  `bacon-fat-infused-bourbon` under `bourbon-whiskey`), neither flattening
  (the eight moved nodes are other nodes) nor the curated role table (roles
  only give a role and do not move a node). Flattening was a separate
  fault, now removed.
- **Corrections of the source's links** are not made in the converter. The
  converter output stays the source's tree. Mixtura's own
  `packages/engine/data/mixtura/corrections.json` overrides a parent, each
  with `was`, a `note` and an `evidence` status; the app's
  `seed-assemble.mjs` applies it (`seed-corrections.mjs`). The list is
  short and certain, 2 entries, both `assumption, unverified` because no
  source could be read (en.wikipedia.org is outside the session's network):

  | Node                         | Source parent  | Parent now       | Why                                                                                                         |
  | ---------------------------- | -------------- | ---------------- | ----------------------------------------------------------------------------------------------------------- |
  | `cocchi-aperitivo-americano` | `dry-vermouth` | `fortified-wine` | an aromatised quinquina wine like `lillet-blanc`, not a dry vermouth                                        |
  | `tequila`                    | `mezcal`       | `spirits`        | separate agave spirit and designation; mezcal is not satisfied by tequila (its four ageing children follow) |

  A test (`seed-corrections.test.ts`) checks that each names an existing
  node, its `was` is the seed's parent, the tree stays valid and no other
  parent differs from the seed.

  **Doubtful, not corrected** (left as the source has them; the owner or a
  drink expert decides): `sloe-gin` under `gin` (a liqueur by category);
  `cask-proof-whiskey` under `bourbon-whiskey` (a strength, not
  necessarily bourbon); `grape-brandy`, `grappa` and `pisco` under
  `fruit-brandy` (grape and pomace brandies, whose siblings `cognac` and
  `armagnac` sit under `brandy`); `coconut-rum` and `pineapple-rum` under
  `rum` (flavoured rums); `vanilla-vodka` and `vodka-citron` under `vodka`
  (flavoured); `fig-infused-mezcal` under `mezcal`.

- **Infused and fat-washed spirits.** `bacon-fat-infused-bourbon`,
  `fig-infused-mezcal` and `sage-infused-vodka` are prepared ingredients by
  nature, but the source gives only `ingredient_parts` without amounts, so
  they are plain ingredients (child of their base, ABV inherited) and
  count as that base: a recipe for bourbon is satisfied by the
  fat-washed one. Modelling them as prepared ingredients that do not stand
  in for their base unless asked is larger than this package; issue #88 tracks it.
- **Prepared ingredients.** Not created: the 13 ingredients with
  `ingredient_parts` have no amounts, and a prepared ingredient needs a
  spec and a yield. They are plain ingredients.
- **ABV and sugar.** A 0 is left out (unknown, inherits) for ABV under
  `spirits`, `liqueurs`, `aperitif`, `fortified-wine`, `bitters`, `wines`
  and `creme-de` (18 ingredients), for sugar under `sweeteners`,
  `liqueurs`, `creme-de`, `aperitif`, `fortified-wine` and `infusions`
  (1: `infusions`). Sugar is divided by 10 as specified.
- **Acid** is never written to the seed: no value was read from a source
  (see below).
- **Substitution classes.** 23 classes over 69 ingredients, named
  `sc-<smallest id>`, by the rule in the table above, not curated by hand;
  marked in `assumed`.
- **Roles.** The table in `packages/engine/data/ingredient-properties.json`
  has 55 entries (45 give a role, 10 are `null`), children
  inherit; every entry is `basis: assumption` and the ingredient lists
  `role` in `assumed`. By rule: under `spirits` base (three sweet
  spirit-based liqueurs modifier), `liqueurs`, `creme-de`,
  `fortified-wine` and `wines` modifier, `aperitif` and `bitters`
  bitter, `sweeteners` sweet, citrus juice sour, other juices, sodas,
  beer and sparkling wine lengthener, dairy and eggs texture, fruit,
  herbs, spices and seasonings accent. **Unclassified (13 ingredients, reported, no
  role):** `activated-charcoal`, `batter`, `gardenia-mix`, `coffee`,
  `cold-brew-coffee`, `espresso`, `crushed-ice`, `hot-chocolate`,
  `infusions`, `mango-puree`, `white-peach-puree`, `tea`, `water`.
- **Curated classics values.** The same file has a `classics` part: acid
  values (all `assumption`, no source read; 6 % for lemon and lime juice as
  in [balance](balance.md#usual-ranges-per-template), 0 for spirits,
  bitters, sweeteners, liqueurs, fortified wine, bitter aperitifs, soda
  water and eggs) used **only** by the [checked classics](#checked-classics).
  They are not in the seed. A search summary (not the page; the hosts
  were not reachable) of a citrus study gave 4.9 to 6.0 g per 100 ml for
  lemon juice, in line with 6 %; not used as a source.
- **Schema change.** `spec.schema.json` and `common.schema.json` required
  unit ids to be slugs, which rejects `oz_us`; a `unitId` type (hyphen or
  underscore allowed) replaces it for line units and quantities.
- **Template suggestion.** The engine's `matchSpec` over the six root
  templates with the recipe's lines without optional lines; a spec that
  fits none has no `templateId`.

### Result

From the pinned commit (counts by the converter, which also prints them):

| Count                                             | Value                              |
| ------------------------------------------------- | ---------------------------------- |
| Ingredients converted                             | 296 of 296                         |
| Specs converted, skipped                          | 635, 28 (of 663)                   |
| Ingredients with a resolved role                  | 283 (13 unclassified)              |
| Lines (without optional) missing role, abv, sugar | 0.4 %, 0.6 %, 0 % of 2,803         |
| Lines missing acid                                | 100 %                              |
| Specs with ABV, sugar and acid all known          | 0 of 635                           |
| Specs with ABV known after dilution               | 617 (19 have no or unknown method) |
| Specs with sugar known after dilution             | 635                                |
| Specs with a template                             | 107 of 635                         |

Per template: Martini 57, Daiquiri 24, Sidecar 14, Old-Fashioned 8,
Highball 3, Flip 1 (`bluebird-eggnog`: the egg is a counted line without a
volume, so its slot is filled and its ratio unmeasured); 528 fit none. The numbers are what the data gives; nothing was
tuned. For information only: if the assumed acid values of the classics
were applied to all of the seed, 308 of 548 specs would have all three
figures; with them as assumptions that number says little about the
data. Many specs fit no template because the bands are assumptions
(for example the Manhattan: the Martini template's bitter slot is a
bitter liqueur of 0.5 to 2 parts, so two dashes of aromatic bitters are
far below it).

### Files

`packages/engine/data/seed/`, committed, read-only for the app, exported
by the engine package as `@mixtura/engine/seed/<file>`:

| File                        | Content                                                       | Size   |
| --------------------------- | ------------------------------------------------------------- | ------ |
| `ingredients.json`          | `{ attribution, ingredients: Ingredient[] }`, sorted by id    | 86 kB  |
| `specs.json`                | `{ attribution, specs: Spec[] }`, sorted by id                | 384 kB |
| `vocabulary.json`           | `{ attribution, glasses: {id,name}[], methods: {id,name}[] }` | 1 kB   |
| `LICENSE-bar-assistant.txt` | The source's licence text, for the licence page               | 1 kB   |

Every file but the licence has `attribution`: `source`, `repository`,
`commit`, `licence`, `holder`, `notice` (the text for About). Objects
have sorted keys, the big arrays one record per line. Ingredients follow
the [data model](data-model.md#ingredient), specs the
[spec](data-model.md#spec) with `status: draft` and `version: 1`.
Roughly 471 kB uncompressed, small enough to load whole; no split further.

### Regenerating

```sh
git init /path/to/empty-dir && cd /path/to/empty-dir && git fetch --depth 1 https://github.com/bar-assistant/data 5a504d474614494119882eb91a8ffdc5491a483f && git checkout FETCH_HEAD
```

```sh
npm run seed -- /path/to/empty-dir
```

The checkout is only read (never run); the script stops if its
`.git/HEAD` is not the pinned commit. It prints the counts and writes a
report with every skipped recipe and reason to
`$TMPDIR/mixtura-seed-report.json` (`--report <file>` changes it; not
committed). A rerun produces no diff. The build never needs the network.
To move to another commit, change `scripts/seed/pinned.json`, regenerate
and review the diff of the report.

The test fixture `scripts/seed/fixture/source` is a small invented dataset
in the source format; its expected output is committed and a test fails if
the converter's output differs. After a change of the converter or of the
curated file, regenerate it:

```sh
node scripts/seed/run.mjs scripts/seed/fixture/source --out scripts/seed/fixture/expected --pin scripts/seed/fixture/pinned.json
```

### Thresholds

The test `seed.test.ts` fails when more than this share of the lines of
all specs (optional lines left out) names an ingredient whose resolved
property is unknown. They are regression guards set above the measured
values (role 0.4 %, abv 0.6 %, sugar 0 %), not quality targets. Acid is excluded: it is unknown on every line
by design.

Threshold role: 1 %, Threshold abv: 1 %, Threshold sugar: 0.5 %.

### Checked classics

`packages/engine/vectors/classics/`, 20 vectors, schema
`classics-vector.schema.json`, run by `classics.test.ts`. Each holds the
lines, the ingredient properties used, the expected template and the
figures after dilution. The figures were calculated by a separate
script outside the engine from the formulas of [balance](balance.md) and
the matching rules of [templates](templates.md) (checked by hand for the
Daiquiri: 105 ml, 18.286 % ABV, 10.67 g sugar per 100 ml with sugar of the
rum and lime counted, 1.029 % acid) and the engine must agree within
0.0001. A second test requires that the seed plus the curated classics
values still give the properties written in each vector.

| Template      | Drinks                                                                                                                            |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Old-Fashioned | Old Fashioned                                                                                                                     |
| Martini       | Martini, Negroni (bitter slot used), Boulevardier; Manhattan fits none and is kept to show it                                     |
| Daiquiri      | Daiquiri, Gimlet, Whiskey Sour, Tommy's Margarita, Jack Rose                                                                      |
| Sidecar       | Sidecar, Margarita, White Lady, Between the Sheets                                                                                |
| Highball      | Whisky Highball (the `top` line read as 120 ml: assumption)                                                                       |
| Flip          | Brandy Flip: the nominal flip of balance (egg 45 ml, assumption), because the seed's egg line is a counted line without a volume  |
| none          | Cuba Libre, Moscow Mule, Screwdriver, Cosmopolitan: acid unknown (cola, ginger beer, orange juice, cranberry juice have no value) |

Why these: well known, in the dataset with units the amounts module
accepts, and between them every template, the optional slot, a `top`
line, an unknown figure and four near misses. Where a classic fits no
template (Manhattan, Screwdriver: 3 parts of mixer against a band of 4
to 6) that is the result of the assumed bands, not of the data, and is
recorded as such in the vector.

## Mixtura's own additions

Not converter output, so `npm run seed` neither reads nor overwrites them:
`packages/engine/data/mixtura/ingredients.json` (23 ingredient nodes with an
`evidence` map per value, [non-alcoholic](non-alcoholic.md#as-built-36)) and
`specs.json` (4 nominal example drinks), attribution source `Mixtura`,
licence AGPL-3.0-or-later; the variant templates are in
`data/template-variants/`. The app's `seed-assemble.mjs` merges them after
the converted data (ingredients 296 + 23 = 319, specs 635 + 4 = 639,
templates 6 + 4 = 10) and appends Mixtura's notice to the Bar Assistant notice
that About shows; the corrections of `corrections.json` are applied to the parents first; the seed version becomes `bar-assistant-5a504d4+mixtura-2`.
Tests: `non-alcoholic-data.test.ts` (schemas, evidence of every value, merge
without id clash, examples). Alcohol classes of the 635 converted drinks:
[counts](non-alcoholic.md#as-built-36).

## Network hosts

Recorded in [development](development.md#network-hosts) as well.
