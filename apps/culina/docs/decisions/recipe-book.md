---
type: Decision Record
title: Your own recipe book, a finder from what is there, and what stays outside
description: Decided by the owner on 2026-11-18. Culina holds the user's own recipes as components and dishes with versions and finds what the kitchen allows; no scraping, no meal plans, no shopping list (that is the planned sister app emptio); stock is ticked by default with the detailed fields optional; data in English with German supported and the language following the device.
tags: [decision, scope, stock, language, emptio]
generated: { by: claude-code/2.1.326, at: 2026-11-18 }
---

# Your own recipe book, a finder from what is there, and what stays outside

**Note of 2026-11-21:** the finder of point 3 no longer looks at own
dishes alone. Own and shipped dishes are one list with one filter, and the
finder uses that filter ([one dish list](one-dish-list.md)). The rest of
this record stands.

## Context

The rule "Not a recipe manager" was written before the notebook existed.
With the editor, versions, the ingredient catalogue and the import, the
owner described on 2026-11-18 what the app is for: it is of no use empty;
recipes are kept as a history; the usual moment is standing in the
kitchen without knowing what to cook. Asked whether that makes Culina a
recipe book after all, the owner decided the points below.

## Decision

1. **Your own recipe book.** Recipes are components and dishes with
   versions; an imported recipe is version 1 and every change is a new
   version with its tasting notes. The rule in `AGENTS.md` now reads:
   "Your own recipe book: recipes are components and dishes with
   versions. No scraping of recipe sites and no meal plans; those exist
   in Mealie, Tandoor and Grocy. No shopping list inside Culina: that is
   the planned sister app emptio; Culina only offers to hand missing
   ingredients to it."
2. **Filled without upkeep.** What ships comes from sources by script
   (the [ingredient catalogue](../ingredient-catalogue.md), the ratio
   cards); the user's own recipes come in through the import, which
   matches ingredients that exist instead of creating new ones.
3. **The finder comes next** (goal 4), before sync: say what is there,
   see which own dishes and components it covers, substitutes included,
   and what the ratio cards allow without a recipe.
4. **Stock is ticked by default**: presence only. Amount, state, date
   prepared and use by stay in the data model as optional fields and are
   not removed.
5. **Stock is built to be shared**: on materia's stock model, so that it
   can sync later (then goal 5 of the roadmap; built on 2026-11-20 as
   [stock in spaces](stock-in-spaces.md)) and so that another app can add to it. The
   planned shopping list app emptio will offer to add bought items to
   the same stock, which may fill the optional fields without manual
   upkeep. **Nothing is built for emptio now.**
6. **Language**: English is the canonical language of data and code;
   German is supported on top (issue 69). The app follows the device's
   language, switchable in Settings. Mixtura and emptio are to behave
   the same way, so the language choice stays simple enough to repeat
   there.
7. **Suggestions from a tasting check** (issue 66) are wanted; they
   rest on the correction checklist, the affinities and the stock.

## Consequences

- Issues 20 and 22 follow points 4 and 5.
- Handing missing ingredients to emptio is an offer on the finder's
  screen once emptio exists; until then there is no such control.
- [Roadmap](../roadmap.md) keeps the order of its goals; within goal 3
  the catalogue (issues 64, 68) and German (issue 69) were added.
