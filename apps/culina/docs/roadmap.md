---
type: Plan
title: Roadmap
description: Goals and their order for Culina under the daily flow of 2026-11-28 (get better and more varied, no inventory but the staples) and the purpose of 2026-11-23 (open the app and find what to cook, from a building kit); the lanes of the daily flow, what is built, what is next, what waits for the owner; work items are GitHub issues of nexumia-de/domus.
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
app and finds quickly what they want to cook or can cook; since
2026-11-28 inside the [daily flow](decisions/daily-flow.md): the user
wants to get better at cooking and more varied, and keeps no inventory
but the staples.

# The daily flow, next

Decided on 2026-11-28 ([daily flow](decisions/daily-flow.md)); tracking
issue [26](https://github.com/nexumia-de/domus/issues/26). Lanes that
can be worked on at the same time:

| Step of the flow          | Issues                                                                                          | Goal below |
| ------------------------- | ----------------------------------------------------------------------------------------------- | ---------- |
| Today: three ideas        | 23 today's ideas (proven, new but close, in season), 41 season table                            | 9          |
| I have / Cooking now      | 19 the screen, 20 when to add, 21 what it still needs, 22 offers by role, 38 what it can become | 8          |
| One learning point a dish | 42                                                                                              | 5          |
| After cooking             | 43 the day for every dish and how it was                                                        | 9          |
| Staples, no inventory     | 39 set up once, 40 gone onto the list and back when bought                                      | 4          |
| Native app                | 25, last                                                                                        | 8          |

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
   ([decision](decisions/stock-in-spaces.md)). Since 2026-11-28 the daily
   flow keeps no inventory ([daily flow](decisions/daily-flow.md)): dated
   stock and "Use up first" stay as built and are not developed further;
   the staples (set up once, issue 39; gone onto the shopping list and back
   when bought, issue 40) are the one stock the flow reads.
5. **Skills.** Built on 2026-11-19 after the
   [helper build plan](helper-plan.md): technique notes, handling rules
   per ingredient and substitutes with their effect, each with source
   and evidence level; a skill marked as learned is not taught again;
   135 shipped dishes cooked step by step. They are there so that the
   user can learn abilities ([helper](decisions/mentor.md)), no longer
   the app's purpose. Next: one learning point per dish, the first
   technique of its steps not yet learned (issue 42,
   [daily flow](decisions/daily-flow.md)).
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
   **Decided on 2026-11-27** ([daily helper](decisions/daily-helper.md)):
   a "Cooking now" screen ranks every ingredient by fit in bands, when to
   add and what the pan still needs come from two tables written by an AI
   model and marked as judgement, and offers by role and the native app
   follow; issues 18 to 22 and 25 under the tracking issue 26. Fit in
   bands is built (issue 18). **Added on 2026-11-28**
   ([daily flow](decisions/daily-flow.md)): "Cooking now" is also the
   "I have" step, nothing ticked is written to the stock, and what the
   ticked ingredients can become is issue 38.
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
   Favourites are built (2026-11-27, issue 24): a star on the page of every
   dish, own or shipped, "Favourites only" in the one dish filter, Cook's
   order "Favourites first", in the export since format 5
   ([behaviour](behaviour.md#favourites)). **Next, decided on 2026-11-28**
   ([daily flow](decisions/daily-flow.md)): today's ideas without any
   input, proven, new but close, in season, and none from the stock
   (issue 23); a season table written by an AI model and marked, for
   Germany (issue 41); shipped dishes keep the day they were cooked and
   every dish a short verdict, the latest only (issue 43), which answers
   the owner's question above.
10. **Sync of the notebook.** Components, dishes, own ingredients and
    tasting notes, and the user's settings, as collections of a space
    like the stock ([stock in spaces](decisions/stock-in-spaces.md)).
    The three units with a passphrase each of the
    [sync decision](decisions/sync.md) were replaced by spaces
    ([one address, spaces, storages](../../../docs/decisions/one-origin-spaces-storages.md)).
11. **Handing missing ingredients to Emptio.** Decided in the
    [recipe book](decisions/recipe-book.md) record as an offer once
    Emptio exists. First step built on 2026-11-24, below the screens: the
    list's entry and rules moved out of Emptio into the shared
    [list package](../../../packages/list/docs/index.md) (name provisional); the engine reads
    what a dish lacks (`lackingLines`), the app writes it into the
    collection `list` of the used space with Undo (`handOver`), and the
    loops sync `list` with `stock`
    ([behaviour](behaviour.md#handing-what-a-dish-lacks-to-the-shopping-list)).
    Second step built on 2026-11-24, the screen in the web app: on the
    page of a shipped dish or frame, under the ingredients, one quiet
    line with how many ingredients the stock lacks and a confirmation in
    place (lines with amounts, free names unticked, the space when there
    are several, a word when the list could not be synced), then a
    message with Undo and a link to Emptio
    ([behaviour](behaviour.md#the-offer-on-a-dishs-page)); no offer with
    an empty stock; the code and the usual items load with the
    confirmation (`hand-over.js`). Left: the offer for own dishes (the
    finder reports them only at their stored portions, without swaps);
    the screen in the native Linux app; the page closing right after a
    hand-over can still lose it (list orderings). Open for the owner: the name of
    the package; the two weaknesses of rule 5 a hand-over meets
    ([rules](../../../packages/list/docs/rules.md#open-weaknesses)); what a dish handed again
    at other portions should do (now: `already`, the first amount
    stays, the result gives both amounts); which space's list a
    hand-over goes to when Culina and Emptio use different spaces (now:
    Culina's, and the result names it); the same frame handed again
    with another filling (now another dish: its lines join the open
    entries, where "instead" is probably meant); pieces without a word
    for the thing's form (garlic "6 pcs": cloves or heads); whether an
    empty stock should offer the whole dish after all (now: no offer);
    whether the link to Emptio should open in the same tab, as the
    links to the Household app do (now: a new tab, so Undo stays);
    whether own dishes get the offer once the finder can report them
    at the portions and swaps of their page (now: shipped dishes and
    frames only); whether the offer should read the list on every draw
    (now: it counts only what the page itself put on it).

# Later

Cost, prep lists and allergens. Their issues in the former repository
were closed as not planned on 2026-11-22
([triage](../../../docs/decisions/issue-triage-2026-11-22.md)); they
stay a goal without a date.

# Not planned

Meal plans, a food diary, a shopping list inside Culina, a language
model in or for the app (`AGENTS.md`).
