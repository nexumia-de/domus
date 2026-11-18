---
type: Decision Record
title: Culina is a scripted kitchen helper that teaches until it is no longer needed
description: Decided by the owner on 2026-11-18. Culina helps its user become a better, independent cook; it teaches by scripts without a language model, from research and textbooks; a skill that is learned is no longer taught; known dishes ship with the app as a source of ideas; the notebook is what remains when the teaching has faded. The source of the dishes and the kitchens to start with are open.
tags: [decision, scope, teaching, skills, classics]
generated: { by: claude-code/2.1.326, at: 2026-11-18 }
---

# Culina is a scripted kitchen helper that teaches until it is no longer needed

## Context

Two sessions had built a notebook, a catalogue and a finder; the
teaching parts (correction checklist, suggestions from a tasting check,
affinities) sat under "Later" in the [roadmap](../roadmap.md). Asked on
2026-11-18 what Culina should stand for, the owner said: it is for the
owner first and perhaps for others; its purpose is to become a better
cook on one's own, with a helper that asks questions and says what to
watch for, so that in the end one cooks without it; the usual problem is
having no idea what to cook, and known dishes are wanted because people
have thought them through, as with the drinks in Mixtura.

## Decision

1. **Purpose.** Culina is the user's helper in the kitchen. It is
   measured by whether the user needs it less over time.
2. **Scripted, no language model.** What the helper asks and says is
   written text and rules in the data and the engine. It works offline
   and needs no server and no key.
3. **From research and textbooks.** Every caution, question and
   explanation names its source: a peer-reviewed paper, a textbook of
   cooking or of food science. Nothing from memory; a statement without
   a source is marked as a judgement, as with the ratios
   ([ratios](../ratios.md)).
4. **A learned skill is not taught again.** Teaching is attached to
   skills (a technique or a judgement, such as searing or correcting
   seasoning), not to dishes. The user marks a skill as learned; from
   then on its teaching is not shown, on any dish, and can be brought
   back by the user. The app may propose, never decide.
5. **Known dishes ship with the app.** They answer "what can I cook"
   for a user without own recipes, built from components and ratios so
   that the structure shows. This adds to the
   [recipe book decision](recipe-book.md); scraping stays excluded.
6. **The notebook is where it ends.** With every skill learned the app
   is the notebook, the ratios and the finder. These stay as built.

7. **Substitutes with their effect.** Wherever an ingredient is named
   the app can offer what replaces it, each with what changes (taste,
   texture, amount, handling), as in the owner's example: butter by
   oil, with the direction the taste takes. A substitute is reference
   knowledge, not teaching: it is always offered and does not fade.
8. **Handling of an ingredient.** When an ingredient goes into the dish
   and how it is treated, with the reason; the owner's examples: toast
   tomato paste first, pepper late, when spices go in. Such a rule
   hangs on the ingredient or its group, so it shows on every dish that
   uses it, shipped or own, and it belongs to a skill, so it fades
   under point 4. The owner's examples are examples of the kind, not
   data: each rule ships only with a source under point 3.

## Open

- Where the known dishes come from and how many (ingredient lists and
  ratios cited as facts, method text written here), and the owner's
  review of the list before it is built.
- Which kitchens to start with.
- Sources under an open licence: the BC Cook Articulation textbooks
  (opentextbc.ca) are refused by the session's network (HTTP 403 on
  2026-11-18); see [development](../development.md).

## Consequences

- The correction checklist (issue 25) and suggestions from a tasting
  check (issue 66) move from "Later" to the next goal in the
  [roadmap](../roadmap.md).
- A skill and its state are new entities for the
  [data model](../data-model.md); the state is personal and belongs to
  the profile in the [sync decision](sync.md).
- Substitutes with an effect extend what the finder already does with
  substitutes ([engine rules](../engine-rules.md#what-the-stock-allows));
  handling rules are a new entity keyed by ingredient or group.
- The catalogue, stock and import get no further growth beyond the role
  table that lets ratio cards and shipped dishes match the catalogue.
