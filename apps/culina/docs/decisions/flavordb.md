---
type: Decision Record
title: Pairings from FlavorDB
description: Decided by the owner on 2026-11-23. Culina takes pairings ("goes with") from FlavorDB, a database of flavour molecules per ingredient under CC BY-NC-SA 3.0, which fits because Culina is non-commercial; the data is one file of its own that names source, licence and changes, so that a commercial variant could leave it out. Built - the fetch, the derivation and the engine's pairing lookup with tests. Not built - the data itself (the session could not reach the site), the link to the catalogue, anything on a screen. What the data cannot say - what a dish lacks.
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

- **How a pairing is computed** (`packages/engine/src/pairing/`): two
  ingredients pair when they share at least 5 molecules; the order is by
  the share of common molecules among those of either (Jaccard index),
  then by the number shared. An ingredient with fewer than 10 molecules
  is not offered to others. Both numbers are judgements, set before any
  real data was seen, and to be looked at again with the data.
- **What it does not answer**: what a dish still needs ("flat, try
  acid"). The molecules describe aroma; sweet, sour, salty, bitter,
  umami and fat are not in the data in a usable form. That half of the
  taste profiles stays the open point of the
  [building kit](building-kit.md).
- **Spending**: whether a donation link inside Culina counts as
  commercial is not settled by the licence text. Not decided; the link
  is in the About dialog today.

## Built, and not built

Built on 2026-11-23, without the data:

- `tools/flavordb/fetch.mjs` asks for one entity at a time, one request
  a second, and keeps what it got (`tools/flavordb/raw/`, not
  committed).
- `tools/flavordb/derive.mjs` and `build.mjs` turn the raw files into
  the one file; the same files give the same bytes.
- The engine's `pairingsFor`, `sharedMolecules`, `flavoursOf` and
  `entityByName`, with vectors in `packages/engine/vectors/pairing/`.

**Not built:** the data file. The session's network reaches the site
only through a tool that passes on short excerpts; from the container
the connection failed (HTTP 502 from the proxy), so nothing was fetched
but two small entities for the tests
(`tools/flavordb/fixtures/`). The owner runs the fetch on a machine of
their own ([development](../development.md#pairing-data)). After that:
the link from FlavorDB's entities to the catalogue's ingredients (by
name, then by hand, as a judgement file), the notice in the app's
licences, and where a pairing shows on a screen.

## What nobody verified

The full entity documents (the fixtures have six of 41 fields per
molecule). How many entities there are and how large the file gets.
Whether the thresholds give pairings a cook would call sensible.
Whether F-Droid or Flathub take an app with this file (their rules were
not read). The licence questions are the agent's reading and no legal
advice.
