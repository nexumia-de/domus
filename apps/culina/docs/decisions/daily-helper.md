---
type: Decision Record
title: The daily helper
description: Decided by the owner on 2026-11-27. Culina is a daily helper with two jobs, inspiration and what fits while cooking. A "Cooking now" screen ranks every ingredient by fit with what is in the pan, shown in bands with the reason, not as a number; when to add an ingredient and what the pan still needs come from two tables written by an AI model and marked as the app's judgement; today's ideas, favourites, offers by role and the native app are wanted. Work items are issues 18 to 26 of nexumia-de/domus.
tags: [decision, helper, pairing, taste, inspiration, planning]
generated: { by: claude-code, at: 2026-11-27 }
sources:
  - '[^owner]: the owner in the session of 2026-11-27, in German, translated here'
---

# The daily helper

**Status: decided by the owner on 2026-11-27; extended on 2026-11-28 by
the [daily flow](daily-flow.md)**, which changes today's ideas (issue 23:
no idea from the stock; proven, new but close, in season) and adds issues
38 to 43 under the tracking issue 26.

## Context

The owner cooked rice with a pan of carrots, mushrooms and onions fried
in coconut oil and asked whether the app could say what else fits. It
can, but only inside the dish editor's "Goes with" (eight offers, a dish
must be created first). The owner's idea: "I cook a dish and tick more
and more, and the ingredients are listed ranked by how well they fit. I
search for something and a score shows how well it fits. And then also
when to add it."[^owner] And: "It is meant to be a daily helper: on the
one hand to find inspiration, on the other to find what fits."[^owner]

## Decision

The owner chose, from options put to them:

1. **Fit in bands, not a number.** Strong, some, little, no data, each
   with the reason ("goes with carrot, onion"); the list is sorted by the
   engine's score, which is not shown. A number would suggest a
   precision that shared flavour compounds do not have.
2. **When to add: a stage table written by an AI model**, read by a
   second agent and marked in the app as the app's own judgement, as the
   affinities table and the own recipes are
   ([own recipes](own-recipes.md)).
3. **What the pan still needs: a taste-effect table written the same
   way** (sour, salty, sweet, bitter, umami, hot, fresh, fat; low or
   high). This lifts "waits for a source" of
   [roadmap](../roadmap.md) goal 8 and of the
   [plan](../feel-like-plan.md), item 5, for this use; every row and every
   hint says it is a judgement. The correction checklist from a book on
   the owner's list stays a later, cited source.
4. **Inspiration**: today's ideas on the Cook screen, favourites, offers
   by role, and all of it in the native Linux app too.

## Consequences

- Work items, in order, under the tracking issue
  [26](https://github.com/nexumia-de/domus/issues/26):
  [18](https://github.com/nexumia-de/domus/issues/18) fit in bands (engine),
  [19](https://github.com/nexumia-de/domus/issues/19) "Cooking now",
  [20](https://github.com/nexumia-de/domus/issues/20) stage table,
  [21](https://github.com/nexumia-de/domus/issues/21) taste-effect table,
  [22](https://github.com/nexumia-de/domus/issues/22) offers by role,
  [23](https://github.com/nexumia-de/domus/issues/23) today's ideas,
  [24](https://github.com/nexumia-de/domus/issues/24) favourites,
  [25](https://github.com/nexumia-de/domus/issues/25) native app.
- The rules stand: no language model in the running app, nothing called
  right or wrong, FlavorDB as one data file with its licence, no food
  diary (favourites count nothing).
- Not verified by anyone: that bands, stages or hints match what a cook
  tastes.
