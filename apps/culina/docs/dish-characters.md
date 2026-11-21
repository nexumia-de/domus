---
type: Research
title: Dish characters computed from the recipe, feasibility and sense
description: Whether characters of a dish such as tomatoey, creamy or fried can be computed from its ingredients, amounts and techniques instead of tagged by hand, for a finder "what do I feel like"; what the data carries today (measured on the 48 shipped classics), which characters are reliable, which are judgements, what is missing, and the recommendation.
tags: [research, finder, characters, dishes, components, catalogue, techniques]
generated: { by: claude-code/2.1.326, at: 2026-11-21 }
sources:
  - id: classics
    title: 'The 48 shipped classics, `packages/app/data/classics/`, read by a script on 2026-11-21'
  - id: catalogue
    title: 'The ingredient catalogue, `packages/app/data/ingredient-catalogue.json` (681 entries)'
  - id: pr11
    title: 'Pull request 11: swap the filling of a slot, and a random pick of a dish (open on 2026-11-21)'
    url: https://github.com/suitably/domus/pull/11
---

# Dish characters computed from the recipe

Asked by the owner on 2026-11-21: finding a recipe by what one feels
like. The idea, noted as "proposal not written yet" in the root log: a
base (tacos) and then **characters** such as tomatoey or creamy, computed
from parameters of the dish and its components, not tagged by hand. No
code existed for it; this is the analysis.

**Result in short:** feasible and sensible for characters led by an
ingredient or a technique; a judgement with visible misses for
sensations (creamy, light, hearty); not computable for cuisine and
occasion. Recommended: compute the first two kinds, three or four
sensations by explicit rules, a user override, and two hand-set fields.

## Why computed fits the app

- A dish is slots filled by components. With the swap of a filling
  ([behaviour](behaviour.md), pull request 11[^pr11]) one base has many
  forms. A hand tag sits on the record and is wrong after a swap; a
  computed character follows the filling. This is the case of tacos with
  a different filling each time.
- The model derives what it can (weights, open roles, nutrition) and
  stores little ([data model](data-model.md)). Characters derived at
  read time need no stored field, no migration and no sync.
- No language model is needed: a rule is a table row plus a threshold.

## What a rule can read

| Parameter                         | Where                                                        | State                                                                                |
| --------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Which ingredients, with ancestors | lines and slots, the tree of the catalogue                   | there; `fdc-group-tomatoes`, `-cheese`, `-cream`, `-milk`, `-butter`, `-egg` exist   |
| Mass of each line                 | the walk of `dishNutrition` (`src/nutrition/dish.ts`)        | there, with a list of lines not counted                                              |
| Fat, energy per portion           | `dishNutrition`                                              | there                                                                                |
| Technique of each step            | steps ([data model](data-model.md#steps))                    | there on every shipped dish; on the user's own steps only where a technique is named |
| Roles of ingredients              | the role table ([data model](data-model.md#roles))           | 23 entries, ratio and dish roles only                                                |
| Role of a slot, state of a line   | dish slots, `raw`, `cooked`, `prepared`                      | there                                                                                |
| Meat, fish, poultry               | nothing: the catalogue has no such entry                     | **missing**                                                                          |
| Heat, sourness, taste effects     | nothing; taste effects are out of scope of the finder so far | **missing**                                                                          |

## Measured on the shipped classics

A script read the 48 classics[^classics] against the catalogue[^catalogue]
(rough unit conversion of its own, not the engine's; the script is not
kept). Of 417 ingredient lines:

| Lines | State                                                                                 |
| ----- | ------------------------------------------------------------------------------------- |
| 185   | an ingredient of the catalogue and an amount (113 measured, 72 counted)               |
| 150   | an ingredient of the catalogue, no amount (the source says "salt", "a little butter") |
| 75    | no catalogue ingredient: every meat and fish, water, several herbs, "tomato sauce"    |
| 7     | a component                                                                           |

What follows:

- **Presence works, share by mass does not on these dishes.** 342 of 417
  lines name a catalogue ingredient, so "contains tomato" is known for
  82 percent of the lines; a share by mass rests on 44 percent and
  misleads (an omelette came out as 100 percent dairy because only its
  butter had an amount). The user's own components are entered by weight
  or percent, so there a share is far better founded; the shipped dishes
  after 19th-century books are the worst case.
- **Tomatoey by share is right where the data is there**: gazpacho 67
  percent, salsa di pomodoro 97 percent, nothing else above zero. It
  misses minestrone and stracotto, whose "tomato sauce or paste" is one
  of the 75 unlinked lines.
- **Techniques are complete**: fried, baked, braised, cold come out for
  every dish (tortilla de patatas: pan-fry; sauerbraten: marinate, sear,
  braise; gazpacho: no heat).
- **Dairy alone is not creamy**: Napfkuchen has 34 percent milk and
  butter and is a cake; cauliflower with béchamel (roux and milk) and
  crema cotta are creamy. The rule needs the technique beside the
  ingredient.
- **Meaty and fishy cannot be computed**: the catalogue has no meat or
  fish, and the classics carry `vegetarian` set by hand.

Not verified: the engine's own conversion (the script's was rough), any
dish of a user, any rule on a real notebook.

## Three kinds of character

| Kind           | Examples                                                         | Rule                                                                                                            | Reliability                                                                                           |
| -------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Ingredient-led | tomatoey, cheesy, eggy, mushroomy, garlicky, lemony, with meat   | an ingredient group present, above a threshold of its own where amounts are there                               | good; the threshold is a judgement per character (1 percent garlic counts, 1 percent tomato does not) |
| Technique-led  | fried, baked, braised, cold, soup                                | a technique of a step, or the course                                                                            | good where steps name techniques                                                                      |
| Sensation      | creamy, crisp, rich, light, hearty, spicy, fresh                 | several signals joined: creamy = cream, or roux with milk, or an emulsion, or a starch purée, and not baked dry | a judgement; misses are visible to the user                                                           |
| Not computable | cuisine or country, occasion, "quick", "for guests", a favourite | none                                                                                                            | hand-set or from use                                                                                  |

Rich and light are the one sensation with numbers: fat and energy per
portion from `dishNutrition`, shown with what was not counted.

## Sense

- **For**: follows swaps and versions without work; one table serves
  the user's dishes and the classics; fits "derived, not stored" and "no
  language model"; gives the random pick and "What can I cook" something
  to narrow by besides stock.
- **Against**: a notebook of 20 dishes is searched by name faster than
  filtered; every sensation rule is a judgement that will be wrong on
  some dish and then costs trust; the table is new data to keep
  (character, groups, threshold, basis), like the role table.
- **Rule of the app**: every statement names a source or is marked as a
  judgement. Every row of the character table is a judgement and says
  so in `basis`, as the role table does.
- **A wrong character must be correctable**: the user removes or adds a
  character on a dish. That is the one stored field (`characters:
{ add, remove }` on the dish), and it is a hand tag after all, only
  as the exception.

## Recommendation

1. **Build the engine function first**: `dishCharacters(dish, components,
ingredients, table)`, pure, on the walk `dishNutrition` already has,
   with the lines it could not judge listed. Vectors as for the finder.
2. **Start with about 12 characters** of the two reliable kinds, and
   creamy, crisp, rich and light as the only sensations. Presence
   decides; a share only raises or drops a character where at least
   half of the dish's mass was counted.
3. **Before the data table**: add meat, fish and poultry groups to the
   catalogue (also needed for "without meat and fish" on the user's own
   dishes) and link the 75 lines where an entry exists.
4. **Hand-set, not computed**: cuisine and course on the user's own
   dishes, the fields the classics already have.
5. **Screens**: characters as quiet chips on a dish; a filter on the
   Dishes list, in Cook and in the random pick. The override in the
   dish editor.
6. **Not now**: heat, sourness and other taste effects (no data),
   "quick" (no times in the model), favourites.

Order: pull request 11 first (the swap makes the base with many forms),
then 3, 1, 2, 5, 4.

## What was built

On 2026-11-21, by the owner's word "build it so":

- Step "order" first: the swap of a filling (pull request 11) is merged.
- Step 3: 26 raw meats, poultry, fish and shellfish are named foods of the
  [catalogue](ingredient-catalogue.md#named-foods); 8 lines of the classics
  point at them. The counts above are those before this. Counts of
  2026-11-21 after linking (the beef of the Frikandelle to the beef
  group, a ninth line): of the same 417 lines, 344 name a catalogue
  ingredient (192 with an amount, 152 without), 66 are `wanted` (34
  water, 32 other) and 7 a component; per dish in
  [classic dishes](classic-dishes.md#the-48-shipped-dishes-against-the-catalogue-2026-11-21).
- Steps 1 and 2: the engine function
  ([engine rules](engine-rules.md#characters)) and a table of 18 characters
  (`packages/app/data/dish-characters.json`): tomatoey, cheesy, eggy,
  mushroomy, garlicky, lemony, spicy, sweet, with meat, with fish, fried,
  from the oven, braised, uncooked, creamy, crisp, rich, light. Run over
  the classics the first table called minestrone cheesy (cheese on top),
  gazpacho creamy (an emulsion), sauerbraten fried (seared) and a boiled
  dinner light (its meat had no amount); the rules were narrowed for each,
  and a test pins them.
- Step 5 in part: chips on a dish and on a classic, the filter of the
  Dishes list ([behaviour](behaviour.md#characters)).

Open, each an issue: the filter in Cook and in the random pick; the user's
correction of a character; cuisine and course on the user's dishes.

[^classics]: `packages/app/data/classics/`, 12 dishes each for Germany, Italy, France and Spain.

[^catalogue]: [Ingredient catalogue](ingredient-catalogue.md).

[^pr11]: https://github.com/suitably/domus/pull/11
