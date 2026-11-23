---
type: Decision Record
title: Pairings from FlavorDB
description: Decided by the owner on 2026-11-23. Culina takes pairings ("goes with") from FlavorDB, a database of flavour molecules per ingredient under CC BY-NC-SA 3.0, which fits because Culina is non-commercial; the data is one file of its own that names source, licence and changes, so that a commercial variant could leave it out. Built the same day - the data (936 ingredients, 1788 molecules), the links to the catalogue (630 of 720) and Goes with on the dish screen. What the data cannot say - what a dish lacks. Nobody but the agent judged the pairings.
tags: [decision, pairing, flavordb, licences, data, taste]
generated: { by: claude-code, at: 2026-11-23 }
sources:
  - '[^owner]: the owner in the session of 2026-11-23, in German, translated here'
  - id: faq
    title: 'FlavorDB2, home page, footer and FAQ (questions 15, 19, 21), read 2026-11-23'
    url: https://cosylab.iiitd.edu.in/flavordb2/faq
  - id: ahn
    title: 'Ahn YY, Ahnert SE, Bagrow JP, Barabási AL. Flavor network and the principles of food pairing. Scientific Reports 1, 196 (2011). Abstract read at Europe PMC (PMC3240947) on 2026-11-23'
    url: https://doi.org/10.1038/srep00196
---

# Pairings from FlavorDB

**Status: decided by the owner on 2026-11-23.** "Implement FlavorDB, or
derive from it. We will not use it commercially."[^owner] This lifts the
rule "no data from FlavorDB" of `AGENTS.md` for Culina. Mixtura's rule
of the same wording is not touched.

## Context

The [building kit](building-kit.md) names two problems: no idea what to
cook, and not knowing what goes together. For the second, no data with a
licence the rules allowed had been found, and FlavorDB was excluded
because of its non-commercial licence. Culina is non-commercial since
2026-11-19 ([licence of the sources](sources-licence.md)) and already
ships notes from non-commercial sources; the exclusion of FlavorDB was
older than that decision and was not looked at again until the owner
asked.

## What FlavorDB is

A database that lists, for an ingredient, the flavour molecules found in
it: "25595 flavor molecules ... Among these 2254 molecules are
associated with 936 natural ingredients belonging to 34
categories"[^faq] (the FAQ says 951 ingredients; not reconciled). Each
molecule carries words for its smell or taste ("garlic", "roasted",
"citrus"). Licence: "Creative Commons
Attribution-NonCommercial-ShareAlike 3.0 Unported"[^faq]. The data "can
be downloaded in JSON format from ... the entity page"[^faq]; there is
no download of the whole, and the site has no robots.txt and no terms
about automated access (looked for on 2026-11-23, none found).

## Decision

1. **Culina uses FlavorDB for pairings**, and stays non-commercial:
   free of charge and without advertising wherever it is offered. A paid
   app of Culina is thereby possible only without this data (point 3).
2. **Derived, not copied whole.** Of an entity the app keeps id, names,
   category and the PubChem ids of its molecules; of a molecule its name
   and flavour words. The file names FlavorDB, its address, the licence,
   the paper to cite, the date of the fetch and what was changed, which
   is what the licence asks of an adaptation (agent's reading, not legal
   advice).
3. **One file of its own, under its own licence.** The pairing data is
   `packages/app/data/flavour-pairings.json`, CC BY-NC-SA 3.0, apart
   from the code (AGPL). As with the notes, a later commercial variant
   leaves the file out; nothing else depends on it.
4. **A pairing is a hint and says so.** The data has no amounts: a trace
   counts like the molecule that makes the ingredient. Pairing by shared
   molecules is a hypothesis that "Western cuisines show a tendency" to
   follow while "East Asian cuisines tend to avoid compound sharing
   ingredients"[^ahn]. The app shows a pairing as computed from shared
   flavour molecules, with the flavour words they carry, never as right
   or wrong.

## What follows (agent)

- **How a pairing is computed** (`packages/engine/src/pairing/`), as
  changed after the real data was seen:
  - A molecule counts by how rare it is: the natural logarithm of the
    number of ingredients over the number that have it. Counted
    plainly, the lists were decided by one block of some 93 molecules
    that about 170 of the 936 ingredients carry alike (garlic then
    "paired" with dandelion and rose hip).
  - Two ingredients pair when they share at least 5 molecules; their
    overlap is the weight of the shared molecules over the weight of
    the molecules of either. An ingredient with fewer than 10 molecules
    (369 of the 936, most fish among them) is not offered to others.
  - An ingredient of the same family (the first part of FlavorDB's
    category: fruit with fruit, cheese with cheese) is left out. That
    is likeness, which the data shows well and a cook knows.
  - For a dish, a candidate is measured against itself: how many
    spreads its overlap with a dish's ingredient lies above its mean
    overlap with all ingredients of other families. Without this, the
    ingredients with the most molecules (beans, rice, soybean) led
    every list. The score is the mean over the dish's ingredients; a
    candidate at or below its usual is not offered.
  - All of these are judgements of this project. They were tried on a
    dozen dishes by the agent and by nobody else.
- **What the app shows**: on the dish screen, closed behind a tap,
  "Goes with": up to eight ingredients of the catalogue with the dish's
  lines they go with ([behaviour](../behaviour.md)). Only ingredients
  the catalogue has are offered, so that each has a name in both
  languages. The flavour words of the shared molecules are computed and
  not shown: they are English only.
- **The link to the catalogue** is this project's, not FlavorDB's:
  `packages/app/data/flavour-links.json`, from a rule on names and 86
  corrections with their reasons (`tools/flavordb/links-own.json`). 630
  of the 720 ingredients are linked; fats, most oils and mixtures are
  not.
- **What it does not answer**: what a dish still needs ("flat, try
  acid"). The molecules describe aroma; sweet, sour, salty, bitter,
  umami and fat are not in the data in a usable form. That half of the
  taste profiles stays the open point of the
  [building kit](building-kit.md).
- **Spending**: whether a donation link inside Culina counts as
  commercial is not settled by the licence text. Not decided; the link
  is in the About dialog today.

## Built

On 2026-11-23:

- `tools/flavordb/fetch.mjs` asked for the entities 0 to 978 one at a
  time; 936 exist, none failed. Earlier that day the site did not
  answer from the session's container (HTTP 502), which is why the first
  commit of this work says the data was not fetched.
- `tools/flavordb/derive.mjs` and `build.mjs` wrote
  `flavour-pairings.json`: 936 entities, 1788 molecules, 606 kB. (The
  site speaks of 2254 molecules with ingredients; the difference was
  not looked into.)
- `tools/flavordb/link.mjs` and `link-build.mjs` wrote the links.
- The engine's `pairingsFor`, `pairingsForDish`, `pairingBaselines`,
  with vectors in `packages/engine/vectors/pairing/`.
- The section on the dish screen, in English and German.

**Added the same day, after the owner asked what the data had brought:**
"Goes with" in the dish editor, under the slots, drawn again with every
change of the fillings; a tap adds the ingredient as a slot
([behaviour](../behaviour.md#editor)). The owner's words: the aim is to
put dishes together oneself by "goes with".

**Not built:** offers by role (the data knows no roles, and the role
table names 23 ingredients); components of the kit as offers, only
ingredients; anything in the native app; a way to say "not this one".

**Seen in the editor by the agent:** for tomatoes alone the offers were
pork, chicken, butter, beef, guavas, strawberries, apples and wine; for
tomatoes and basil, ginger, orange, guavas, peppers, bay leaf, celery,
marjoram and black currant. Garlic, olive oil (oils are not linked) and
mozzarella were not among them. As a way to build a dish this is thin;
it is recorded here so that the question of curated affinities beside
the computed ones is asked with that in view.

## What nobody verified

Whether the pairings are ones a cook would call sensible: the agent
looked at a dozen dishes and found them plausible as hints, with odd
ones among them ("fish oil" with baked potatoes). Each of the 630 links
one by one (the rule's links were read as a list of 150 pairs of names,
the corrections written from that). Why 369 entities have fewer than
ten molecules. Whether F-Droid or Flathub take an app with this file
(their rules were not read). How long the first opening takes on a
phone (the baselines are computed then; about 130,000 comparisons). The
licence questions are the agent's reading and no legal advice.
