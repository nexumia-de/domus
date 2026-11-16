---
type: Research
title: How bartenders work
description: How experienced bartenders structure drink knowledge (templates, ratios, balance as numbers), develop drinks, pair flavours, build non-alcoholic drinks and run a bar; what a tool should do and the data model that follows.
tags: [research, bartending, templates, balance, non-alcoholic, data-model]
generated: { by: claude-code/2.1.326, at: 2026-11-16 }
sources:
  - id: codex
    title: 'Alex Day, Nick Fauchald, David Kaplan: Cocktail Codex (2018)'
  - id: arnold
    title: 'Dave Arnold: Liquid Intelligence (2014)'
  - id: regan
    title: 'Gary Regan: The Joy of Mixology'
  - id: embury
    title: 'David Embury: The Fine Art of Mixing Drinks'
  - id: flavorbible
    title: 'Karen Page, Andrew Dornenburg: The Flavor Bible'
  - id: ahn
    title: 'Ahn et al.: Flavor network and the principles of food pairing, Scientific Reports (2011)'
  - id: bainbridge
    title: 'Julia Bainbridge: Good Drinks (2020)'
---

# How bartenders work

> Written from recalled knowledge of the named books, not from the
> books at hand. Every number here is a rule of thumb and must be
> checked against its source before it becomes a rule or test vector in
> the engine.

# Templates instead of recipes

Experts keep roles, ratios and the technique they imply, not recipes.

- Six root templates[^codex]:
  - Old-Fashioned: 2 oz spirit, about 1 tsp sugar, 2 dashes bitters; stirred.
  - Martini: 2 oz spirit, 1 oz fortified wine or liqueur; stirred.
  - Daiquiri (sour): 2 oz spirit, 3/4 oz acid, 3/4 oz sweet; shaken.
  - Sidecar: a sour whose sweet part is a liqueur.
  - Highball: 2 oz spirit, 4 to 6 oz carbonated mixer; built.
  - Flip: spirit or fortified wine, sugar, whole egg; a texture template.
- Families with one core formula each: sours, aromatic, bittersweet,
  fizzes, flips and more[^regan]. Base, modifier, accent[^embury].
- Substitution one slot at a time in the same role: Daiquiri →
  Margarita → Whiskey Sour; Negroni → Boulevardier → White Negroni.

# Balance as numbers

Computable from a spec when each ingredient carries ABV, sugar and acid[^arnold]:

- ABV before dilution: sum of volume × ABV over the sum of volumes.
- Dilution: stirring adds roughly 20–25 % of the volume, shaking 25–30 %;
  it depends on ice, time, sugar and starting ABV.
- Typical results: stirred drinks about 28–32 % ABV, shaken sours
  14–18 %, highballs 8–12 %; sours about 8–12 g sugar per 100 ml and
  0.8–1.2 % acid.
- Volume, sugar-to-acid ratio, units of alcohol and calories follow from
  the same sums.

Aroma, bitterness and carbonation are not captured. Authors differ on
the ranges, so they are shown as ranges and never as verdicts.

# Developing drinks

- Riff on a classic and change one variable; split the base between two
  spirits; swap the modifier; make a house syrup, cordial or infusion;
  adjust acid; add saline.
- Write a spec, taste, change one thing, note why. Specs have versions,
  a parent drink and a status (draft, on the menu, retired).
- Syrups, cordials and infusions are recipes too, with yield and shelf
  life. Changing one changes every drink that uses it.

# Pairing

- Used in practice: curated affinities[^flavorbible], classic pairs
  (gin and cucumber, rum, lime and mint), flavour wheels, the season.
- Pairing by shared aroma compounds holds statistically for Western
  cuisines only and is reversed in East Asian ones[^ahn]. It is a source
  of ideas, not a prediction.

# Non-alcoholic and low-ABV drinks

Without ethanol a drink lacks a solvent for aroma, body, bite and
preservation, and dilutes differently[^bainbridge]. What replaces it:

- body: sugar, glycerin, gum, aquafaba;
- bite: ginger, chilli, tannin from tea;
- structure and acid: verjus, shrubs, ferments such as kombucha or
  tepache, acid blends;
- depth: non-alcoholic spirits and aperitifs, bitters in small doses,
  saline.

The templates carry over: a sour with tea or a non-alcoholic spirit as
base, a highball, a spritz. Low-ABV drinks use fortified wine or sherry
as the base. Such mixes spoil sooner, so shelf life must be shown.

# Operations

- Batching: mix ahead with the dilution water added, store cold.
  Fresh citrus loses brightness within hours.
- Pour cost: sum of volume × cost per ml; the price follows from a
  target share.
- Menus balance styles and base spirits and reuse prepared ingredients.
- "What can I make" is a check per spec that every slot is filled, with
  substitutes. "Which bottle unlocks the most" counts, for every missing
  ingredient, the specs that become makeable.

# What stays useful with experience

Step-by-step instructions, glossaries and the well-known classics lose
their value. What keeps it: quick lookup of a rare spec, scaling and
batching, balance and cost figures, stock, substitution, notes and
versions, prepared ingredients, a menu to show. Learners also need the
templates explained and feedback on balance.

# What Mixtura should do

Ranked for the experienced bartender:

1. A fast spec editor with prepared ingredients, units (oz, ml, cl,
   dashes, bar spoons) and scaling.
2. Balance numbers against the template's usual range.
3. Batching with dilution, yield and shelf life.
4. Versions and notes, riffs linked to their parent.
5. What the stock allows and which bottle unlocks the most.
6. Substitution by role, with the numbers changing live.
7. Cost per drink.
8. Affinities as inspiration, each with its source.

For the learner the order starts with the templates as slots, guided
substitution and balance feedback.

# Data model that follows

- **Ingredient**: a tree of category, type and product; a role (base,
  modifier, sweet, sour, bitter, accent, texture, lengthener); ABV,
  sugar, acid, cost, shelf life; substitution class.
- **Template**: slots with a role and a ratio range, a method, and the
  usual ranges of ABV, sugar and acid after dilution.
- **Spec**: an optional template, lines of ingredient or prepared
  ingredient with amount, unit and role, method, glass, garnish, notes,
  version, parent, status.
- **Prepared ingredient**: a spec whose result is an ingredient, with
  yield and shelf life; its properties are computed from its parts.
- **Stock**: what is there.
- **Affinity**: two ingredients, strength, kind and source.
- Derived and never stored: balance figures, cost, makeable, unlock
  ranking.
