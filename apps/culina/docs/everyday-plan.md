---
type: Plan
title: Everyday cooking, the plan to complete Culina
description: Written on 2026-11-25 after the owner said that Culina reads as an ordinary recipe app. The owner's idea in their words (what do I cook today, click something together, see how well it fits, cook, taste, see which spices still fit and what more for which direction; no stock to keep, only spices and staples), what exists and serves it, what is missing (patterns filled by ingredients, flavour directions, a tasting checklist, a pantry in place of the stock, a Today screen), the data with a first draft of each table, the model and engine changes, the screens, ten stages in the order to build with their checks, what recedes and what is kept, the rules and decisions touched, and the questions only the owner can answer. A proposal; nothing of it is decided or built.
tags: [plan, purpose, building-kit, patterns, directions, taste, pantry, cook]
generated: { by: claude-code, at: 2026-11-25 }
sources:
  - '[^owner]: the owner in the session of 2026-11-25, in German, translated here'
  - id: kit
    title: 'Decision: open the app and find what to cook, from a building kit'
    url: decisions/building-kit.md
  - id: flavordb
    title: 'Decision: pairings from FlavorDB'
    url: decisions/flavordb.md
  - id: stock
    title: 'Decision: stock in spaces'
    url: decisions/stock-in-spaces.md
  - id: own
    title: 'Decision: own recipes'
    url: decisions/own-recipes.md
  - id: counts
    title: 'Counts of the data files in `packages/app/data/`, read by a script on 2026-11-25'
---

# Everyday cooking, the plan to complete Culina

**Status: a plan of 2026-11-25, its questions answered by the owner the
same day ([answers](#answered-by-the-owner-on-2026-11-25)); nothing is
built, and no decision record is written yet (stage 0).** The
quotations under "What the owner said" and the answers are the owner's;
everything else is the agent's, for the owner's review. The tables under "The data" are
a first draft written by an AI model from general cooking knowledge,
from no source and checked by no cook.

## What the owner said

Asked where Culina had gone, the owner said that as it stands it is "a
quite normal recipe app", asked why the dishes themselves are so complex
and how one cooks daily ("surely not by recipe"), and then described the
idea[^owner]:

> My idea was: hmm, what do I cook today? And then somehow click it
> together, see what fits together how well, and then cook. Taste and
> check which spices still fit, and what more for which direction.

> I do not want to keep a stock either, because that is annoying.
> Perhaps something like the spices I have, because one really always
> has those and they are particular. Rice and so on, perhaps.

After the first version of this plan the owner named the goal itself[^owner]:

> The goal is to have an app for learning to cook that one can also use
> daily to decide what one wants to cook. So both for beginners, with
> hints how to cook, and for experts who only look for inspiration and
> perhaps want to convert amounts.

What this means for the plan is under
[learning is the purpose](#learning-is-the-purpose-the-evening-is-its-use).

The evening above is the purpose of the [building kit decision](decisions/building-kit.md)
(open the app and find quickly what to cook; no idea, and not knowing
what goes together), said as one evening's course of action. It adds
two things that decision does not hold: the kit is filled by
**ingredients**, not by recipes, and there is **no stock to keep**.

## Learning is the purpose, the evening is its use

The agent's reading of the owner's second statement, for review.

- **One app, one evening, more or less help.** A beginner and an expert
  open the same Today screen and click the same board together. What
  differs is how much the app says while they cook. There is no
  beginner mode and no expert mode to choose.
- **The help follows what is marked as learned**, as the skills already
  work: a technique note, a handling rule, a pattern's method and a
  tasting row are each shown in full until the cook marks them as
  known, then short or not at all. A beginner so becomes an expert in
  the app one skill at a time, and the app "proposes and never
  switches" ([helper](decisions/mentor.md), point 9). One setting
  beside it, for the cook who arrives as an expert: show every hint,
  only new ones, or none.
- **The four stages of the helper decision come back as places in the
  app**, no longer as a goal of being free of it:

  | Stage      | Where                                                      | Who it serves       |
  | ---------- | ---------------------------------------------------------- | ------------------- |
  | Follow     | a shipped recipe, step by step, with every amount and note | the beginner        |
  | Understand | a pattern with its method, the notes at its lines          | the beginner, later |
  | Vary       | the board: swap, see what fits, taste and correct, keep    | everyone            |
  | Free       | proposals as one line each, pairings, ratios and scaling   | the expert          |

- **The recipes are therefore lessons, not only a shelf.** A beginner
  who has never made a pan sauce is sent from the pattern to the recipe
  that teaches it ("cook this once by the recipe"); the 135 shipped
  recipes and the frames keep that work.
- **Learning does not steer the proposals** (owner, answer 10). A
  proposal says how many techniques in it are new to the cook ("2 new
  techniques"), and from three on that this is much at once; the choice
  and the order of proposals follow ingredients and direction only.
- **What the expert needs exists**: the ratio cards, baker's
  percentages and scaling by weight or persons ([roadmap](roadmap.md),
  built goals 1 and 2), and the notebook. For them the plan adds the
  proposals and the pairings on a board, and takes the hints away.
- **Two measures instead of one**: how fast the open app leads to a
  dish the cook then cooks (the [building kit](decisions/building-kit.md)),
  and that the cook needs fewer hints over time. The second is seen in
  the skills marked as learned; nothing else is recorded and nothing
  leaves the device.

This is the fourth statement of purpose in the records (notebook for
chefs, helper that teaches, recipe app, building kit). It does not
replace the last two but joins them: the helper's teaching is the
purpose again, and the building kit's evening is how it is used daily.

## Why the app reads as a recipe app today

- **Every slot of a frame is a recipe.** The shipped tacos are flour
  tortillas made with lard, shredded chicken in tomato, guacamole, a
  lime crema and pico de gallo: five recipes for one supper
  (`packages/app/data/frames/tacos.json`). The model came from
  [how chefs work](chef-practice.md), a restaurant's way: prepared
  components, each with a recipe and every amount.
- **The first screen is a list of finished dishes under a filter**
  ([cook screen](decisions/cook-screen.md)): 135 shipped files, 13
  frames, 7 of them with a choice of filling, no base with an
  alternative ([roadmap](roadmap.md), goal 7).
- **"What fits" exists only beside a dish** ("Goes with" on the dish
  page and in the dish editor); "what a dish still needs" has no data
  ([roadmap](roadmap.md), goal 8).
- **The finder leans on a kept stock** ("Only with what I have", "Use
  up first"), which the owner does not want to keep.

## The evening, as the plan builds it

1. **Open.** The first screen is Today. It shows three proposals, each a
   pattern (pan, tray, pasta with a sauce) filled with ingredients and a
   direction (Italian, Mexican), and one optional field "with …" in
   which the cook may name an ingredient or a direction ("with chicken",
   "Mexican") that all three then hold; left empty, three proposals
   come all the same.
2. **Click together.** A proposal opens as a small board: the places of
   the pattern, each with its ingredient, each to be swapped by a tap.
   The offers for a place are ordered by how well they fit what is
   already on the board. The board says how well the whole fits, in
   words, and what is still missing (no acid, no vegetable).
3. **Cook.** The pattern's method in three to six lines, with a rule of
   thumb amount per person for each place. No step-by-step recipe.
4. **Taste.** One screen: "What is it like?" (flat, too sour, too
   salty, dull, heavy, too hot) with what to add; below it the
   seasonings of the chosen direction and those that pair with the
   board, those from the pantry first.
5. **Keep.** One tap keeps what was built as a notebook entry with the
   day; it comes back later as a proposal.

Fresh ingredients the cook lacks go to the shopping list with the
[hand-over](behaviour.md#handing-what-a-dish-lacks-to-the-shopping-list)
that exists.

## What exists and serves this

| Step                 | There today                                                                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ingredients to tap   | the catalogue, 780 entries with German kitchen names; 52 in the USDA category "Spices and Herbs", 126 vegetables, 82 grains and pasta[^counts]          |
| How well it fits     | FlavorDB's data and the engine's `pairing/pair.ts`; "Goes with" ([decision](decisions/flavordb.md)); `affinities.json`, 53 own groups of pairs[^counts] |
| A dish of ingredient | a dish record is slots with a role and a reference to an ingredient or a component ([data model](data-model.md#dish)); nothing new is needed to keep it |
| Characters           | computed from what is in a dish ([dish characters](dish-characters.md)); they follow a swap                                                             |
| Pantry               | a stock record's `always` ("counts as present until unticked") and the two staples the Stock screen offers (`src/stock/staples.ts`)                     |
| Keeping and the day  | notebook, versions, tasting notes, the date a dish was cooked, "Not cooked for long"                                                                    |
| Missing things       | the hand-over to Emptio's list                                                                                                                          |
| Learning             | skills, technique notes, handling rules, substitutes                                                                                                    |

## What is missing

1. **Patterns**: an everyday way of cooking with places that take
   ingredients by role, a short method and rule of thumb amounts.
2. **Roles for the places** on the catalogue: `ingredient-roles.json`
   has 24 entries for ratio cards and two dish roles (crunch, garnish);
   no entry says what is a starch, a main thing or a vegetable[^counts].
3. **Directions**: a flavour direction with its seasonings.
4. **A tasting checklist**: what to add when a dish is flat, sour,
   salty, dull, heavy or too hot.
5. **A pantry** in place of the stock: spices and staples, set up once.
6. **The proposals**: an engine function from pantry, tonight's taps,
   patterns, directions and history to three boards.
7. **A fit of the whole board**, where today only a list of offers per
   dish exists.
8. **The screens**: Today, the board, the short cook view, Taste, the
   pantry.

## The data

Four small tables, each the project's own, each marked in the app as a
judgement written by an AI model, as the [own recipes](decisions/own-recipes.md)
are; each is read once by another agent before it ships. The drafts
below are to show the size and shape, not the final content.

### Patterns (draft, 8)

| Pattern           | Places (role)                                                       | Method in short                                      |
| ----------------- | ------------------------------------------------------------------- | ---------------------------------------------------- |
| Pan               | main, vegetable, aromatic, fat, seasoning; starch beside it         | sear the main, then the vegetable, season, finish    |
| Tray in the oven  | main, vegetable, starch (potato and the like), fat, seasoning       | cut, toss in fat and seasoning, roast at 200 °C      |
| Pasta with sauce  | pasta, sauce base (tomato, cream, oil), main or vegetable, aromatic | boil pasta, build the sauce beside it, join          |
| Rice or grain pan | cooked starch, main, vegetable, aromatic, sauce, egg (optional)     | fry aromatic, main, vegetable, then the starch       |
| One pot or stew   | main, vegetable, liquid, aromatic, starch or pulse, seasoning       | sweat the aromatic, add all, simmer until done       |
| Soup              | vegetable, liquid, aromatic, body (potato, pulse, cream), topping   | sweat, simmer, blend or leave, top                   |
| Salad or bowl     | base (leaf, grain), main, vegetable, crunch, dressing               | cook what must be cooked, toss with a 3 : 1 dressing |
| Eggs              | egg, filling (vegetable, cheese, main), fat, herb; bread beside it  | cook the filling, add the eggs, set gently           |

A place holds one or more ingredients, has a rule of thumb amount per
person and may be optional. Draft amounts per person: dry pasta 100 g,
dry rice 70 g, potatoes 250 g, meat or fish 130 g, pulses cooked 150 g,
vegetables 200 g, fat 1 tbsp. These are common kitchen figures written
from memory, a judgement; none is from a source.

### Directions (draft, 8)

| Direction      | Seasonings and aromatics                                      | Fat         | Acid           |
| -------------- | ------------------------------------------------------------- | ----------- | -------------- |
| Italian        | garlic, basil, oregano, parsley, chili flakes, parmesan       | olive oil   | tomato, lemon  |
| French, German | onion, thyme, bay, parsley, mustard, nutmeg                   | butter      | wine, vinegar  |
| Mexican        | cumin, coriander leaf, chili, oregano, garlic, onion          | neutral oil | lime           |
| Indian         | cumin, coriander seed, turmeric, ginger, garlic, garam masala | ghee, oil   | tomato, yogurt |
| East Asian     | soy sauce, ginger, garlic, spring onion, sesame               | sesame, oil | rice vinegar   |
| Thai           | fish sauce, chili, lemongrass, coriander leaf, basil, coconut | coconut     | lime           |
| Levantine      | cumin, sumac, parsley, mint, garlic, tahini, paprika          | olive oil   | lemon          |
| Greek, Turkish | oregano, mint, dill, garlic, paprika, yogurt                  | olive oil   | lemon          |

A direction is offered when the pantry holds enough of it (draft: three
of its seasonings); one seasoning short, the app says which ("with
garam masala, Indian too").

### Tasting checklist (draft, 6)

| It tastes       | Try, in this order                                    |
| --------------- | ----------------------------------------------------- |
| flat            | salt; then acid                                       |
| too sour, harsh | fat; a little sweetness                               |
| too salty       | more of the unsalted bulk, liquid; acid; no more salt |
| dull, all one   | something fresh (herb, raw onion), crunch, heat       |
| heavy           | acid; something fresh or bitter                       |
| too hot         | dairy or fat; sweetness; more bulk                    |

The first two rows follow what [how chefs work](chef-practice.md) holds
from Nosrat's book as recalled; the book's pages are on the
[owner's list](../../../docs/owner-checks.md) and unread. Until they are
read, every row is marked as a judgement. Each "try" is answered with
the pantry's own things of that kind (acid: the lemon, the vinegar the
cook has) and those of the direction.

### Roles on the catalogue

Each catalogue ingredient or group gets the places it can fill: starch,
main, vegetable, aromatic, fat, acid, liquid, seasoning, herb, dairy,
crunch, sweet. Most follow from the USDA food category the entry
already carries (vegetables, grains and pasta, spices and herbs, the
meat, fish and pulse categories); 140 entries carry no category (groups
and own entries) and are set by hand[^counts]. A role on a group covers
what is below it, as `ingredient-roles.json` already works. Every entry
states its basis; a role is a judgement.

Not every catalogue entry is offered on a board: a short list per role
(draft: 20 to 40 everyday things) is offered first, the rest by search.

## The model and the engine

- **A pattern** is a shipped file of its own kind
  (`packages/app/data/patterns/`), with a schema: id, names, places
  (role, amount per person, optional, how many), method lines that name
  places, a note of its basis. It is not a frame: a frame's slot lists
  recipes, a pattern's place takes ingredients by role.
- **A direction** and **the tasting checklist** are one data file each,
  with a schema, the basis and the licence, as `affinities.json` is.
- **A board that is kept is a dish record**: slots with role and
  ingredient, the amounts from the rule of thumb times the persons, the
  pattern and direction in a vendor field (`x-origin`), the method as
  steps. The notebook, the versions, the day cooked, the export and the
  characters then work without change. To be checked before building:
  that a dish of ingredient slots alone goes through the editor, the
  finder and the export as it should.
- **The engine stays pure** and gets three functions with vectors:
  - `proposals`: from pantry, the day's wish (an ingredient or a
    direction, or none), patterns, directions, the notebook's days and
    the skills marked as learned, an ordered list of boards, each with
    the count of techniques new to the cook, which does not order them.
    It is a deterministic rule, no random draw without a seed: the
    wished ingredient is placed first, then each open place takes the offer
    that fits best, and the three proposals differ in pattern or
    direction.
  - `boardFit`: what a board has and lacks by role (structure), how
    much of the direction it holds, and the pairings among its
    ingredients. It returns reasons, not one number; the screen says
    them in words.
  - `offersFor`: the ingredients for one place, ordered by fit with the
    board, the pantry's first, each with its level of shared aroma
    with the board (much, some, little).
- **The order of weight** in a fit, the agent's judgement: structure
  first (a board without a main thing or without acid says so), then
  the direction, then the own affinities, last the shared flavour
  molecules. FlavorDB's hypothesis describes Western cuisines and not
  East Asian ones ([decision](decisions/flavordb.md), point 4), so it
  may order offers but never calls a board good or bad. The owner
  wants it seen as a rating (answer 1): each offer shows its level, and
  the board carries it as a line of its own beside what structure and
  direction say.

## The pantry instead of a stock

- **What it is**: the spices, herbs and long-lived staples the cook
  has, ticked once from a grouped list (spices and dried herbs; oils,
  vinegars and sauces; rice, pasta, flour, pulses, tins). No amounts,
  no dates, no state.
- **How it is stored**: as today's stock records with `present` and
  `always`, in the shared collection `stock` of the space
  ([stock in spaces](decisions/stock-in-spaces.md)), so that Mixtura
  and a second device see the same and nothing is migrated. Culina
  stops asking for amount, state, storage and dates; records that carry
  them keep them untouched.
- **Fresh things are not kept.** The one wish on Today ("with
  chicken") holds until midnight on the device, is never synced and is
  no stock.
- **What goes**: "Only with what I have" and "Use up first" are removed
  from the recipe list (owner, answer 5); without fresh things in the
  stock nearly every recipe lacks something.

## The screens

- **Today** (the new first screen, in place of the dish list as the
  opening): the optional wish, three proposals as cards (pattern,
  direction, the ingredients, what must be bought), "Something else"
  for three more, "Start empty" for a board from a chosen pattern.
- **The board**: places top to bottom, a tap opens the offers of a
  place, the fit in one or two sentences, the direction as a row of
  choices, persons, then Cook.
- **Cook, short**: the method lines with the amounts, on one screen.
  The step-by-step view stays for the recipes.
- **Taste**: the six questions and their answers, then seasonings by
  direction and pairing. Reached from the short cook view and from any
  dish page.
- **Pantry**: the grouped list with ticks, in the place of the Stock
  screen.
- **Recipes**: the present Cook list, one tap away, for the day one
  wants a dish from the book or a base (dough, sauce).

The shell (header, navigation, settings) is the shared one and is not
rebuilt ([shared shell](../../../docs/decisions/shared-shell.md)).

## The stages, in the order to build

Each stage ends with `npm run check:culina`, the docs of the stage, a
row in the log, and for a stage with a screen a browser check at 360 px
in English and 1280 px in German, as the app's other screens have.

0. **Decision and words.** A decision record from the owner's answers
   below; `AGENTS.md`, the README, the [roadmap](roadmap.md) and the
   index say the same purpose. No code.
1. **The data.** The four tables with schemas and generated validators;
   written by one agent, each read by another
   ([reviews](../../../docs/reviews.md)); the owner reads the patterns
   and directions before stage 4. Tests: every id a table names exists
   in the catalogue; every pattern place has at least five offers;
   every direction's seasonings have a catalogue entry (a missing one is
   added from the USDA data, as the rule says).
2. **The engine.** `proposals`, `boardFit`, `offersFor` with vectors:
   the same input gives the same boards; a wished ingredient or direction is on
   every proposal; an empty pantry still gives three; a board without
   acid says so; East Asian boards are not ranked down by molecules.
3. **The pantry.** The grouped list in place of the Stock screen, the
   records as above. Tests: a stock record with amount and date is
   shown ticked and written back unchanged; Mixtura's fields survive.
4. **Today and the board.** The first screen, the swap, the fit in
   words. This is the stage after which the owner can judge the idea on
   a phone; the stages after it are worth building only if it holds.
5. **Cook, short, and Taste**, with the technique notes at the method
   lines and the handling rules of the board's ingredients
   ([the skills](#the-skills)), each in full, short or hidden by what is
   marked as learned and by the one setting for hints; from a pattern's
   line the way to the recipe that teaches it.
6. **Keep and come back.** The board as a notebook dish with the day; a
   kept board among the proposals; "Not cooked for long" on them.
   Then **6a**, the steps written from the board with the cook-time
   table, and **6b**, schema.org `Recipe` out and in for Mealie and
   Tandoor ([a recipe written from the board](#a-recipe-written-from-the-board)).
7. **The shopping list** for a board: the fresh things and the pantry things not ticked, through the existing
   hand-over.
8. **The recipes recede.** The dish list becomes Recipes behind Today;
   the manifest's description, the store texts and the German strings
   are rewritten for the purpose; "Only with what I have" and "Use up
   first" as decided.
9. **The native Linux app** follows the web app, screen by screen
   ([native app](native-linux.md)); until then it stays the recipe
   list it is.
10. **The owner cooks a week from it**, and what they find is fixed in
    the tables and the rule. No agent can do this stage.

Stages 1 to 4 are the first deliverable. A rough size, a judgement: 1
and 2 are a day of agent work each with their reviews, 3 half of one,
4 two; 5 to 8 a day each; 9 depends on what the native app is to hold.

## The skills

Asked by the owner after the plan was written ("and what about the
cooking skills?"); the first version said only that they are kept.

The skills are 41 technique notes, 28 handling rules per ingredient and
9 substitutes, each with its source and level
(`packages/engine/data/`)[^counts]. Today a note shows at the step of a
recipe that names its technique, until the cook marks the skill as
learned. Without recipes on the first screen they would be seen less,
so the plan gives each kind a place in the evening:

- **Technique notes hang on a pattern's method lines.** A line names
  its technique (sear, sweat, simmer, cook pasta, cook rice, saute,
  deglaze, reduce, rest meat, knife cuts all exist), and the short cook
  view shows the note at that line until the skill is learned, as the
  step-by-step view does. Missing for the draft patterns: roasting on a
  tray and stir-frying; `bake` speaks of batters. A new note keeps the
  rule: a named paper or textbook, or marked as a judgement.
- **Handling rules follow the ingredient on the board.** They are
  written per ingredient (potatoes into cold water, garlic cut and
  cooked, spices early in fat, pasta water salted, spinach late), so a
  board of ingredients shows them without any recipe. This suits them
  better than the recipes did.
- **Substitutes become offers of the swap**, with their effect.
- **A pattern is itself an ability.** "I can cook a pan dish" is what
  everyday cooking is learned as. A pattern can be marked as learned
  like a skill; its method then shows as one line. Agent's proposal,
  for the owner.
- **The tasting checklist is the skill the owner asked for by name**
  ("taste and check"). It fades the same way: a row marked as known is
  shown short.

Nothing of the skill data or of "learned" changes; the work is in
stage 5, where the short cook view reads the notes, and in stage 1,
where the method lines name their techniques and the two missing notes
are written.

## A recipe written from the board

Asked by the owner on the same day[^owner]: recipes could be made from
the ingredients and the skills, so that someone who wants a
step-by-step gets a recipe with a description; it "is not to be the
focus", and perhaps it can be exported for Mealie or Tandoor.

- **It follows from the plan almost for free.** A kept board is a dish
  record with steps. The steps are written by a rule from what the
  board holds: the pattern's method lines, each with the names and
  amounts of the ingredients in its places, the technique of the line,
  and the handling rules of those ingredients as sentences of the step.
  The step-by-step cook view that exists then shows it. No language
  model writes anything; the same board gives the same recipe.
- **One table more is needed for it to be a usable recipe: how long a
  thing cooks.** A method line "add the vegetables" is right only when
  the carrot goes in before the courgette. Each everyday ingredient
  gets a class per way of cooking (long, medium, short, at the end),
  and the rule orders and splits the line by it. A judgement table of
  the project, marked so, for the 20 to 40 things per role that the
  boards offer first.
- **What it will read like**: plain and alike from dish to dish
  ("Cut the carrot and the pepper. Heat 2 tbsp of oil in a pan. Sear
  260 g of chicken …"), correct in order and amounts, without the
  particulars a written recipe has (how brown, what it should smell
  like). It is marked as put together by the app from a pattern, that
  nobody cooked it as written. For the beginner this is the "follow"
  stage on any board, not only on the 135 shipped recipes.
- **Export.** A kept board exports as every dish does: the own JSON and
  Cooklang ([exchange](exchange.md)). For Mealie and Tandoor the
  candidate is one more writer, a schema.org `Recipe` as JSON-LD (name,
  yield, ingredient lines as text, instructions as steps), which
  Nextcloud Cookbook stores ([existing tools](existing-tools.md)) and
  which, as the agent recalls and has not checked, both Mealie and
  Tandoor read. Before it is built, the import pages of both are read
  at the source and a file is tried in each; trying needs a running
  Mealie and Tandoor, which no session has
  ([owner's list](../../../docs/owner-checks.md)).
- **Import** from them is the same format read: ingredient lines come
  as free text and go through the name matching the import already has
  ([exchange](exchange.md)); what does not match stays a free name. A
  recipe imported so is a notebook dish, not a board: it has no
  pattern.
- **Where it stands in the order**: after the board is judged, as stage
  6a (the written steps and the cook-time table) and 6b (the schema.org
  writer and reader). It is not part of the first deliverable.

## What recedes, and what is kept

Nothing is deleted by this plan.

- **Kept as they are**: the notebook with versions and tasting notes,
  import and export, ratios and baker's percentages, skills, the
  hand-over, the catalogue, the pairing data, the characters.
- **Recede behind Today, and stay as lessons**: the 135 shipped recipes
  and 13 frames, as the place where a beginner follows a dish step by
  step, as the book for a dish one wants to make properly, and for the
  bases where the ratio matters.
- **Lose their work**: the stock's detail fields in Culina's screens;
  the finder's ranking by urgency.
- **Stop for now**: more shipped recipes, more frames, alternatives for
  the bases, taking the 31 older dishes apart, the import pack
  (roadmap goal 7). They serve the book, not the evening.

## Rules and decisions this touches

- **"Help is scripted and sourced"** (`AGENTS.md`): the four tables are
  judgements and are marked so, which the rule allows; no language model
  runs in the app. The proposals are a rule over tables.
- **[Own recipes](decisions/own-recipes.md)**: the tables are content
  written by a model and read by a second agent, as that decision asks
  of recipes; it is to be said that it covers them.
- **[Cook screen](decisions/cook-screen.md)**: its three destinations
  (Cook, Notebook, Ratios) stay; what Cook opens with changes. A note
  there with stage 0.
- **[Building kit](decisions/building-kit.md)**: its open point 1
  (where "what a dish still needs" comes from) is answered by the own
  tasting table, if the owner agrees.
- **[Stock in spaces](decisions/stock-in-spaces.md)**: the collection
  and its record stay; a note that Culina no longer writes the detail
  fields.
- **Parts stay apart**: patterns and directions are Culina's; should
  Mixtura or Emptio need the pantry list itself, it moves to a shared
  package then, not before.

## What this plan does not prove

- That three proposals from a rule feel like ideas and not like a
  slot machine. Only stage 4 on the owner's phone shows it.
- That the tables are right. They are written from general knowledge
  by a model; no cook read them, no dish was cooked from them.
- That a pairing by shared molecules helps on a board. It is kept last
  in the order for that reason.
- That a dish of ingredient slots alone passes every existing screen;
  to be checked at stage 1.

## Answered by the owner on 2026-11-25

Asked the questions below one by one in the same session, the owner
chose[^owner]; the number is the question's. Where the body of this
plan said otherwise, it was changed with this section.

1. **The own tables: yes**, and FlavorDB as a rating of how well things
   fit. Asked how visible: **a level on each offer** (shares much, some,
   little aroma with the board), FlavorDB as a line of its own on the
   board, the verdict on the whole from structure and direction.
2. **Three proposals** on Today, "Start empty" beside them.
3. **No row of things to tap** ("needlessly complex"), but naming a
   direction is wanted: **one optional field** for an ingredient or a
   direction, held until midnight on the device.
4. **The pantry in the shared `stock` collection: yes.**
5. **"Only with what I have" and "Use up first": removed.**
6. **Roadmap goal 7 rests** until Today and the board are judged.
7. **The visible name stays** Cook's Workbench.
8. Open: which patterns and directions are missing or wrong.
9. **The goal sentence: yes**, as worded in question 9.
10. **Learning does not steer the proposals**; each proposal **shows
    how many techniques are new** to the cook, with a word from three
    on.
11. **The setting for hints: yes**, default "only new".
12. **The recipe written from the board and the export: both**, after
    stage 6.
13. **Tandoor is in use**; an export can be tried there by the owner.
    Mealie is not; its import stays not tried.

## Questions for the owner

As they were asked; answered above except question 8. Each with what
the agent would have built had the owner said nothing.

1. **The own tables** for patterns, directions and tasting, marked as
   judgements: agreed? (Without them stages 1 to 5 cannot be built.)
2. **Proposals first, or an empty board first?** Agent: three proposals
   and "Start empty" beside them.
3. **Tonight's taps**: forgotten when the app closes, or kept until
   midnight on the device? Agent: until midnight, on the device only,
   never synced.
4. **The pantry in the shared `stock` collection**, so Mixtura sees the
   same ticks? Agent: yes.
5. **"Only with what I have" and "Use up first" on the recipes**: kept
   against the pantry alone, or removed? Agent: removed, since without
   fresh things nearly every recipe lacks something.
6. **Roadmap goal 7 stops** (more recipes, frames, alternatives) until
   stage 4 is judged? Agent: yes.
7. **The visible name**: Cook's Workbench stays? It fits this purpose
   better than it fitted a recipe list.
8. **Which patterns and directions are missing or wrong** in the drafts
   above: the owner's own everyday cooking is the measure.
9. **The goal in one sentence** for `AGENTS.md` and the README: "an app
   for learning to cook that is used daily to decide what to cook, for
   the beginner with hints and for the expert who looks for ideas and
   converts amounts"? Agent: yes, with the building kit as how.
10. **One new skill in a proposal**, at most, with a way to ask for
    nothing new? Agent: yes.
11. **The setting for hints** (all, only new, none) beside "learned" per
    skill? Agent: yes, default "only new".
12. **A recipe written from the board** by a rule, plain in wording and
    marked as the app's own: wanted, after stage 6? Agent: yes; it is
    the beginner's step-by-step on every board.
13. **Mealie and Tandoor**: is one of them in use in the household, so
    that an export can be tried there? Without one it is built to the
    format and marked as not tried.
