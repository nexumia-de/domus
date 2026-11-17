---
type: Research
title: Existing tools and data
description: Survey of free and open-source cooking software and of data sets with their licences, and the gap Culina fills for an experienced cook.
tags: [research, tools, data, licences]
generated: { by: claude-code/2.1.326, at: 2026-11-16 }
sources:
  - id: mealie
    title: Mealie, repository and feature page
    url: https://mealie.io/documentation/getting-started/features/
  - id: tandoor
    title: Tandoor Recipes, repository and documentation
    url: https://docs.tandoor.dev/
  - id: grocy
    title: Grocy, home page
    url: https://grocy.info/
  - id: kitchenowl
    title: KitchenOwl
    url: https://github.com/tombursch/kitchenowl
  - id: cookcli
    title: CookCLI and the Cooklang specification
    url: https://github.com/cooklang/CookCLI
  - id: nccookbook
    title: Nextcloud Cookbook
    url: https://github.com/nextcloud/cookbook
  - id: bakers
    title: Baker's Percentage Calculator on F-Droid
    url: https://f-droid.org/en/packages/com.pep1lo.bakerspercentagecalculator/
  - id: off
    title: Open Food Facts, terms of use
    url: https://world.openfoodfacts.org/terms-of-use
  - id: flavordb
    title: FlavorDB2, footer and FAQ
    url: https://cosylab.iiitd.edu.in/flavordb2/faq
  - id: recipenlg
    title: RecipeNLG dataset card
    url: https://huggingface.co/datasets/recipe_nlg/blob/main/README.md
  - id: gnomeapps
    title: Apps for GNOME, overview
    url: https://apps.gnome.org/en/
---

# Existing tools and data

Surveyed on 2026-11-16 for an experienced cook, who does not need a
recipe box. Facts were read from the linked pages; what could not be
read there is marked _unverified_.

# Software

| Tool                          | Licence                                          | Platform                                | What goes beyond storing recipes                                                                                                                                       |
| ----------------------------- | ------------------------------------------------ | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cooklang with CookCLI         | MIT[^cookcli]                                    | Plain text files, CLI, local web server | Recipes in git, references to other recipes with scaling, a pantry file with amounts and expiry, "what can I cook" with partial matches, menus, shopping list by aisle |
| Mealie                        | AGPL-3.0[^mealie]                                | Self-hosted web, API                    | Import from URLs, ingredient parser with foods and units, meal plan, shopping lists, groups and households. Pantry-based search, sub-recipes and scaling: _unverified_ |
| Tandoor                       | AGPL-3.0 with a clause against selling[^tandoor] | Self-hosted web                         | Meal plan, shopping, scaling. Food hierarchy, substitutes and step recipes: _unverified_                                                                               |
| Grocy                         | MIT[^grocy]                                      | Self-hosted web, API                    | Stock, recipes checked against stock, a "Due Score" for recipes that use up what expires soon, meal plan. Recipe costing: _unverified_                                 |
| KitchenOwl                    | AGPL-3.0[^kitchenowl]                            | Android (F-Droid), iOS, web             | Shared shopping lists, partly offline, recipes, planner                                                                                                                |
| Nextcloud Cookbook            | AGPL-3.0[^nccookbook]                            | Nextcloud app                           | Import from URLs, recipes as schema.org JSON                                                                                                                           |
| Baker's Percentage Calculator | Apache-2.0[^bakers]                              | Android (F-Droid)                       | Baker's percentages and scaling; a calculator without recipes                                                                                                          |

GNOME Recipes is GTK3 and was last released in 2020 (_unverified_);
Apps for GNOME lists no recipe or cooking app[^gnomeapps]. No native app
for Linux phones was found.

Best per purpose: Cooklang with CookCLI for a cook who thinks in
components and cooks from stock; Mealie as a household server; Grocy for
stock and expiry; KitchenOwl for shared lists on the phone.

# Data

| Source          | Licence                                                | Use for Culina                                                                   |
| --------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Open Food Facts | ODbL for the database, CC BY-SA for images[^off]       | Products and nutrition, with attribution and share-alike; not culinary knowledge |
| FlavorDB        | CC BY-NC-SA 3.0, download per molecule only[^flavordb] | None                                                                             |
| RecipeNLG       | Non-commercial research and education only[^recipenlg] | None                                                                             |
| FooDB           | _unverified_, the site refuses automated requests      | None until read                                                                  |

No openly licensed data for flavour pairing or for substitution was
found. Both have to be curated, each entry with its source.

# The gap

What stays valuable for an experienced cook
([how chefs work](chef-practice.md)) and no FOSS tool offers:

1. Ratios and templates with their family of variations, inside a
   notebook and not as a separate calculator.
2. Dishes as role slots filled by components.
3. Cooking from stock by role and expiry; only Grocy and CookCLI match
   by ingredient.
4. Substitution with its effect on the result.
5. Versions with tasting notes; today only git on Cooklang files.
6. Pairing lookup with source and confidence.
7. An app that works offline without a server and installs on a phone.
