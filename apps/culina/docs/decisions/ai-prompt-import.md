---
type: Decision Record
title: Recipes come in through a prompt for the user's own language model
description: Decided by the owner on 2026-11-22. Culina offers a prompt the user gives to a language model of their choice, which turns any recipe (web page, photo, handwritten card) into a small JSON import format; the user pastes the answer, Culina checks it against the schema and matches the ingredients with confirmation. No language model runs in or for Culina. Also, the Cooklang import reads sections as components of a dish.
tags: [decision, import, cooklang]
generated: { by: claude-code/2.1.326, at: 2026-11-22 }
sources:
  - '[^owner]: the owner in the session of 2026-11-22, in German, translated here'
---

# Recipes come in through a prompt for the user's own language model

## Context

With the [recipe app scope](scope-recipe-app.md) the user should start
with recipes and bring their own without upkeep. A website importer as
in Mealie or Tandoor needs a server or the native app (a web app cannot
fetch other sites' pages), and a language model inside Culina breaks the
rule "no language model". The owner proposed: "give the user a prompt
that, through an AI model of their choice, creates a JSON the users can
then import."[^owner] The [Cooklang import](cooklang.md) makes one
component per file and asks per line for target, amount mode and role,
which is too much for many recipes and cannot carry a dish, slots or
alternatives ([exchange](../exchange.md#cooklang)).

## Decision

1. **A prompt generator in the import screen.** A button copies a
   prompt that tells a language model how to write recipes in Culina's
   import format: the schema, the units Culina reads, the roles, and
   the instruction to mark every amount it guessed and to copy no text
   beyond what the recipe states. The prompt is generated from the same
   schema the import checks against, in the app's language.
2. **A small import format, not the export format.** Names and amounts
   as written ("200 g Mehl"), no ids: dish → components → lines, slots
   with alternatives, roles, persons or yield, steps, source, and a flag
   per amount for "guessed". Several recipes in one answer. Culina maps
   names to the notebook and the catalogue with the existing matching
   (`matchIngredients`, `candidateIngredients()`), and the user confirms.
3. **Paste or file.** The user pastes the answer into the import screen
   or chooses a file.
4. **Strict and never silent**, as every import: the answer is checked
   against the schema, each error is one sentence, guessed amounts are
   shown as such, nothing is saved before the user confirms, and Undo
   follows.
5. **No language model runs in or for Culina.** The user picks the
   model and the service; Culina sends nothing anywhere. The rule "no
   language model" in `AGENTS.md` stands.
6. **Cooklang sections become components.** In a `.cook` file, each
   `= Section` (for example `= Teig`, `= Soße`) becomes a component, and
   a file with sections becomes a dish of those components. A file
   without sections stays one component, as now.

## Consequences

- Issues #40 (prompt import) and #41 (Cooklang sections).
- **Built 2026-11-23 (issue 40):** the format is
  `schemas/recipe-import.schema.json` (`culina-recipes`, version 1;
  [exchange](../exchange.md#the-recipe-import-format)); the prompt is generated
  from it in English and German and a test proves they agree; the paste field
  and a `.json` file lead to one step that asks each name once for the whole
  answer, marks guessed amounts, saves every recipe in one transaction and
  offers Undo ([behaviour](../behaviour.md#the-import-screen)). An alternative
  is a component with the slot's role, as in [bases](bases-and-pack.md); the
  source goes into each version's `change`; a guessed amount keeps the word
  "guessed" in its line's note. No source with a size could be read for `EL`,
  `TL`, `Prise`, `Msp.`, `Becher` or `Päckchen`: they stay open, and
  `data/unit-words.json` is the one place to add a size with its source. Not
  proved by tests: what a real model writes for the prompt.
- [Exchange](../exchange.md) and [behaviour](../behaviour.md#export-and-import)
  get the import format, the prompt and the section rule when built.
- What a model gets wrong is the user's to confirm; the app makes
  guesses and errors visible but cannot know a wrong amount the model
  did not mark.
