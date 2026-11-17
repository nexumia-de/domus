---
type: Research
title: How chefs work
description: How experienced chefs structure cooking knowledge (ratios, mother sauces, components), season, pair flavours, develop dishes, cook from stock and run a kitchen; what a tool should do and the data model that follows.
tags: [research, cooking, ratios, components, pairing, data-model]
generated: { by: claude-code/2.1.326, at: 2026-11-17 }
sources:
  - id: ratio
    title: 'Michael Ruhlman: Ratio'
  - id: nosrat
    title: 'Samin Nosrat: Salt Fat Acid Heat'
  - id: escoffier
    title: 'Auguste Escoffier: Le Guide Culinaire'
  - id: flavorbible
    title: 'Karen Page, Andrew Dornenburg: The Flavor Bible'
  - id: segnit
    title: 'Niki Segnit: The Flavour Thesaurus'
  - id: ahn
    title: 'Ahn et al.: Flavor network and the principles of food pairing, Scientific Reports (2011)'
  - id: jain
    title: 'Jain, Rakhi, Bagler: Analysis of food pairing in regional cuisines of India (2015)'
  - id: kalyuga
    title: 'Kalyuga et al.: The expertise reversal effect (2003)'
  - id: ratios
    title: Ratios and salt percentages checked against sources
    url: ratios.md
---

# How chefs work

> Written from recalled knowledge of the named books, not from the
> books at hand. The numbers were checked on 2026-11-17 and corrected
> where a source disagreed; status, basis and source of each are in
> [ratios](ratios.md)[^ratios]. Most checks rest on search excerpts and
> must be re-read at the source before they become data.

# Structures instead of recipes

- Ratios by weight[^ratio]: bread 5 flour : 3 water; pasta 3 flour :
  2 egg; pie dough 3 flour : 2 fat : 1 water; cookie 3 flour : 2 fat :
  1 sugar; pound cake 1 : 1 : 1 : 1; vinaigrette 3 oil : 1 acid; roux
  1 : 1 to 3 flour : 2 fat (Ruhlman's as reported is 3 : 2); custard
  2 liquid : 1 egg (unverified).
- Baker's percentages: flour is 100 %; water about 56 % for Neapolitan
  pizza (60–65 % for other styles unverified) and 75–85 % for ciabatta;
  salt 1.8–2 %.
- Mother sauces[^escoffier]: béchamel, velouté, espagnole, hollandaise,
  tomato; each a thickener or emulsion plus a liquid, with named
  derivatives. The model is a family tree of one structure.
- A dish is built from prepared components with roles: main element,
  sauce, crunch, acid, garnish, often a starch.

# Seasoning and balance

- Salt has numbers: soups about 0.4–0.5 % (sauces unverified), bread
  1.8–2 % of flour, sauerkraut 2–3 % of cabbage, wet brine 5–9 % of the
  brine, pasta water 0.5–2 % of the water.
- Everything else is a loop of tasting and correcting[^nosrat]:
  flat → salt, then acid; harsh or sour → fat or sweetness; too sweet →
  acid or bitterness; bitter → salt, fat or sweetness; too salty →
  dilute.
- Contrast is a checklist: crisp against soft, hot against cold.

# Pairing

- Used in practice: affinity lists from experience, season and
  region[^flavorbible][^segnit], and "what grows together goes together".
- Pairing by shared aroma compounds holds statistically for Western
  cuisines, is reversed in East Asian ones[^ahn] and negative in Indian
  cuisine[^jain]. It ignores concentration and what cooking does. It is
  a hint for something new, never a score of reliability.

# Developing dishes

Start from an ingredient, a season or a known structure with one slot
swapped. Change one thing per test. A notebook keeps versions with date,
change, reason and tasting note.

# Cooking from what is there

Kitchens use the oldest first, plan one ingredient into several dishes
and turn trim into stock and staff meals. To answer "what can I make"
a tool needs per item: amount, state (raw, cooked, prepared), date and
remaining shelf life, role, allergens and substitution class. Results
rank by how soon things must be used, then by how many roles they
cover.

# Operations

- Standard recipes have a yield, a portion and sub-recipes.
- As purchased against edible portion: yield = edible / purchased; cost
  per edible unit = price / yield.
- Prep list = par level minus stock.
- Scaling goes by weight; cooking time and salt do not scale linearly.
- Allergens: the 14 of EU Regulation 1169/2011.

# What stays useful with experience

Step-by-step guidance helps novices and hinders experts[^kalyuga].
Timers and glossaries lose their value. What keeps it: scaling and
conversion, yields and cost, allergens, stock, notes and versions, quick
recall of ratios and affinities.

# What Culina should do

Ranked for the experienced cook:

1. A notebook with versions, tasting notes and variations.
2. Ratio and template cards with their family of variations.
3. Components that scale by weight with yields.
4. Cooking from stock by expiry and role.
5. Affinities with source and confidence.
6. The correction checklist.
7. Cost, prep lists, allergens.

For the learner the order starts with guided steps, technique and
substitutions; guidance must be collapsible.

# Data model that follows

- **Ingredient**: a tree of category and variety; roles (acid, fat,
  aromatic, crunch, starch, umami); season; allergens; yield per state;
  shelf life.
- **Ratio or template**: a named formula, the roles it uses, its
  derivatives.
- **Component**: a recipe with its own yield, amounts by weight or
  percentage, and a role. A dish has role slots filled by components.
- **Version**: date, change, reason, tasting note.
- **Stock item**: amount, state, date prepared, use by.
- **Affinity**: two ingredients, strength, context (cuisine, season,
  technique), source and confidence.
