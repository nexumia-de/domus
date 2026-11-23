---
type: Research
title: Sources of proven pairings
description: Research of 2026-11-23 by one agent, for the owner's question where pairings that cooks actually use could come from, beside FlavorDB's shared molecules. Recommended, not decided - CulinaryDB (CC BY-NC-SA 3.0, 45,772 recipes with ingredient lists, the same lab and entity ids as FlavorDB), by counting which ingredients stand together in recipes; the Ahn 2011 recipe file as a cross-check; what was read, what could not be opened, and what a person has to check.
tags: [research, pairing, licences, data, culinarydb, flavordb]
generated: { by: claude-code, at: 2026-11-23 }
sources:
  - id: culinarydb
    title: 'CulinaryDB, home page and download, read and downloaded 2026-11-23'
    url: https://cosylab.iiitd.edu.in/culinarydb/
  - id: ahn
    title: 'Ahn YY, Ahnert SE, Bagrow JP, Barabási AL. Flavor network and the principles of food pairing. Scientific Reports 1, 196 (2011), read at PMC (PMC3240947) on 2026-11-23'
    url: https://pmc.ncbi.nlm.nih.gov/articles/PMC3240947
  - id: flavordb
    title: 'Decision: pairings from FlavorDB'
    url: decisions/flavordb.md
---

# Sources of proven pairings

**Status: research, nothing decided and nothing built.** The owner asked
for it on 2026-11-23 after "Goes with" in the editor offered guavas and
pork with tomatoes ([decision](decisions/flavordb.md#built)). One agent
searched and read; nobody checked its reading. Which source Culina
takes is the owner's decision, as it was for FlavorDB.

## The finding

No openly licensed data set that states pairings directly was found.
Every usable source is a set of recipes with ingredient lists, from
which pairings are counted: two ingredients pair when they stand
together in recipes more often than their frequencies alone would give.

## Recommended: CulinaryDB

- **What it is**: "a repository of structured data of recipes and
  ingredients across over 22 world regions"[^culinarydb], from the lab
  that made FlavorDB. One zip of 5.3 MB (sha256 beginning `ca8bd2e9`):
  45,772 recipes with title, source and cuisine, 930 ingredients, and
  456,279 rows of recipe and ingredient. No method text.
- **Licence**: "This work is licensed under a Creative Commons
  Attribution-NonCommercial-ShareAlike 3.0 Unported
  License."[^culinarydb] The same as FlavorDB; a derived file would
  have to be its own file under that licence.
- **Where the recipes come from**: Allrecipes 16,177, Food Network
  15,917, Epicurious 11,069, Tarla Dalal 2,609. Whether those sites
  agreed is not stated on the page.
- **Europe**: 14,675 recipes (Italy 7,504, France 2,703, British Isles
  1,075, Greece 934, Spain 816, Eastern Europe 565, the German-speaking
  countries 487, Scandinavia 404). It is European cooking as US recipe
  sites give it; German cooking is thin.
- **The link to the catalogue**: its ingredient ids are FlavorDB's
  entity ids (906 of 1,033 are in `flavour-pairings.json`), so
  `flavour-links.json` applies as it stands. Not linked today and
  frequent in recipes: olive oil, flour, oregano, lemon juice, yogurt,
  cumin, soy sauce, red onion, white wine, mint, tomato paste, chive,
  zucchini.
- **Defects seen**: "olive oil" is merged into "olive", black pepper and
  chilli flakes into "pepper"; the original names are in the file, so it
  can be repaired.

What counting gives on the European recipes, ranked by count times the
logarithm of the lift (the agent's rule, tried by it alone):

| Ingredient | Partners                                                               |
| ---------- | ---------------------------------------------------------------------- |
| Tomato     | garlic, basil, onion, oregano, capsicum, parsley, mozzarella, parmesan |
| Salmon     | dill, chive, mustard, lemon, caviar, shallot                           |
| Lamb       | rosemary, mint, garlic, onion, yogurt, carrot, thyme                   |
| Spinach    | parmesan, ricotta, garlic, feta, mozzarella, nutmeg                    |
| Cabbage    | onion, potato, carrot, beef, pork, caraway, apple                      |

By raw count alone salt, pepper, onion and garlic lead every list; by
lift alone rare oddities do.

## The others

| Candidate                                                  | Licence as read                                                       | Verdict                                                                                |
| ---------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Ahn et al. 2011, supplementary recipes (56,498, 381 names) | the article is CC BY-NC-SA 3.0[^ahn]; the data file states no licence | a cross-check; the licence of the file needs a person                                  |
| The 68 shipped classics                                    | public domain, own work                                               | far too few (tomato is in three recipes)                                               |
| Wikibooks Cookbook (about 3,800 recipes)                   | CC BY-SA                                                              | the fallback without a non-commercial clause; laborious                                |
| RecipeDB (the same lab)                                    | CC BY-NC-SA 3.0                                                       | no download of the whole was found                                                     |
| Recipe1M, and KitcheNette and FlavorGraph built on it      | research institutions only                                            | not usable                                                                             |
| Open Food Facts, FoodOn                                    | ODbL, CC BY 4.0                                                       | no pairings in them                                                                    |
| The Flavor Bible and books like it                         | copyrighted                                                           | not a data source; a single affinity can be cited                                      |
| Spoonacular, Edamam, TheMealDB                             | terms not opened                                                      | not verified; the first two forbid keeping data, by a third-party copy and from memory |

## Not verified

zenodo.org, kaggle.com, huggingface.co and the terms pages of the three
recipe services were refused by the session's network; something better
may be there. The official Ahn files were not obtained; a copy on GitHub
was counted. No Wikibooks recipe was read. The CulinaryDB paper was not
read. The partner lists were looked at by the agent and by nobody who
cooks. The legal points are an agent's reading and no legal advice.

[^culinarydb]: CulinaryDB, home page, read on 2026-11-23.

[^ahn]: The licence line of the article at PMC, read on 2026-11-23.
