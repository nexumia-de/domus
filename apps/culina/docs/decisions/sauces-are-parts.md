---
type: Decision Record
title: A sauce is a part, and the Notebook holds what is the user's
description: Decided on 2026-11-23 by the agent, on the owner's word that a decision that was not good may be made anew and that it be done the way that is best. A shipped base that is a sauce (alioli, mayonnaise, two hollandaises, tomato sauce) is no dish and stands with the components only; the Notebook's Dishes list the user's own dishes and no shipped ones, which are on Cook. This changes point 3 of the Cook screen decision as it was read there. What it leaves open.
tags: [decision, dishes, components, bases, notebook, cook]
generated: { by: claude-code, at: 2026-11-23 }
sources:
  - '[^owner]: the owner in the session of 2026-11-23, in German, translated here'
  - id: cook
    title: 'Decision: one Cook screen, three destinations'
    url: cook-screen.md
  - id: bases
    title: 'Decision: what marks a base'
    url: bases-and-pack.md
---

# A sauce is a part, and the Notebook holds what is the user's

**Status: decided by the agent on 2026-11-23, with the owner's leave.**
The owner asked why dishes stand in two places and why alioli is a dish
when "it is only a sauce", and then said: "What was not a good decision
may well be thought over and done differently. Do it the way that is
best."[^owner] Both points below are the agent's, for the owner's
review.

## Context

- The [bases decision](bases-and-pack.md) marks 17 shipped files as
  bases. A base is of two kinds that the mark does not tell apart: a
  frame that is a dish (risotto, minestrone, omelette) and a part that
  goes into dishes (a sauce). No list read the mark, so all 17 stood
  among the dishes; the first row of Cook was "Alioli".
- The [Cook screen decision](cook-screen.md) read the owner's point 3
  ("Notebook = own and shipped components and dishes ... no second
  browse list") as: the Notebook's Dishes hold the shipped dishes too,
  without the filter. With an empty notebook that list and Cook's were
  the same 48 rows.

## Decision

1. **A shipped base whose course is sauce is a part, not a dish**
   (`isDishOfItsOwn`, `packages/engine/src/classics/base.ts`). It is on
   no dish list: not on Cook, not in the finder's question, not in the
   random pick, not in the native app's list (`dishClassics`,
   `packages/app/src/classics/content.ts`). It stays where the kit is:
   in the Components list with its role, with its own screen, its
   source and "Keep in my notebook". When this was decided these were five: alioli,
   mayonnaise, sauce hollandaise, holländische Sauce, salsa di pomodoro,
   and Cook listed 43 dishes. With the recipes added later the same day
   they are 12, and Cook lists 56 of 68.
2. **The kind decides, not the course alone.** A sauce a source gives as
   a dish (no `kind`) stays a dish; there is none today. A base of
   another course (noodles, gnocchi, purée, custard) stays a dish: it is
   cooked and eaten as it is.
3. **The Notebook's Dishes list the user's own dishes only.** No shipped
   rows, no choice of origin. The shipped dishes are on Cook; "Keep in
   my notebook" on a shipped dish brings a copy here. An empty list says
   so and names Cook. The Notebook's Components keep the shipped
   components: that list is the kit, and there is no other place for
   them.

## Rejected

- **Every base out of the dish list.** Risotto, minestrone and the
  omelette are what a cook looks for under "what do I cook".
- **A filter choice "bases".** One more choice on a filter that already
  has too many, for a difference the user did not ask about.
- **Leaving the shipped dishes in the Notebook behind the choice
  "Mine".** The default would still show the same list twice.

## What follows

- Tests: `packages/engine/test/classics-base.test.ts`,
  `packages/app/test/sauce-bases.test.ts` (the real files),
  `test/dishes-notebook-list.test.ts`, `e2e/kit-parts.mjs` (German, the
  real files), `e2e/dish-browse.mjs`, `e2e/components.mjs`,
  `packages/linux/test/session.test.ts`.
- **Open:** a sauce cannot be found from Cook by its name; the search
  there reads dishes only. Whether Cook's search should also offer
  parts is not decided. The bases that are doughs (egg noodles, green
  tagliatelle, gnocchi) stand as dishes with the course their file
  states; nobody looked at each of the 17 for this. The screenshots of
  the Dishes list in `docs/screenshots` are older than this change and
  were not taken again.
- **Not verified:** the native app on a desktop (its tests run without
  GTK); a real phone.
