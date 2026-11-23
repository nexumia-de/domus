---
type: Decision Record
title: Culina is a scripted kitchen helper that teaches until it is no longer needed
description: Decided by the owner on 2026-11-18. Culina helps its user become a better, independent cook; it teaches by scripts without a language model, from research and textbooks; a skill that is learned is no longer taught; known dishes ship with the app as a source of ideas; the notebook is what remains when the teaching has faded. Dishes come by country, starting with Germany, Italy, France and Spain; every statement is marked studied, textbook or tradition.
tags: [decision, scope, teaching, skills, classics]
generated: { by: claude-code/2.1.326, at: 2026-11-18 }
---

# Culina is a scripted kitchen helper that teaches until it is no longer needed

**Note of 2026-11-23:** the purpose that holds is in the
[building kit decision](building-kit.md). Of this record the skills
stand, so that the user can learn abilities (points 2 to 4), with
substitutes (point 7) and handling rules (point 8). The three levels of
point 3 are five since 2026-11-19 (`studied`, `textbook`, `tested`,
`authority`, `tradition`; [data model](../data-model.md#evidence-levels)).

**Note of 2026-11-22:** the purpose of point 1, the end point of
point 6 and the four stages of point 9 are replaced by the
[recipe app decision](scope-recipe-app.md): Culina is a recipe app with
history, ideas and bases to build on. The rules on sources, teaching
notes, learned skills, substitutes and handling stand as help.

**Note of 2026-11-21:** the known dishes of point 5 still ship with their
country and their source. They are no longer shown by country in lists
and screens of their own: they are part of one list with the user's
dishes, and their country is a cuisine in its filter
([one dish list](one-dish-list.md)). The start screen of point 9 asks what
to cook over that one list. The rest of this record stands.

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
3. **From research and textbooks, read by us.** Every caution, question
   and explanation names its source and is written in our own words;
   a source's text is never copied. Each statement carries one of
   three levels: **studied** (a peer-reviewed paper measured it),
   **textbook** (a textbook of cooking or food science states it) or
   **tradition** (kitchens do it; no test was found). Nothing from
   memory. A first trial on 2026-11-18 with the owner's three examples
   gave one of each kind of outcome, and corrected a claim made from
   memory (pepper loses pungency as well as aroma when cooked long).
4. **A learned skill is not taught again.** Teaching is attached to
   skills (a technique or a judgement, such as searing or correcting
   seasoning), not to dishes. The user marks a skill as learned; from
   then on its teaching is not shown, on any dish, and can be brought
   back by the user. The app may propose, never decide.
5. **Known dishes ship with the app, by country.** Traditional dishes
   as full recipes: ingredients with amounts, steps, and the one source
   each follows; amounts are taken from the source, the method is in
   our own words, and an amount the source leaves vague is marked as
   settled by us. A shipped dish is a starting version; what the user
   cooks from it is their version in the notebook, and the app never
   claims the one true recipe. The first countries are Germany, Italy,
   France and Spain. This adds to the
   [recipe book decision](recipe-book.md); scraping stays excluded.
   Each step names the technique it uses. The explanation of a
   technique (what to watch for, why, the source) is written once per
   technique and shown in every recipe that uses it, until the user
   marks the skill as learned (point 4).
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

9. **Four stages, and no overload.** Follow (cook a classic step by
   step), understand (its components, ratio and substitutes), vary
   (change, taste, correct, keep a version), free (ratios, components,
   what is there: the app as first built, which is what a chef needs
   and where the user is to arrive). The user moves per dish and per
   skill; the app proposes and never switches. One thing on the screen
   at a time; the start screen asks what to cook.
10. **Sources of dishes.** Old public-domain books, institutions, and
    one good modern recipe per dish, read by hand, named, amounts as
    facts and the method in our own words. The owner called the rule
    "no scraping of recipe sites" obsolete; what stays is that no text
    is copied and no site is imported in bulk.
11. **Content in English and German**, 2 portions by default, mostly
    vegetarian with nothing excluded, nutrition values per portion
    ([evaluation](../nutrition-evaluation.md)).

The order of the work, the data and who does what:
[helper build plan](../helper-plan.md).

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
