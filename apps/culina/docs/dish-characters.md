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

The user's correction of a character was built on 2026-11-22
([behaviour](behaviour.md#characters), issue 27 of suitably/domus): ticks
in the dish editor, stored as `characters: { add, remove }`.

Since 2026-11-21 the filter in Cook and in the random pick, and cuisine and
course on the user's dishes, are part of the
[one dish list](decisions/one-dish-list.md): one filter with the
character among its choices, over own and shipped dishes, used by the
lists, the start screen, Cook and the random pick. The base is built; the
screens are being built on 2026-11-21. What the question "what do I feel
like" needs beyond it is in the [plan](feel-like-plan.md).

## Every shipped dish read as a cook would (2026-11-21)

Since the characters filter every dish ("what do I feel like"), a wrong
character shows a dish where it does not belong and an absent one hides it.
All 48 shipped dishes were run through the table (a throwaway vitest script,
not kept) and every row read against the dish: each claim plainly not true,
each plain miss. The rules were changed in general terms, never for one
dish; each change is pinned by named dishes in `test/characters.test.ts`
("shipped dishes, the rules of 2026-11-21") and the new conditions by
hand-computed cases in the engine's `test/characters.test.ts`.

What the reading found first: no egg line of any shipped dish had a mass.
The egg groups (`fdc-group-egg-whole`, `-yolk`, `-white`) state no unit
weight, so "6 eggs" did not convert and eggy, which needs a share, was said
of no dish; the omelette was only "fried".

| Change                                                                       | General statement                                                                                                                                         | Dishes it changed                                                                                                  | Pins (and controls)                                                                              |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Mass of a group line ([engine rules](engine-rules.md#characters))            | a group without its own figure takes the one every food below it agrees on; foods that disagree give none                                                 | egg lines now weigh 44, 17 or 33 g a piece; eggy now on 8 dishes                                                   | omelette, soufflé, crema cotta, crème caramel, oeufs à la neige (torta, gratin, Frikandelle not) |
| Fried: batter counts                                                         | a batter is a coat for frying (the technique's source is the chapter on frying)                                                                           | + fritto di finocchi                                                                                               | fritto di finocchi                                                                               |
| Fried: never a soup or a sauce (`unless` by course)                          | frying in a soup is a first step before the liquid, not what the dish is                                                                                  | − potato soup                                                                                                      | potato soup (tortilla, Eierkuchen stay fried)                                                    |
| Creamy: milk bound by roux, egg or starch, unless the dish bakes             | the oven sets it (soufflé, cake); browning a gratin is not baking                                                                                         | − Parmesan soufflé                                                                                                 | soufflé (cauliflower with béchamel stays, Napfkuchen not)                                        |
| Creamy: a cold emulsion of oil bound by egg yolk                             | the yolk is what makes it thick                                                                                                                           | + mayonnaise, alioli                                                                                               | mayonnaise, alioli (gazpacho not: no yolk)                                                       |
| Creamy: potatoes or rice cooked (baked, boiled, simmered) with milk or cream | their starch binds the milk                                                                                                                               | + gratin dauphinois, baked potatoes with cheese                                                                    | both                                                                                             |
| Cheesy: cheese in a baked or gratinated dish counts without amounts          | cheese baked into or onto a dish is what one tastes; grated over soup it is not                                                                           | + baked potatoes with cheese, gratin dauphinois, cauliflower with béchamel (soufflé by its share, now known: 0.30) | the first two and soufflé (minestrone, risotto not)                                              |
| Garlicky: garlic in a dish where no step uses heat counts without amounts    | raw garlic is far stronger than cooked                                                                                                                    | + alioli                                                                                                           | alioli (tomato sauce with one clove not)                                                         |
| Sweet: sugar, honey or syrup in a dish of the course dessert or baking       | a dessert or a cake with sugar is sweet                                                                                                                   | + 10 desserts and cakes                                                                                            | crème caramel, apples in butter, Napfkuchen (pea soup with 5 g sugar not)                        |
| Rich: a warm emulsion, or a cold emulsion of oil bound by egg yolk           | an emulsion of fat is mostly fat by what it is                                                                                                            | + both hollandaises, mayonnaise, alioli                                                                            | mayonnaise, hollandaise (gazpacho not)                                                           |
| Tomatoey: canned tomato sauce and paste count as tomato                      | the catalogue now has them (`fdc-group-tomato-products-canned`) and the three Italian dishes link them; paste is concentrated, so its share counts it low | + gnocchi, minestrone, stracotto                                                                                   | gnocchi, stracotto (risotto not)                                                                 |

Counts per character over the 48 dishes:

| Character     | Before | After | Dishes after                                                                                                                                                                                                                                             |
| ------------- | -----: | ----: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| tomatoey      |      3 |     6 | gazpacho, gnocchi, minestrone, pollo alla contadina, salsa di pomodoro, stracotto                                                                                                                                                                        |
| cheesy        |      0 |     4 | baked potatoes with cheese, gratin dauphinois, Parmesan soufflé, cauliflower with béchamel                                                                                                                                                               |
| eggy          |      0 |     8 | huevos amerengados, crème caramel, oeufs à la neige, omelette, sauce hollandaise, Parmesan soufflé, crema cotta, latte brulé                                                                                                                             |
| mushroomy     |      1 |     1 | poulet bourguignonne                                                                                                                                                                                                                                     |
| garlicky      |      0 |     1 | alioli                                                                                                                                                                                                                                                   |
| lemony        |      0 |     0 |                                                                                                                                                                                                                                                          |
| spicy         |      0 |     0 |                                                                                                                                                                                                                                                          |
| sweet         |      1 |    11 | Napfkuchen, rote Grütze, crema de chocolate, flan, huevos amerengados, crème caramel, oeufs à la neige, apples in butter, crema cotta, latte brulé, torta mantovana                                                                                      |
| with meat     |      7 |     7 | Frikandelle, Sauerbraten, cocido, pot-au-feu, poulet bourguignonne, pollo alla contadina, stracotto                                                                                                                                                      |
| with fish     |      1 |     1 | marinated herring                                                                                                                                                                                                                                        |
| fried         |      6 |     6 | Eierkuchen, Frikandelle, tortilla, omelette, fritto di finocchi, pollo alla contadina                                                                                                                                                                    |
| from the oven |      9 |     9 | baked potatoes with cheese, Frikandelle, Napfkuchen, flan, gratin dauphinois, apples in butter, Parmesan soufflé, cauliflower with béchamel, torta mantovana                                                                                             |
| braised       |      2 |     2 | Sauerbraten, stracotto                                                                                                                                                                                                                                   |
| uncooked      |      4 |     4 | marinated herring, alioli, gazpacho, mayonnaise                                                                                                                                                                                                          |
| creamy        |     12 |    15 | baked potatoes with cheese, Holländische Sauce, Milchsuppe, Sauerbraten, alioli, huevos amerengados, puré de patatas, sopa de leche, gratin dauphinois, mayonnaise, oeufs à la neige, sauce hollandaise, cauliflower with béchamel, crema cotta, risotto |
| crisp         |      2 |     2 | cauliflower with béchamel, fritto di finocchi                                                                                                                                                                                                            |
| rich          |      0 |     4 | Holländische Sauce, alioli, mayonnaise, sauce hollandaise                                                                                                                                                                                                |
| light         |      0 |     0 |                                                                                                                                                                                                                                                          |

Dishes with no character after: egg noodles, Kartoffelklöße, potato soup,
arlequín de judías, guisantes, potaje, haricots verts au beurre, potage aux
pois, tagliatelle verdi (9; before: 13).

**Left as they are, and why.** Each is a judgement of this reading:

- **Not eggy, though one might say so.** The tortilla: by its source's
  amounts egg is 9 percent of the mass (4 eggs to 3 lb of potatoes and 2 cups
  of frying oil), a potato dish bound by egg; the test pins this as the rule's
  answer, the doubt is the owner's. Eierkuchen, crema de chocolate and the
  German hollandaise: too few lines have a mass (the milk group states no
  density, since its foods range from 0.29 to 1.07 g/ml), so nothing is said.
  The flan: its pastry (1 l of flour) brings egg to 0.18 of the dish.
- **Eggy by a share that rests on little.** Crème caramel comes to 0.68
  because its milk has no amount in the source; the answer is right, the
  number is not the dish's. Sauce hollandaise is eggy at 0.21: an egg-yolk
  sauce, accepted.
- **Misses the data cannot reach.** Minestrone is not "with meat": its
  boiled meat, ham and broth are `wanted` lines without a catalogue entry.
  (Its tomato sauce now links the canned tomato products, so it is tomatoey
  by presence: the amount is not given, a doubt for a soup where tomato is
  one of many.) Milchsuppe
  and sopa de leche are sweet milk soups, but a soup is not a dessert and
  their sugar share is not judged (too few lines measured); a sweet soup rule
  would also catch the pea soup's 5 g.
- **Disputed, not plainly false.** Sauerbraten is creamy by its gravy (cream
  and milk bound by a roux): the rules cannot tell the sauce from the dish.
  Set custards (crème caramel, latte brulé, crema de chocolate) are not
  called creamy: smooth but set, a matter of taste. Poulet bourguignonne is
  simmered in wine and not called braised. The omelette is "fried" (cooked in
  butter in the pan). Cauliflower with béchamel is cheesy by its Parmesan
  crust.
- **Not judged at all.** Light and rich by figures: the groups carry no
  USDA figures and few shipped dishes have four of five lines measured, so
  no shipped dish reaches them; rich now comes from emulsions only. Lemony,
  spicy and other taste effects: no dish is plainly lemony or hot, and the
  data has no measure of acidity or heat, so nothing is guessed.
- **A dish of the notebook** states no course yet, so the course clauses
  (sweet by course, fried not in a soup) do not hold for it; its shares are
  far better founded (amounts by weight). `factsOfDish` reads a course as
  soon as the record has one.

**Without meat and fish on a dish of the notebook** (from a review the
same day). It was derived from the characters "with meat" and "with fish"
and said "meat-free" whenever every line had some food category, without
asking which: a dish of tomato and lard was meat-free, because USDA files
lard, tallow, bacon grease, poultry fats and the fish oils under Fats and
Oils. It is now its own judgement (`src/characters/meat-free.ts`), apart
from the characters (lard does not make a sauce "with meat"), with its own
list `meatAndFish` in the table: the six meat, poultry and fish categories
and the animal foods outside them, found by reading every catalogue entry on
2026-11-21 (fat group, lard, bacon grease, fish oils, two shortenings with
lard or tallow; no gelatine, broth, extract, anchovy or fish sauce exists).
A test scans the catalogue by name so a new animal food outside the list
fails. When in doubt it says "not known", which the filter leaves out: a
line naming a group with an animal food below it ("shortening"), an
ingredient nobody knows, a slot whose component is gone or empty. Two
defects of the facts were fixed with it: a component nested without amount
in a component whose slot has an amount lost all its ingredients (a pasta
with a beef ragù was meat-free and had no character), and a gone or empty
component counted as nothing. A group without a category of its own
(butter, peas, beans) is now known by its foods, so a dish with butter is
no longer left out for that. What it cannot know is in
[behaviour](behaviour.md#one-filter-over-every-dish).

Not verified: any dish of a user, the German names in a browser, whether
the owner agrees with each judgement above. The egg weights are the
catalogue's USDA portions: a medium whole egg (44 g; a large one weighs
about 50 g, which would raise the shares of whole eggs), a large yolk (17 g)
and a large white (33 g). The cleaner place for them is the egg groups of
the catalogue, which this change did not touch.

[^classics]: `packages/app/data/classics/`, 12 dishes each for Germany, Italy, France and Spain.

[^catalogue]: [Ingredient catalogue](ingredient-catalogue.md).

[^pr11]: https://github.com/suitably/domus/pull/11
