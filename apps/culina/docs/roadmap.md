---
type: Plan
title: Roadmap
description: Goals and their order for Culina under the purpose of 2026-11-23 (open the app and find what to cook, from a building kit); what is built, what is next (frames and fillings, taste profiles), what waits for the owner; work items are GitHub issues of nexumia-de/domus.
tags: [plan, roadmap]
generated: { by: claude-code/2.1.326, at: 2026-11-16 }
---

# How the plan is tracked

This file keeps the goals and their order; work items are
[issues](https://github.com/nexumia-de/domus/issues) of this repository
(the issues of the former repositories nexumia-de/culina and
suitably/domus are closed or stayed there;
[triage](../../../docs/decisions/issue-triage-2026-11-22.md)). The
purpose the goals serve is in the
[building kit decision](decisions/building-kit.md): the user opens the
app and finds quickly what they want to cook or can cook.

# Built

1. **Foundations.** The general model is materia
   ([decision](decisions/shared-model.md)); the data model; the numbers
   in [how chefs work](chef-practice.md) checked against their sources
   ([ratios](ratios.md)); Cooklang decided
   ([decision](decisions/cooklang.md)).
2. **Ratios and components.** Ratio cards with their variations,
   baker's percentages, components with yields, scaling by weight.
3. **Notebook.** Own components and dishes with versions and tasting
   notes, export and import (own JSON, Cooklang, and recipes written by
   the user's own language model from a prompt;
   [decision](decisions/ai-prompt-import.md)).
4. **Stock.** What is there, ticked, with optional state and use-by
   date; what it allows, ranked by urgency and role. Since 2026-11-20
   the stock is the shared collection `stock` of a space and syncs with
   the household's other apps
   ([decision](decisions/stock-in-spaces.md)).
5. **Skills.** Built on 2026-11-19 after the
   [helper build plan](helper-plan.md): technique notes, handling rules
   per ingredient and substitutes with their effect, each with source
   and evidence level; a skill marked as learned is not taught again;
   135 shipped dishes cooked step by step. They are there so that the
   user can learn abilities ([helper](decisions/mentor.md)), no longer
   the app's purpose.
6. **One list, one Cook screen.** Own and shipped dishes in one list
   with one filter (origin, character, course, cuisine, without meat and
   fish, only with every amount)
   ([decision](decisions/one-dish-list.md)); Cook as the one screen with
   "Only with what I have" and "Use up first"
   ([decision](decisions/cook-screen.md)); Swap of a slot's filling and
   the random pick.

# Next, in order

7. **The building kit.** Frames with slots and their fillings (tacos,
   burrito, pizza, bowl, curry, risotto, stir-fry, soup) and more bases
   (sauces, doughs), so that a dish is put together instead of picked
   ([recipe app](decisions/scope-recipe-app.md),
   [bases and the pack](decisions/bases-and-pack.md)). Done so far: 94
   of the 135 shipped files are bases (16 came with the 20 recipes of
   2026-11-23, [selection](classic-selection.md#added-on-2026-11-23-20-recipes-for-the-kit); 50 with the 56 own recipes of 13 cuisines of
   2026-11-24, [own recipes](decisions/own-recipes.md); 6 with the bowl and the soup
   frame, below); none has an alternative.
   Thirteen frames exist since 2026-11-24 (tacos, burrito, a chickpea curry
   plate, a souvlaki plate, a Japanese set meal, miso ramen, a burger
   plate, a rice plate with a stir-fry, a köfte plate, pizza, risotto, a
   rice bowl, a clear soup with semolina dumplings or egg custard),
   composed by the build from the own recipes
   ([format](classic-format.md#a-frame)); seven have a choice of filling
   for a slot, made on the dish screen and in the native app. The bowl
   (rice, a main, a vegetable, a pickle, a sauce, each with a choice)
   and the soup came with six recipes written for them (pan-fried tofu,
   spinach with sesame, edamame, a vegetable broth, semolina dumplings,
   egg custard), each read a second time by another agent. Open here: a
   soup frame of another cuisine with more than one broth (the kit has
   no beef or chicken broth that can be a part), and taking the 31 older dishes
   apart into components. Decided by the owner on 2026-11-23
   ([building kit](decisions/building-kit.md), answers 1 and 2): a
   frame is the project's own composition, each component in it keeping
   its source; the 31 shipped dishes that are no base are taken apart
   into components, and what cannot be goes to the optional pack (the
   import pack of 2026-11-22 has its folder and no dish, and its switch
   is not built). Nothing of this is built yet.
8. **Taste profiles.** A taste profile per ingredient or group, and
   from the profiles of what is in a dish: what it still needs and what
   fits. This goal takes in what was planned apart: the correction
   checklist ("tastes flat, try acid"), suggestions from a tasting
   check, and curated affinities. **What fits** comes from FlavorDB
   (owner, 2026-11-23, [decision](decisions/flavordb.md)), built the
   same day: the data (936 ingredients), its links to the catalogue
   (630 of 720), "Goes with" on the dish screen and, in the dish editor,
   while a dish is put together (a tap adds an offer as a slot). Not
   built: in the native app; offers by role; components as offers. **What a dish still
   needs waits for the owner**: where that data comes from
   ([building kit](decisions/building-kit.md), the open point);
   no data set with a usable licence was found
   ([plan](feel-like-plan.md), item 5), and the correction rules wait
   for a book on the [owner's list](../../../docs/owner-checks.md).
9. **Finding faster.** What the question "what do I feel like" still
   needs without new data ([plan](feel-like-plan.md)): something like
   this dish is built (2026-11-24, "Dishes like this" on a dish page,
   [behaviour](behaviour.md#dishes-like-this)); time in its small form
   was counted and not built (22 of 121 dishes, and the step words cannot
   tell a quick step from a long one; the plan's item 4 stays open for
   the owner). The notebook keeps
   the date a dish was cooked (owner, 2026-11-23:
   [building kit](decisions/building-kit.md), answer 3), built on
   2026-11-24: one day per own dish, set at the end of cooking step by
   step and by "Cooked today", in the export since format 4, and Cook's
   order "Not cooked for long"
   ([behaviour](behaviour.md#the-date-a-dish-was-cooked)). Open for the
   owner: whether cooking a shipped dish keeps a day (now it keeps none).
   Favourites are not built.
   Seasonal produce waits for a source.
10. **Sync of the notebook.** Components, dishes, own ingredients and
    tasting notes, and the user's settings, as collections of a space
    like the stock ([stock in spaces](decisions/stock-in-spaces.md)).
    The three units with a passphrase each of the
    [sync decision](decisions/sync.md) were replaced by spaces
    ([one address, spaces, storages](../../../docs/decisions/one-origin-spaces-storages.md)).
11. **Handing missing ingredients to Emptio.** Decided in the
    [recipe book](decisions/recipe-book.md) record as an offer once
    Emptio exists. Emptio exists since 2026-11-20; nothing is built in
    Culina for it.

# Later

Cost, prep lists and allergens. Their issues in the former repository
were closed as not planned on 2026-11-22
([triage](../../../docs/decisions/issue-triage-2026-11-22.md)); they
stay a goal without a date.

# Not planned

Meal plans, a food diary, a shopping list inside Culina, a language
model in or for the app (`AGENTS.md`).
