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

The counts are those of the 48 dishes of 2026-11-21; "uncooked" was
corrected on 2026-11-24 ([below](#uncooked-reads-the-plain-actions-2026-11-24)).

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

**Kitchen water is not counted** (2026-11-24). Water became a catalogue
ingredient so that a recipe with water can be kept. Counted as a line it
changed 13 shipped dishes: the cocido, the pot-au-feu, the refried beans,
the roast potatoes and the chana masala became "light" for the water they
boil in, the dal lost "tomatoey", the barbecue sauce "sweet". The table's
`notCounted` (tap water) is left out of the facts of a shipped and of an own
dish, which gives every dish the characters it had; the alioli gains "eggy",
which the unmeasured water line had held back. **Test:**
`test/characters.test.ts` ("a boiled dinner whose meat has no amount is not
called light" fails with the water counted), `test/water-line.test.ts`.

## Uncooked reads the plain actions (2026-11-24)

Found by the review of "Dishes like this" ([behaviour](behaviour.md#dishes-like-this)):
"uncooked" was a chip on 20 cooked dishes and in the filter. Its rule
(`withoutTechniques`, "no step uses heat") holds when the steps are known
and none names a heat technique; but a step names a technique or a plain
action, the facts carried only the techniques, and heat written as an
action ("Heat the oil", "Bring the water to the boil", "Melt the butter")
was invisible. Now the facts carry the steps' actions too
(`actions` in the engine's `CharacterFacts`, set by `factsOfClassic` and
`factsOfDish`), a clause may ask `withoutActions`, and "uncooked" lists
the heat actions: cook, grill, heat, melt, preheat, remove-from-heat,
roast, toast (a judgement: "dry", "cool", "stand" and "take-out" are not
heat).

Of the 121 dishes of Cook, "uncooked" is now said of seven: pai huanggua,
marinierte Heringe, gazpacho, horiatiki, kachumber, çoban salatası and
coleslaw. It is no longer said of the 20 cooked ones: fanqie chao dan,
Rührei, gambas al ajillo, crêpes, oeufs brouillés, patates lemonates,
souvlaki, chapati, the pizza dough, miso shiru, sake no shioyaki,
tamagoyaki, tofu suteki, pollo deshebrado, tortillas de harina, köfte,
buttermilk pancakes, pizza margherita, the souvlaki plate and the tacos.
Two lose it by the rule's own basis: kyuri no sunomono (its sesame is
toasted) and achat (its syrup is heated). Among the sauce bases saure
Eiersauce is no longer uncooked, and sauce maître d'hôtel loses it too (its
bowl is set near the stove to soften the butter, a step "heat"); the cold
sauces keep it.

**Known and left** (until the fix below): Spargelsauce and sauce blanche
were still said to be uncooked. Their heat is in a step "whisk over the
heat" whose word was "whisk" (sauce blanche: "stir"), neither a heat
action nor a technique; they are cited recipes and their steps are not
changed for a rule. **Test:**
`test/characters.test.ts` ("uncooked on the shipped dishes and frames": the
seven exactly, the 20 not, the two that lose it, the sauces with the two
known ones, which that test pinned as wrong until the fix below; "heat
written as a plain action counts" on a dish of the
notebook, with a control), the engine's `test/characters.test.ts`
("withoutActions", with controls). All of them fail on the code before the
change, the engine's controls aside.

**The two sauces, fixed** (2026-11-24). The rule was right and the word
of one step in each sauce was not. A step carries exactly one word, a
technique or a plain action ([steps](classic-format.md#steps)); the word
is the project's reading of the step, not the source's text, which stays
as it was, with every amount and the order. The step that brings each
sauce to the boil, Spargelsauce's "beat the sauce with a whisk over a
brisk heat until it is just short of boiling and has bound" and sauce
blanche's "stir with a spoon over the heat until it first boils", is now
the plain action **cook**, a heat action: it is a fact of the step that
the sauce is cooked on the heat. Not the technique "thickening with
starch": a technique is a promise to teach, and its note does not fit
either step. It tells the cook to stir the starch smooth in a little cool
liquid (sauce blanche works the flour into butter and pours in hot
water) and that hard stirring thins the sauce (Spargelsauce is beaten
with a whisk, after lemon juice, an acid, went in). Neither sauce is
uncooked now; no other character of a shipped file changed (the first
version of this fix used the technique, which also made Spargelsauce
"creamy"; with the plain action it does not).

**Guisantes al natural, by the same rule.** Its step "add the butter
kneaded with the flour, and stir hard for two minutes" was named
`thicken-with-starch`, whose note says that hard stirring thins a starch
sauce and asks for a cool liquid, not butter. The step is now the plain
action **stir** (the action that handles the line it names); it changes
no character (the dish has other heat steps), and the technique's note
is no longer shown there. Holl. Sauce keeps the technique: its yolks and
flour are stirred smooth in wine and water and stirred to the boil,
which is what the note teaches (that wine is an acid is a judgement left
as it is).

**The same pattern in every shipped file**, scanned on 2026-11-24 (the
dishes, the bases, the frames and the import pack, with alternatives as
shipped): a dish said to be uncooked whose step text speaks of heat
(heat, boil, boiled, simmer, fry, bake, roast, grill, grilled, melt,
warm, stove, fire, cook, …). Seven were found: the two sauces above, and
five that heat nothing in a step and rightly stay uncooked: the
mayonnaise (boiling water is poured in), the pesto (tossed with the
pasta off the heat, with its cooking water), the guacamole (its flesh
"turns brown"), the salsa vinagreta (its eggs are hard-boiled before)
and the ladolemono (spooned over grilled fish, meat or boiled
vegetables). Heat in a cooked dish's text under a word that is no heat
(macaroni "stir over the heat") changes no character and was not
counted. **Test:** `test/characters.test.ts` "a sauce base: saure
Eiersauce, Spargelsauce and sauce blanche are cooked" (it pinned the two
as known and wrong before; fails on the old files) and "no shipped dish
said to be uncooked has heat only in the words of a step" (the scan,
with the five named; fails on the old files with the two sauces); the
controls, the seven uncooked dishes, the 20 cooked ones, kyuri no
sunomono and achat, and the mayonnaise, pass before and after.
`test/classics-steps.test.ts` counts 255 steps with a technique and 739
with a plain action (256 and 738 before). Not proved: the scan reads
English words, so heat said in other words would pass; nobody cooked
the sauces or the peas.

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
lard or tallow; no gelatine, broth, extract, anchovy or fish sauce existed
then). On 2026-11-23 the catalogue got stocks and sauces: the chicken and
beef stock with their group, the fish sauce, the oyster sauce and the
Worcestershire sauce (anchovies in the usual recipe, a judgement) joined the
list; the vegetable broth did not. The test's name scan now also asks for
"stock", "oyster" and "worcestershire".
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

## A kept copy is judged like its shipped dish (2026-11-24)

**What was wrong.** Found on 2026-11-24 by a review of the kept frame in
Cook's groups ([behaviour](behaviour.md#cook)). A dish kept in the
notebook is judged by `factsOfDish`, its shipped dish by `factsOfClassic`,
and the two gave other characters. Recounted the same day by a script that
keeps every shipped file by the app's own code (`keepClassic`) into a
notebook on a fake IndexedDB, at 2 and at 4 portions, and every frame once
more per filling it offers (14), and compares the copy's characters with
those of the shipped dish as chosen. Of the 130 files that can be kept (18
cannot: a `wanted` line), 51 copies differed, 36 of them among the 103
dishes Cook lists (3 frames); and 4 of the 14 fillings. The same at 2 and
at 4 portions. The kept pizza lost "cheesy", the tacos "lemony", the
souvlaki plate "lemony" and gained "tomatoey"; the table of every copy is
kept outside the repository (the scratch folder of the session, not
committed). Three causes, the first hiding the other two:

| Cause                                                                                                                                                                                                                                                | Copies                                              | Where                                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------- |
| A component slot of a copy has no amount (a shipped slot never states one: a shipped dish counts each of its components at its own amounts), and the own-dish path gave every line of such a slot no mass, so the share rules fell back to presence. | all 51, and the 4 fillings                          | `slotLines` and `linesWithoutMass` in `src/characters/dish.ts` |
| An amount in pieces or spoons of a group (eggs, yolks, whites) was weighed with the notebook's own figures, which a group lacks; the shipped path takes the figure the group's foods agree on (`conversionOf`).                                      | 10 of them (eggy, and cheesy on the scrambled eggs) | `nb.facts` in the same file                                    |
| The expansion merged the lines of one ingredient (the sugar of the snow eggs and of their custard), so the copy had fewer lines and less of it counted as measured.                                                                                  | 1 (the snow eggs)                                   | `expandComponent`'s aggregation                                |

Techniques, plain actions and course were the same on every copy, no role
was lost, portions did not matter, and a `wanted` line never reaches a copy.

**How it is judged now.** The own-dish path writes a slot out as the
shipped path counts a component, in one derivation that the totals, the
nutrition and the characters share (`slotMass` in `src/dishes/slots.ts`,
`expandSlot` in `src/dishes/raw.ts`):

- a component slot without an amount stands for **one run of the
  component at the dish's stored portions** (`runsWithoutAmount`): what a
  copy wrote (each component for the copy's portions), and what the cook
  screen has always cooked for such a slot; at other portions it scales
  with them. A dish that stores no portions gives no runs: such a slot is
  not added up and counts by presence, as before (nothing is guessed);
- a component named without an amount inside another is one run of it per
  run of the one naming it (`expandComponent`, `withoutAmount: 'run'`),
  where before it was left without mass; and one run of a component that
  is taken as what goes in includes that run (`runWeight`), for every
  reader of the page alike: the ingredients and the cook screen
  (`dishParts`), "What goes in, all the way down" and the nutrition
  (`dishRaw`). A first version of this change left the ingredients on the
  old weight, so a macaroni cheese of 400 g a portion for 2 whose recipe
  names its béchamel without amount showed 500 g of pasta in the
  ingredients and 417 g in the total list (found by the review);
- **a run's weight that cannot be known is not guessed** (since the second
  review of 2026-11-24). A run taken as what goes in, with a line that
  cannot be weighed at any depth (a unit whose density or piece weight is
  not recorded), has no known weight, as a run without a yield always had
  (`no-yield`); before, that line was left out of the weight and every
  scaled amount came out too large without a word. In the macaroni cheese
  the béchamel's 500 ml of milk has no density in a notebook without one:
  the 417 g above left the milk out; with a density of 1.03 g/ml the run
  weighs 995 g and the dish asks for 201 g of pasta and 121 g of cheddar.
  Without one, no reader scales it: the page shows the component as
  written, one run, with a quiet line under its heading, and the cook
  screen the same line at every step of it, under the amounts: "Béchamel
  cannot be scaled: milk has no weight here. Weigh its output, or give milk
  a weight. For one run as written." ("Béchamel lässt sich nicht
  skalieren: Milch hat hier kein Gewicht. Wiege das Ergebnis oder gib
  Milch ein Gewicht. Für einen Ansatz wie notiert."); the total list and
  the nutrition do not add it up and list it under "Not added up" with all
  but the last sentence. No density is invented. The same
  holds for a component a line names by mass whose run, without a yield,
  holds kitchen water (`notWeighedByLine`: tap water, mostly poured away);
  whether cooking water counts into a run's weight is not settled here;
- the runs of one component from every place it is needed add up, in
  whatever order the slots come: a dish with the macaroni cheese and the
  béchamel as two slots makes two runs of béchamel (before, with the
  macaroni cheese first, the page made one and the total list two);
- every component a dish makes is a part of its page and its cook screen,
  nested ones too, each once, with its lines for the runs it is needed
  (`runsOfParts` in `src/components/steps-view.ts`). Before, only the
  components of the slots were: a kept crème caramel showed no caramel
  lines and no caramel steps, and so did the snow eggs' custard, the
  cauliflower's béchamel, the fennel's batter and the boiled beans of the
  green beans in butter (found by the review; on f4f9f59 too). The parts of
  one filling come in the order the notebook keeps its components, which
  is by name, not the order of a shipped file: of the five copies with a
  nested component, two come in another order than their shipped file,
  the snow eggs (Custard, then Snow eggs; shipped the reverse) and the
  cauliflower with béchamel (Béchamel, then Cauliflower; shipped the
  reverse). Both can be cooked in either order;
- for the characters, an amount in pieces or spoons is weighed as on a
  shipped dish (`conversionOf`), and the lines are counted one per line of
  the recipe (`rawBy: 'line'`), not merged by ingredient.

A copy is judged by what is in it, never by its origin: a kept pizza
without its cheese is not cheesy, though `x-origin` still names the pizza
(an origin is history). Nothing stored is rewritten; a copy kept before
reads right at once.

**What changed for own dishes that are not copies.** Every own dish with a
component slot without an amount, or a component nested without one, is
now judged by shares where it was judged by presence. On four dishes built
by hand from components (a test outside the repository): pasta with a
tomato sauce and parmesan stays tomatoey; an omelette plate (three eggs by
the piece, butter, chives) gains "eggy", which it was missing; a lemon
chicken with rice gains "lemony" (40 ml of lemon juice to 500 g of
chicken); a macaroni cheese with a béchamel named without amount is cheesy
and baked before and after, as its bake step makes the cheese count
without a share (built without that step, it gains "cheesy" by share, as
the review found). As a cook, each "after" is right. What now reads "cannot
be scaled" on an own dish that showed a number before: a slot with an
amount, or a line naming a component by mass, whose component has no yield
and a line that cannot be weighed (an onion by the piece without a piece
weight, a cup of a group without a density), or by mass a component
without a yield that holds tap water. Each such number was the scaled
recipe without that line's weight, too large by its share
(`test/amounts-written.test.ts`: a sauce with one onion was halved as if
it weighed 448 g; with the onion's 110 g it weighs 558 g). The app's two
example dishes are not affected. The two example dishes
of the app state every amount and do not change. The random pick's
combinations (one slot per component, no amounts, no portions) are judged
by presence, as before.

**Differences that remain.** In characters none among copies kept
unchanged: 0 of 130 at 2 and at 4 portions, 0 of 14 fillings. A copy the
cook changed differs where its content differs, which is right. On the
page one, open: the green beans in butter (`haricots-verts-beurre`) name
500 g of boiled beans, a component without a yield whose run holds 1500 ml
of boiling water. The run can be weighed (water has a density), so the
first rule does not make it unknown; taken as what goes in it weighed
about 3.5 kg, and the copy asked for a seventh of the beans (36 g for 2
beside the source's "500 grammes"). Now a run that holds tap water is not
weighed for a line that names it by mass: the copy's page and cook screen
show the boiled beans as written, one run (250 g of beans, 1500 ml of
water, 5 g of salt for the copy kept for 2), under "The output of Boiled
green beans is not weighed yet, so it cannot be scaled. For one run as
written.", and the total list
and the nutrition do not add them up. At the copy's own portions that is
the shipped amount; at others it is one run, said as one run. A rule for
kitchen water in a run's weight, or a yield on the component, is still
open.

**A copy's ingredient slots held a total (fixed for new copies).**
`copyClassic` stored a slot's amount as derived for all the copy's portions,
and an own dish reads a slot's amount per portion, so such a slot counted
`portions` times. Seen in a browser on 2026-11-24 at 2 portions, against
the shipped dish at 2: the kept pizza's slots showed 125 g per portion and
250 g in all of tomato sauce and of mozzarella and 10 g of basil (shipped:
125 g, 125 g, 5 g in all); the kept miso ramen 400 g of noodles and 60 g of
spring onions (200 g, 30 g); the soup with dumplings 122 g of carrots and
9 g of chives (61 g, 4.5 g); the risotto 10 g of parsley (5 g, an optional
slot). The components' own lines were right. Before this change the
nutrition of those copies was hidden ("Pizza dough cannot be counted"), so
only the amounts were wrong on screen; with the run rule above it showed
figures from the doubled slots (the kept pizza 930 kcal a portion against
720, the miso ramen 1050 against 660, the soup 340 against 330; the risotto
was right, as an optional slot is not counted). Since 2026-11-24 keeping
stores a slot's amount per portion, for every portion count and for a
frame with a chosen filling: a copy kept now shows its shipped dish's
amounts at any portions, its characters and, but the 17 below, its
nutrition figures.

**Copies kept before.** Only the copies whose slots name an ingredient with
an amount are affected, and of the 130 files that can be kept these are
four: the pizza, the miso ramen, the soup with dumplings (with either
filling) and the risotto. Every other copy has only component slots
without an amount and is right. An old copy of the four shows the amounts
above (`portions` times the shipped ones) and, since this change, the
nutrition from them; its characters come out as the shipped dish's all the
same (the cheese stays above 8 percent, and so on). Nothing stored is
rewritten and reading does not guess: an old total cannot be told from an
amount the cook typed. Keeping the dish again gives a right copy. Plainly,
for the nutrition: an old copy of the pizza, the miso ramen or the soup
with dumplings showed no figures before this change and now shows figures
computed from its doubled amounts, 930, 1050 and 340 kcal a portion
against the shipped 720, 660 and 330; an old risotto is right (its parsley
is optional and not counted). **Owner question:** what should become of
old copies: left as they are, a note on their page, their figures hidden,
or a repair the cook confirms?

**The nutrition** of an own dish adds up the same way (it shares `dishRaw`):
on f4f9f59 a copy's component slots were "not added up", so no kept copy
showed figures. Now, for a copy kept unchanged at 2 or at 4 portions, 72
of the 130 show the shipped dish's figures, 41 show none as their shipped
dish shows none, and 17 show none where the shipped dish shows some
(listed in `test/kept-characters.test.ts`). An optional component slot
without an amount is weighed by its run and not counted, as on a shipped
dish (it hid the figures of the set meal).

**Open, owner questions (2026-11-24):**

- **The kitchen-water rule reaches further than the green beans.**
  `notWeighedByLine` (tap water) makes any component named by mass, without
  a yield, whose run holds tap water "cannot be scaled": an own "Pizza
  base" naming 250 g of a "Bread dough" (500 g flour, 325 ml water, 10 g
  salt, no yield) now shows the whole dough run with the note, and the
  total list and the nutrition leave the base out; a stock, broth or
  batter named by mass likewise, since that water stays in. It fails safe
  and is not worse than before this change (then the dough was no part of
  the page and the base was not added up), but it is too wide. Needed: a
  way to tell water that stays from water poured away (a yield on the
  component, a mark on the line, or a rule by the steps), the owner's
  decision.
- **"A run weighs what goes in" is narrowed.** A run with a line that
  cannot be weighed has no known weight. An own pancake batter (250 g
  flour, 500 ml milk, 3 eggs) given as 200 g a portion was scaled about
  20 percent too high before (the eggs left out of the weight) and now
  shows one run as written. Eggs, yolks and whites have no piece weight in
  the notebook; weighing them as the characters already do (`conversionOf`,
  44 g an egg) would keep such dishes scalable: proposed as the next small
  change, not built.

**Also open:**

- **17 copies show no nutrition where the shipped dish does**, for two
  reasons. 14 (`patatas-bravas`, `tortilla-de-patatas`,
  `macaroni-a-l-italienne-maigre`, `mayonnaise`, `oeufs-a-la-neige`,
  `omelette-fines-herbes`, `pommes-de-terre-au-lait`, `sauce-hollandaise`,
  `souffle-parmesan`, `soupe-aux-poireaux`, `crema-cotta`,
  `gnocchi-di-semolino`, `latte-brule`, `passato-di-patate`): the nutrition
  of an own dish weighs a spoon or a piece of a group (flour, milk, eggs) by
  the notebook's own figures, which a group lacks, where the shipped dish's
  nutrition can weigh it; left so on purpose on 2026-11-21 ("the
  notebook's own conversion of a cup of a group to grams is not changed
  here", [behaviour](behaviour.md#dishes)). 3 (`salsa-de-tomate`,
  `haricots-verts-beurre`, `sauce-maitre-d-hotel`, found by the review):
  nothing is unweighed, but their lines without an amount (water, salt,
  lemon juice) reach the own nutrition by name only (`#unmeasured-i` in
  `ownNutritionView`), so they cannot be known as seasonings or water and
  keep the figures back. The characters weigh and know them as a shipped
  dish does; bringing the nutrition to the same rule is its own change.
- **"Only with every amount given" leaves a kept copy out**: it asks a
  stored amount of every slot of an own dish, and a copy's component slots
  have none, where the shipped dish stays.
- **The recipe import counts an ingredient slot `portions` times**, the
  same class of defect as the copies (traced by the review, confirmed by
  reading the code, not run): the import asks for an ingredient slot's
  amount "as written, per dish" (`src/screens/import/ai-prompt.ts`,
  `slot.amount`) and stores it as it is (`engine/src/recipes/import.ts`,
  the slots of the dish), and the dish reads it per portion. A recipe for 4
  with 200 g of rice as a slot shows 800 g. With the run rule its
  component slots are now added up, so its figures show where they were
  hidden. To fix next: divide by the stored portions on import.
- Found by the review, not rerun here, small: the kept barbecue sauce is
  not "without meat and fish" where the shipped one is (before and after
  this change); the dish editor shows a copy's amounts per portion with
  ten digits ("11.09007359 ml"); changing a copy's portions in the editor
  doubles its ingredient slots but leaves a component slot at one run (the
  stored portions now say what one run makes); a copy shows grams where
  the shipped page shows ml, pieces or spoons.

**Not changed:** the meat line reads the classes of the lines, not their
mass, and was right before; the native app lists shipped dishes only and
is not touched.

**Tests:** `test/kept-characters.test.ts` (every file kept at 2 and 4
portions and every filling against its shipped dish, 51 files and 4
fillings failing on f4f9f59; the pizza cheesy, the tacos lemony, the
souvlaki plate lemony and not tomatoey, the tamagoyaki eggy, the horiatiki
cheesy, the köfte rich, the bulgur pilavı not tomatoey, the soufflé and the
snow eggs eggy; controls: three copies that were right before, a kept pizza
without its cheese not cheesy; "Dishes like this" of a copy is that of its
shipped dish and never names it, which passed before too; the nutrition of
four copies equals the shipped figures; since the keeping fix also: every
file at 2 and 4 portions and every filling has its shipped dish's slot and
component amounts shown at 1, 3 and its own portions, and on its page and
cook screen (`dishParts`) every component of the shipped dish, nested ones
too, with as many lines and steps and the same grams, but the green beans
in butter (named; this failed for the crème caramel, the snow eggs, the
cauliflower and the fennel with the `dishParts` before the review), the kept pizza for 2
has 125 g of mozzarella, and every copy's nutrition is the shipped dish's
but the 17 named; these three failed with the old `copyClassic` for the
pizza, the miso ramen, the soup with dumplings and, for amounts, the
risotto), `test/classics-vectors.test.ts` (the vectors `copy-basic` and
`copy-ingredient-remap` pinned the total and now hold the amount per
portion), `test/characters.test.ts` (a
component slot without amount is one run; the test that pinned presence
was replaced),
`engine/test/expand-without-amount.test.ts`, `test/dish-nested-run.test.ts`
(the reviewers' macaroni cheese: with the milk weighed, the ingredients,
the cook screen and the total list say 201 g of pasta and 121 g of
cheddar, which passed before too (the control); without a density no
reader scales it and each says why; with the béchamel also a slot, 1030 g
of milk on the page and in the total list in either order; both failed
with the code before the second review; control: a component ready in
stock is not made, nor what is below it), `test/amounts-written.test.ts`
B (a sauce with an onion without a piece weight is not scaled and says
why; it pinned the halved sauce before), the engine's
`components.test.ts` and the vector `expand-without-yield-input` (they
pinned a run weighed without its unweighable line), `test/dishes-view.test.ts` (a dish without stored portions does not
add up such a slot; failed with the first version, which took one run a
portion), `e2e/cook-groups.mjs` (the
kept pizza and the shipped one both under "Cheesy"; the tacos leave; failed
on f4f9f59). Not proved: a notebook kept on a real device, copies kept in
the other language, a copy kept before the keeping fix in a browser, and
whether the owner agrees with the judgement of the own dishes above.
