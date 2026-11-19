---
type: Research
title: Existing tools and data
description: Survey of free and open-source cocktail software and of data sources with their licences, what Bar Assistant already does and the gap Mixtura fills.
tags: [research, tools, data, licences]
generated: { by: claude-code/2.1.326, at: 2026-11-16 }
sources:
  - id: ba
    title: Bar Assistant, README
    url: https://github.com/karlomikus/bar-assistant
  - id: badocs
    title: Bar Assistant documentation, usage and FAQ
    url: https://docs.barassistant.app/
  - id: badata
    title: Bar Assistant data
    url: https://github.com/bar-assistant/data
  - id: saltrim
    title: Salt Rim, LICENSE
    url: https://github.com/karlomikus/vue-salt-rim
  - id: drinkable
    title: Drinkable on F-Droid
    url: https://f-droid.org/en/packages/com.moimob.drinkable/
  - id: indexotica
    title: Indexotica (SBoudrias/cocktails)
    url: https://github.com/SBoudrias/cocktails
  - id: opendrinks
    title: Open Drinks
    url: https://github.com/alfg/opendrinks
  - id: tcdbapi
    title: TheCocktailDB, API page
    url: https://www.thecocktaildb.com/api.php
  - id: tcdbterms
    title: TheCocktailDB, terms of use
    url: https://www.thecocktaildb.com/terms_of_use.php
  - id: flavordb
    title: FlavorDB2, footer and FAQ
    url: https://cosylab.iiitd.edu.in/flavordb2/faq
  - id: gnomeapps
    title: Apps for GNOME, overview
    url: https://apps.gnome.org/en/
---

# Existing tools and data

Surveyed on 2026-11-16 for an experienced bartender, who does not need a
recipe list. Facts were read from the linked pages; what was only seen
in search results is marked _unverified_.

# Software

| Tool                                       | Licence               | Platform                                       | What goes beyond recipes                                                                |
| ------------------------------------------ | --------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------- |
| Bar Assistant with its web client Salt Rim | MIT[^ba][^saltrim]    | Self-hosted server, web client as PWA[^badocs] | See below                                                                               |
| Drinkable                                  | MIT[^drinkable]       | Android (F-Droid), iOS, web, offline           | "What can I make" and "missing one ingredient", own recipes; about 150 drinks           |
| Indexotica                                 | AGPL-3.0[^indexotica] | Web                                            | Rum classes with substitution lists; acid, sugar and saline calculators; own recipe set |
| Open Drinks                                | MIT[^opendrinks]      | Web                                            | Nothing; recipes by pull request                                                        |

Libations (recipe viewer), CocktailBerry (software for a dispensing
machine) and the Android app Drinks (last updated 2016) add nothing for
this audience. Apps for GNOME lists no cocktail or recipe app[^gnomeapps];
no native app for Linux phones was found.

## Bar Assistant

The only serious tool, and the benchmark. Release v6.11.1 is from
2026-11-08. It has[^ba][^badocs]:

- a shelf per user and the cocktails it allows, with a filter "missing
  N ingredients";
- an ingredient hierarchy: a recipe that asks for "Citrus Juice" also
  matches its child "Lemon Juice";
- complex ingredients made of other ingredients, such as simple syrup
  from sugar and water;
- substitutes and optional ingredients per recipe, which count for the
  shelf;
- cocktail variations, ratings, and notes on cocktails and ingredients;
- several prices per ingredient and a computed price per cocktail;
- filters by method, ABV range, tags, glass and main ingredient;
- a shopping list from missing ingredients, recommendations from
  favourites and tags, public menus, collections, several bars with
  roles, an API.

Not found in its documentation or README: dilution in the ABV figure,
batch scaling, templates with role slots, a history of a spec's
versions, a ranking of which ingredient unlocks the most, and anything
for non-alcoholic drinks beyond the ABV filter.

# Data

| Source                                            | Licence                                                                                                    | Use for Mixtura                                          |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Bar Assistant data, 500+ recipes with ingredients | MIT[^badata]                                                                                               | Seed data, with attribution                              |
| TheCocktailDB                                     | No open licence; a public release needs a paid key; the full listing is premium only[^tcdbapi][^tcdbterms] | None                                                     |
| FlavorDB                                          | CC BY-NC-SA 3.0, download per molecule only[^flavordb]                                                     | None; non-commercial terms do not fit an AGPL app        |
| IBA recipes                                       | IBA's copyright; community scrapes with licences _unverified_                                              | None as data; the drinks themselves are common knowledge |

No openly licensed flavour pairing data was found. Pairings in Mixtura
have to be curated, each with its source.

# The gap

What stays valuable for an experienced bartender
([how bartenders work](bartender-practice.md)) and no FOSS tool offers:

1. Templates with role slots, and riffs linked to their parent, for
   drinks with and without alcohol.
2. Balance numbers per spec with dilution by method, and batch scaling.
3. Which one bottle unlocks the most drinks, with substitution by role.
4. Specs with a version history and tasting notes.
5. Rules for non-alcoholic drinks: what replaces body, bite and
   structure, and shelf life.
6. An app that works offline without a server and installs on a phone.
