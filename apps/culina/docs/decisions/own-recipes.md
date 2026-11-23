---
type: Decision Record
title: Own recipes, written without a source
description: Decided by the owner on 2026-11-23. A shipped recipe may be the project's own, written by an AI model from general cooking knowledge and following no source; it says so in the place of a source, with amounts for a stated number of persons, read a second time by another agent and cooked by nobody. It lifts, for recipes and for pairings marked as the project's judgement, the rules that every recipe follows one named source and that nothing is written from memory; nine more cuisines. What is lost with it.
tags: [decision, recipes, sources, classics, cuisines, format]
generated: { by: claude-code, at: 2026-11-23 }
sources:
  - '[^owner]: the owner in the session of 2026-11-23, in German, translated here'
  - id: licence
    title: 'Decision: licence of the sources'
    url: sources-licence.md
  - id: format
    title: 'Classic and technique file format'
    url: ../classic-format.md
---

# Own recipes, written without a source

**Status: decided by the owner on 2026-11-23.** After 20 recipes from
books of 1877 to 1904 the owner asked "why nothing more modern?", asked
for other countries, and said: "But we can also work without sources,
because you know such things."[^owner] The points under "Decision" follow
from that sentence; how they are carried out is the agent's.

## Context

Every shipped recipe followed one named source that an agent had read in
the session, with amounts as facts and the method in the project's
words; nothing was written from memory. That rule gave recipes that can
be looked up, and it gave old ones: the books without a licence question
are a century old, state sizes like "butter the size of an egg", and
know four countries. Of the 20 recipes of 2026-11-23, eight show
nutrition figures and four name the persons.

## Decision

1. **A shipped recipe may be the project's own.** It is written by an AI
   model from general cooking knowledge and follows no source.
2. **It says so.** Its file has `source: { "own": true, "year": ... }`
   and nothing to cite. Where a source would stand, the app says: a
   recipe of this app, not from a source, written by an AI model; read a
   second time by another AI session; cooked by nobody of the project.
3. **It is complete.** Every line has an amount in the engine's units,
   for a number of persons the recipe states itself; nothing is
   "settled", because there is no source that was vague.
4. **A second agent reads it** that did not write it: proportions, times,
   order, the catalogue ingredients, the wording. `check.method` is
   `second-reader`. This is no substitute for cooking it.
5. **The rule for cited recipes stays**: one named source, read in the
   session, amounts as facts, the method in our words.
6. **Pairings may be the project's judgement too**, marked as such, as
   the rule on sources already allows for a judgement.
7. **Nine more cuisines** have a name in the app: British, Greek,
   Turkish, American, Mexican, Indian, Thai, Chinese, Japanese.

**Note of the same day.** Shown the comparison (own recipes: every line
with an amount, persons stated in all, a time or temperature on 37 % of
the steps; cited ones: 53 %, 8 of 68, 5 %), the owner said: "Then it
fits, if they are more usable anyway", asked for `AGENTS.md` to say so,
and for smaller models where they are capable. `AGENTS.md` now names
own recipes as the way new recipes are written.

## What is lost

- **Nobody can look it up.** A wrong time or amount has no page to be
  checked against; only cooking finds it.
- **A model's knowledge is an average** of what it has read. It gives
  the usual way, not a tested one, and it can be confidently wrong in a
  detail.
- **The rule "no language model in or for the app"** (`AGENTS.md`, "Not
  planned") still holds for the running app; it no longer holds for the
  content, which a model now writes. The app says so on every such
  recipe.

## What follows (agent)

- The format: `source` is a cited source or `{ own, year }`
  ([classic format](../classic-format.md#an-own-recipe)); the copy kept
  in the notebook stores `x-origin` with `own` (`copyClassic`).
- Both apps show the own-recipe lines in the Source section.
- `AGENTS.md` states both kinds.
