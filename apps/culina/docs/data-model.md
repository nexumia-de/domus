---
type: Specification
title: Data model
description: Every entity Culina stores (ingredient, ratio template, component, dish, stock item, affinity) and the export file, with fields, required flags, units, ids, what is stored versus derived, which part is the general model shared with Mixtura and which is kitchen-specific, how it stays compatible with both Cooklang outcomes, and the open questions with proposals.
tags: [data-model, schema, json-schema, units, ids, export, ratios, components, yield]
generated: { by: claude-code/2.1.326, at: 2026-11-17 }
sources:
  - id: chef
    title: 'How chefs work, section "Data model that follows"'
    url: chef-practice.md
  - id: ratios
    title: Ratios and salt percentages checked against sources
    url: ratios.md
  - id: vectors
    title: Test vector format
    url: vectors.md
  - id: cooklang
    title: Whether Culina reads and writes Cooklang files (decision record, needs decision)
    url: decisions/cooklang.md
  - id: tools
    title: Existing tools and data
    url: existing-tools.md
  - id: mixmodel
    title: 'Mixtura: Data model (read for structure only; nothing copied)'
    url: https://github.com/nexumia-de/mixtura/blob/main/docs/data-model.md
  - id: mixshared
    title: 'Mixtura: Shared model inventory (which parts are general)'
    url: https://github.com/nexumia-de/mixtura/blob/main/docs/shared-model.md
  - id: ka
    title: "King Arthur Baking: What is baker's math (total formula, preferment, final mix; read 2026-11-17)"
    url: https://www.kingarthurbaking.com/blog/2022/04/28/what-is-bakers-math-and-how-can-i-use-it-in-my-everyday-bread-baking
  - id: busby
    title: "Busby's Bakery: Bakers percentages and bakers formulas (pre-fermented flour; search excerpt only, host blocked)"
    url: https://busbysbakery.com/bakers-percentages/
  - id: yield
    title: 'Basic Kitchen and Food Service Management (BC Campus): Yield testing (AP, EP, yield percentage, cost factor; search excerpt only, host blocked)'
    url: https://opentextbc.ca/basickitchenandfoodservicemanagement/chapter/yield-testing
  - id: eu
    title: 'Regulation (EU) 1169/2011, Annex II, substances causing allergies or intolerances (read 2026-11-17)'
    url: https://www.legislation.gov.uk/eur/2011/1169/annex/II
  - id: cooklangspec
    title: 'Cooklang specification README (ingredients @name{qty%unit}, recipe references, no percentage notation; read 2026-11-17)'
    url: https://raw.githubusercontent.com/cooklang/spec/main/README.md
  - id: orf
    title: 'Open Recipe Format (techhat/openrecipeformat): README; YAML based, field reference host blocked'
    url: https://raw.githubusercontent.com/techhat/openrecipeformat/master/README.rst
  - id: mealie
    title: 'Mealie: recipe schema (recipe.py; yield as quantity and text, ingredients as a list; ingredient type not read)'
    url: https://raw.githubusercontent.com/hay-kot/mealie/mealie-next/mealie/schema/recipe/recipe.py
  - id: schemaorg
    title: 'schema.org/Recipe: recipeIngredient as plain text (taken from the Cooklang decision record; schema.org itself blocked)'
    url: decisions/cooklang.md
  - id: jsonschema
    title: 'JSON Schema: Structuring a complex schema ($id, $defs, $ref, $schema, draft 2020-12; read 2026-11-17)'
    url: https://json-schema.org/understanding-json-schema/structuring
  - id: ajv
    title: 'Ajv 8.17.1 (MIT), licence read from its package.json; 2020-12 class ajv/dist/2020'
    url: https://www.npmjs.com/package/ajv/v/8.17.1
---

# Data model

What Culina stores, what it derives, and the JSON Schemas that pin the
stored shapes. It is written before any engine or store code, so the
engine (issues 8, 9, 10) and the store (3.1) start from one agreed shape.
The machine-readable form is in
[`packages/engine/schemas/`](../packages/engine/schemas/); a test fails
when a field in the tables below is missing in a schema or the other way
round, or when a "Required" cell differs from the schema.

Principle: **derive, don't store** ([AGENTS.md](../AGENTS.md)). Only
what the user entered, and seed data, is stored. Yields, losses,
percentages, cost, "what can I make" and rankings are computed every
time from stored amounts ([stored versus derived](#stored-versus-derived)).
No kitchen number is defined in this document: a field that needs a
figure (yield, density, usual range) has no default and carries its
source.

# General model and kitchen-specific parts

[Mixtura's shared model inventory](https://github.com/nexumia-de/mixtura/blob/main/docs/shared-model.md)[^mixshared]
lists what is general and will move into shared code; where that code
lives is still an owner decision (issue 2), so Culina holds no engine
code and **copies nothing**: the schemas here are written for Culina's
model. Where the shared code exists, the "general" columns below are
replaced by a reference to it.

| Entity                  | General model (Mixtura inventory module)                  | Kitchen-specific here                                                                     |
| ----------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Amounts and units       | `amounts/`: number plus unit, conversion, scaling         | Kitchen unit set; mass is canonical; density and unit weight per ingredient               |
| Ingredient              | `ingredients/` tree, inheritance, shelf life              | Yield per state (as purchased to edible), season, allergens, density, unit weight         |
| Ratio template          | `templates/` roles, slots, matching, variants             | Parts by mass with an anchor role, ranges from sourced rows, derivatives as changes       |
| Component               | `ingredients/prepared.ts`: nesting, cycles, yield         | Yield by weight, percentage lines, baker's percentage base, method steps                  |
| Dish                    | `templates/slots.ts`: roles filled by things              | Dish roles (main, sauce, crunch, acid, garnish, starch) and portions                      |
| Version                 | `specs/`: versions, family, diff                          | Tasting notes; diff fields are lines, yield and method                                    |
| Stock item              | `stock/` and `shelf/`: what is held, dates, fresh or past | Amount and state on stock, date prepared, use by                                          |
| Affinity                | `affinity.schema.json` exists in Mixtura                  | Context is cuisine, season, technique; later (issue 27 and the pairing work), no code yet |
| Export file             | `exchange/`: envelope, version check, migrations          | Culina's entity kinds                                                                     |
| Nutrition, salt figures | none (balance is drink-only)                              | Kitchen rules, derived; see [nutrition](nutrition-evaluation.md)                          |

The shared model's seams matter for the shapes: roles are **data** (an id,
not a closed union), the measure of a template is a parameter (here
always mass), and units are a table, not code.

# Ids

- **Seed ids** are lower-case slugs (`^[a-z0-9]+(-[a-z0-9]+)*$`, at most
  80 characters), readable and stable: `wheat-flour`, `bread-dough`. They
  are never reused for another thing.
- **User ids** are `u-` plus a lower-case UUID, generated by the host
  (the engine has no randomness), so two devices never collide and an
  import cannot overwrite a seed entity.
- One `id` pattern in `common.schema.json` accepts both; "user entities
  use the `u-` form" is a rule of the store, not of the schema.
- **Renaming** changes `name` only; ids never change. Seed entities are
  read-only: to change one, the user makes a new entity with the seed
  one as parent.
- A reference to nothing is not repaired silently: the engine reports
  the line as unresolved and everything derived from it is marked
  incomplete.
- A version is a separate record with its own id (see
  [Version](#version)); `family` is the id of the first version.

# Units and dates

| Quantity         | Stored as                                   | Note                                                                                     |
| ---------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Mass             | number plus `g`, `kg`, `oz`, `lb`           | As entered. Grams are canonical for every computation; conversion is derived             |
| Volume           | number plus `ml`, `l`, `tsp`, `tbsp`, `cup` | Only convertible to mass with the ingredient's `densityGPerMl`; otherwise an error       |
| Count            | number plus `count`                         | Only convertible with the ingredient's `unitWeightG` (an egg, a clove)                   |
| Percent of base  | number plus `percent`                       | Component lines only: percent of the summed mass of the `percentBase` role (flour = 100) |
| Yield of an item | percent of the weight as purchased          | Above 100 is possible (cooked rice, pasta)                                               |
| Shelf life       | whole days                                  | Per state and storage                                                                    |
| Date             | `YYYY-MM-DD`                                | Entered by the user or supplied by the host                                              |
| Instant          | ISO 8601 UTC with `Z`                       | Only `exportedAt`, supplied by the host                                                  |

Rules:

- **Amount** is always a number and a unit id, never a string such as
  `"1 1/2 cups"`; the number is greater than zero.
- **Mass first.** Professional kitchens and bakers work by weight; volume
  and count are conversions that need data about the ingredient, and
  where that data is missing the engine answers "cannot convert", never
  a guess ([engine rules](engine-rules.md)). The unit table (factors, US
  customary definitions of `tsp`, `tbsp` and `cup`) is
  `packages/engine/data/units.json`; the schema only fixes the ids.
- **Dates without a clock.** The engine has no clock. Every function that
  needs "today" takes it as an input `YYYY-MM-DD`; days left are whole
  calendar days between two such dates. The store or the app supplies
  today. Stored dates are those the user entered (`preparedOn`, `useBy`,
  version `date`, tasting `date`).
- **Rounding** happens only at the explicit output step; stored numbers
  keep what was entered.

# Entities

Every table lists the top-level fields of the schema of the same name.
"Required" is `yes` or `no`. All entity schemas set
`additionalProperties: false` and allow vendor fields that start with
`x-`. Nested objects are described under each table.

## Ingredient

A node of the ingredient tree: a category (alliums) or a variety (red
onion). Properties left out are inherited from the parent; a child
overrides. Schema: `ingredient.schema.json`; valid and invalid
examples in `schemas/examples/`.

| Field           | Type                 | Required | Meaning                                                                                  |
| --------------- | -------------------- | -------- | ---------------------------------------------------------------------------------------- |
| `id`            | id                   | yes      | See [ids](#ids)                                                                          |
| `name`          | string               | yes      | Visible name                                                                             |
| `parentId`      | id                   | no       | Parent in the tree; absent for a root                                                    |
| `roles`         | array of role id     | no       | Roles the ingredient can play (acid, fat, aromatic, crunch, starch, umami, flour, water) |
| `season`        | object               | no       | `months` (1 to 12), optional `region`, `source`                                          |
| `allergens`     | array of allergen id | no       | Reserved for issue 27: the 14 of Annex II[^eu]; declared, never derived                  |
| `yields`        | array of object      | no       | `state`, `percent`, `source`: weight in that state as percent of purchased weight        |
| `shelfLife`     | array of object      | no       | `state`, `storage`, `days`, `source`                                                     |
| `densityGPerMl` | sourced number       | no       | Grams per millilitre; needed for volume to mass                                          |
| `unitWeightG`   | sourced number       | no       | Grams per counted piece; needed for count to mass                                        |
| `note`          | string               | no       | Free text                                                                                |

- **Level is derived.** Category or variety is the position in the tree,
  not a field.
- **As purchased versus edible portion.** `yields` records, per state,
  the weight that remains as a percentage of the weight as bought;
  edible portion yield = edible / purchased[^yield]. Purchased to edible
  and back is derived. An ingredient with no recorded yield for a state
  is "unknown", never 100 %.
- **Sourced numbers.** Yield, shelf life, density and unit weight must
  name a source: the word `user` for the user's own measurement,
  otherwise a citation. Nothing is invented.
- **Allergens.** The ids are `gluten`, `crustaceans`, `eggs`, `fish`,
  `peanuts`, `soybeans`, `milk`, `nuts`, `celery`, `mustard`, `sesame`,
  `sulphites`, `lupin`, `molluscs`, one per Annex II entry[^eu]. The field
  exists so that adding the data later changes no schema; Culina's
  engine does not read it before issue 27. Exceptions that Annex II
  lists for some entries, and "may contain", are part of that issue.

## Ratio template

A named formula by mass: parts per role, an anchor role, optional usual
ranges, and derivatives that change a parent. Schema:
`template.schema.json`.

| Field      | Type            | Required | Meaning                                                                                  |
| ---------- | --------------- | -------- | ---------------------------------------------------------------------------------------- |
| `id`       | id              | yes      | See [ids](#ids)                                                                          |
| `name`     | string          | yes      | Visible name                                                                             |
| `source`   | source          | yes      | Row of [ratios](ratios.md)[^ratios] or `user`                                            |
| `parentId` | id              | no       | The template this one derives from; with `changes`, instead of `parts`                   |
| `anchor`   | role id         | no       | Role whose parts are 100 percent in baker's terms; absent means no percentages           |
| `parts`    | array of object | no       | Roots only: `role`, `parts` (above 0), optional `range` (`min`, `max`)                   |
| `changes`  | array of object | no       | Derivatives only: `add` (role, parts), `remove` (role), `swap` (role, `ingredientClass`) |
| `note`     | string          | no       | Free text                                                                                |

- **Root or derivative, not both**: a template has `parts` and no
  `parentId`, or `parentId` and `changes` and no `parts` (checked by the
  schema). The family tree is the `parentId` links; children, ancestors
  and siblings are derived. Cycles cannot be excluded by a schema and
  are rejected by the engine (issue 9).
- **Ratios and baker's percentages are one thing.** A ratio 5 flour : 3
  water has `parts` 5 and 3; a baker's formula has the anchor at 100
  (flour 100, water 56, salt 3) and its numbers are percentages. The
  percentage of a role is parts / parts of anchor x 100, derived. This
  is the same mechanism as Mixtura's slot ratios, measured by mass
  instead of volume[^mixshared].
- **Ranges** are in the same parts as `parts`, only from rows of
  [ratios](ratios.md) that give a range (salt in Neapolitan dough 2.8 to
  3.1 %). Where a source gives one value, the template has no range and
  the check reports the deviation only. That `min` is not above `max` is
  checked by the engine. The range check says `below`, `within`,
  `above`, never "wrong" ([vectors](vectors.md)[^vectors]).
- Roles are the shared id space of [roles](#roles). `ingredientClass` is
  a node of the ingredient tree.

## Component

A made item with its own output weight: a sauce, a dough, a stock, a
preferment. It is the recipe: amounts by weight or percentage, roles,
nesting. Schema: `component.schema.json`. One stored record is one
[version](#version).

| Field         | Type            | Required | Meaning                                                                     |
| ------------- | --------------- | -------- | --------------------------------------------------------------------------- |
| `id`          | id              | yes      | See [ids](#ids)                                                             |
| `name`        | string          | yes      | Visible name                                                                |
| `role`        | role id         | no       | The dish role it usually fills (sauce, crunch, starch)                      |
| `templateId`  | id              | no       | The ratio template it follows; the range check compares against it          |
| `percentBase` | role id         | no       | Role whose summed mass is 100 percent for lines given in `percent`          |
| `lines`       | array of object | yes      | `ref` (ingredient or component), optional `amount`, `role`, `state`, `note` |
| `yield`       | object          | no       | `amount` (mass) and `source`: the output weight as weighed                  |
| `method`      | array of string | no       | Steps as text                                                               |
| `version`     | object          | yes      | See [Version](#version)                                                     |
| `tastings`    | array of object | no       | `date` and `text`                                                           |

- **Lines.** An amount is mass, volume or count, or `percent` of the
  `percentBase` mass. A line without an amount ("salt to taste") is kept
  and reported as unmeasured by anything derived.
- **Nesting.** A line may refer to another component by mass of its
  output. Needing 200 g of a sauce whose `yield` is 800 g takes a quarter
  of its recipe; a component without `yield` cannot be used by mass, and
  the engine says so (issue 10). Cycles are rejected by the engine.
- **Preferments and the two formulas.** A preferment (poolish, biga,
  levain) is a component with its own lines (flour, water). The **final
  dough** formula is the dough's own lines, the preferment as one line;
  the **total formula** counts the preferment's flour and water into the
  dough's flour and water. Professional bakers keep both: the total
  formula is every ingredient, the final mix is the total minus the
  preferment[^ka], and the pre-fermented flour is the share of total
  flour that is in the preferment[^busby]. Culina stores only the nested
  structure; both formulas, the pre-fermented flour and hydration with
  or without the preferment come from expanding it.
- **Yield.** Output weight is entered because cooking loses water and
  only the cook can weigh it; total input and loss are derived. Yield
  percent is not stored.
- **Standardised recipe.** A component with lines, yield and portions
  (on the dish) is the standardised recipe of a professional kitchen:
  quantities, yield, portion size and sub-recipes in one record[^yield].

## Dish

Role slots filled by components or ingredients. Schema: `dish.schema.json`.
One stored record is one [version](#version).

| Field      | Type            | Required | Meaning                                                                |
| ---------- | --------------- | -------- | ---------------------------------------------------------------------- |
| `id`       | id              | yes      | See [ids](#ids)                                                        |
| `name`     | string          | yes      | Visible name                                                           |
| `portions` | integer         | no       | Number of portions the dish makes                                      |
| `slots`    | array of object | yes      | `role`, `ref` (ingredient or component), optional `amount`, `optional` |
| `version`  | object          | yes      | See [Version](#version)                                                |
| `tastings` | array of object | no       | `date` and `text`                                                      |
| `note`     | string          | no       | Free text                                                              |

Weight per portion, the roles covered ("no crunch") and what is missing
from stock are derived. A slot's amount is mass, volume or count, not
percent.

## Version

Not an entity of its own: the `version` object in a component or dish,
plus its `tastings`. Fields of `version`: `family` (id of the first
version), `date`, optional `parent`, `change`, `reason`.

- A new version is a new record, so every version stays complete and a
  diff is derived. `parent` in the same family is the previous version;
  `parent` in another family makes the record the first of a **variation**
  in a new family, which is how "my version of that" is kept.
- The head of a family is its latest version by date and parent chain;
  the version number is derived.
- A tasting note belongs to the version it was made on and may be added
  later.

## Stock item

What the user has. Schema: `stock.schema.json`.

| Field        | Type   | Required | Meaning                            |
| ------------ | ------ | -------- | ---------------------------------- |
| `id`         | id     | yes      | See [ids](#ids)                    |
| `ref`        | ref    | yes      | An ingredient or a component       |
| `amount`     | amount | yes      | Mass, volume or count; not percent |
| `state`      | state  | yes      | `raw`, `cooked` or `prepared`      |
| `preparedOn` | date   | no       | When it was cooked or made         |
| `useBy`      | date   | no       | The date the user entered          |
| `note`       | string | no       | Free text                          |

Days left, "use soon" and "past", the limiting shelf life of a dish and
"what can I make, ranked by what must go first" are derived. If `useBy`
is absent, the engine may derive a date from `preparedOn` plus the shelf
life of the ingredient or component for that state; it never writes it
back.

## Affinity

Later extension, schema only: two ingredients that go together. Schema:
`affinity.schema.json`. No code and no data before the pairing work;
data would need a source and licence of its own (no FlavorDB).

| Field        | Type    | Required | Meaning                                                   |
| ------------ | ------- | -------- | --------------------------------------------------------- |
| `id`         | id      | yes      | See [ids](#ids)                                           |
| `a`          | id      | yes      | First ingredient                                          |
| `b`          | id      | yes      | Second ingredient; the pair is unordered                  |
| `strength`   | integer | yes      | 1 to 3                                                    |
| `context`    | object  | no       | Optional `cuisine`, `season` (month 1 to 12), `technique` |
| `source`     | source  | yes      | Citation or `user`                                        |
| `confidence` | enum    | yes      | `low`, `medium`, `high`                                   |

## Roles

Roles are data, not a closed list: an id in one shared space for
ingredient roles (acid, fat, aromatic, crunch, starch, umami, and the
ratio roles flour, water, egg, sugar, oil, liquid) and dish roles (main,
sauce, crunch, acid, garnish, starch). The seed list comes with the seed
data; a role id nobody defined is reported as unknown by the engine, not
refused by the schema. There is no role entity yet (open question 2).

# Stored versus derived

| Stored (user entry or seed)                    | Derived every time                                                      |
| ---------------------------------------------- | ----------------------------------------------------------------------- |
| Amounts as entered (value and unit)            | Grams, conversions, scaled amounts                                      |
| Template parts and ranges                      | Percentages, shares, position against the range, family tree            |
| Component lines, `percentBase`                 | Raw ingredients through any nesting depth, total and final formula      |
| Component `yield` (weighed output)             | Loss, yield percent, portions weight                                    |
| Ingredient `yields`                            | Purchased to edible and back; unknown stays unknown                     |
| Ingredient density and unit weight             | Volume and count to mass                                                |
| `version` and `tastings`                       | Version number, head of a family, diff, variation tree                  |
| Stock `amount`, `state`, `preparedOn`, `useBy` | Days left, use soon, past, makeable, what must go first, what to buy    |
| Ingredient `shelfLife`                         | Use-by date from `preparedOn`; a dish's limiting shelf life             |
| Allergens as data (reserved)                   | Allergens of a dish: union over its expanded ingredients (issue 27)     |
| (nothing)                                      | Cost per edible unit, nutrition per portion, hydration, salt percentage |

A schema test refuses `totalMassG`, `lossPercent`, `daysLeft`, a stored
`percent` on a template part and a stored ingredient `level`.

# Export

## Export file

One JSON file with everything the user entered, validated by
`export.schema.json`.

| Field           | Type     | Required | Meaning                    |
| --------------- | -------- | -------- | -------------------------- |
| `format`        | constant | yes      | `culina-export`            |
| `formatVersion` | integer  | yes      | `1`                        |
| `seedVersion`   | string   | no       | Seed data the ids refer to |
| `exportedAt`    | instant  | no       | Supplied by the host       |
| `ingredients`   | array    | no       | Ingredient records         |
| `templates`     | array    | no       | Template records           |
| `components`    | array    | no       | Component records          |
| `dishes`        | array    | no       | Dish records               |
| `stock`         | array    | no       | Stock item records         |
| `affinities`    | array    | no       | Affinity records           |

```json
{
  "format": "culina-export",
  "formatVersion": 1,
  "seedVersion": "0",
  "exportedAt": "2026-11-17T12:00:00Z",
  "components": [],
  "stock": []
}
```

- `format` is the constant `culina-export`; `formatVersion` is an
  integer (the same name Mixtura uses; the issue called it
  `schemaVersion`). `seedVersion` names the seed data that ids refer to.
- Arrays `ingredients`, `templates`, `components`, `dishes`, `stock`,
  `affinities` are optional; the export holds user entities, seed entities
  stay in the seed.
- **Forward compatibility.** A reader checks `format` and
  `formatVersion` **first** and refuses a higher version with a message
  that says to update; it never validates a newer file against an older
  schema. Within one `formatVersion` the schemas are closed
  (`additionalProperties: false`), except for fields that start with `x-`,
  which are kept and written back untouched. Any other new field, or a new
  enum value, raises `formatVersion` and comes with a pure migration
  from the previous version to the next. Older files are read by
  migrating step by step.
- Identity: importing never overwrites a seed entity, and a user id that
  exists is merged or replaced by the user's choice (the merge mechanism
  is the general part of the exchange module[^mixshared]).
- Cross-record rules a schema cannot state (references exist, no
  cycles, `min` not above `max`, one anchor) are the engine's job and
  its errors are named, not silent.

# Cooklang

[Cooklang](decisions/cooklang.md)[^cooklang] is undecided (needs
decision, issue 6); the model works either way.

- **Own JSON as the lossless format**: the recommendation of the decision
  record. Nothing in this model depends on Cooklang.
- **Cooklang as a one-way export**: an ingredient line maps to
  `@name{qty%unit}` and a line referring to a component maps to a recipe
  reference such as `@./sauces/Hollandaise{150%g}`[^cooklangspec]. Cooklang has no
  percentage notation, so `percent` lines are converted to mass first
  (derived from `percentBase`). Version, tasting notes, roles, ranges and
  yield per state have no Cooklang place and are lost or go into
  metadata.
- **If import is chosen**: `amount` is optional on a line and `method`
  holds steps as text, so a recipe without quantities or with units the
  model does not know can still be kept (the unit goes into `note`, the
  line stays unmeasured). Cooklang metadata maps to `source` and `note`;
  an imported file is a component with a new family. Volumes stay
  volumes until a density is known.
- Because both outcomes only add or drop information at the edge, the
  decision does not change a schema.

# Practice behind the choices

How professional kitchens model the same things, and where open formats
fall short for ratio and component thinking.

- **Baker's percentages.** Flour is 100 %, every other ingredient is a
  percentage of the flour weight; formulas are written as total formula,
  preferment and final mix[^ka]. Culina's anchor and `percentBase` are
  that idea for any template.
- **As purchased versus edible portion.** Kitchens cost and plan on the
  edible portion: yield % = EP / AP x 100, cost factor = 100 / yield %,
  and the amount to order is the needed EP divided by the yield[^yield].
  All of this is derived from `yields`; the cost half waits for issue
  5.3.
- **Standardised recipes and sub-recipes.** One record with quantities,
  yield, portion size and references to other recipes[^yield]; Culina's
  component plus dish.
- **schema.org/Recipe.** `recipeIngredient` is a list of plain text
  strings and `recipeYield` a quantity or servings[^schemaorg]: no
  separate amount, unit and ingredient, no nesting, no percentages.
- **Cooklang.** Typed quantities with units, recipe references for
  sub-recipes, YAML metadata; no percentages, ratios, yield per state or
  versions[^cooklangspec].
- **Open Recipe Format.** YAML based, aimed at storing recipes
  accurately[^orf]; its field reference could not be read (host blocked),
  so nothing is claimed about its ingredient shape.
- **Mealie and Tandoor.** Mealie's recipe model has a yield as quantity
  and text, an ingredient list, steps and notes[^mealie]; its ingredient
  type was not read. Tandoor's model could not be confirmed from its
  documentation. Both are recipe managers ([existing
  tools](existing-tools.md)[^tools]).
- **Where they fall short** for Culina: none treats a ratio or template
  as the primary thing, none carries a baker's percentage base, a
  yield per state, a sub-component's yield used for scaling, or
  tasting-note versions in the format itself.

# Schemas and tests

- `common`, `ingredient`, `template`, `component`, `dish`, `stock`,
  `affinity`, `export` in `packages/engine/schemas/`, JSON Schema draft
  2020-12[^jsonschema]. Each has an absolute `$id`
  (`https://nexumia-de.github.io/culina/schemas/<name>.schema.json`; an
  identifier, not necessarily a place to download), shared types live in
  `common.schema.json` under `$defs` and are referenced with `$ref`, and
  the export schema refers to the entity schemas.
- Every entity schema is closed with `additionalProperties: false` and
  allows `x-` fields through `patternProperties`.
- `packages/engine/schemas/examples/<name>.valid.json` and
  `<name>.invalid.json`: one of each per schema.
  `packages/engine/test/schemas.test.ts` validates them with Ajv[^ajv]
  (draft 2020-12, strict mode), adds the invalid cases the issue names
  (missing unit, negative amount, unknown state), refuses derived fields
  and checks that these tables and the schemas agree.
- The examples are test fixtures with the user's own made-up entries
  (`source` is `user`), not seed data; the ratios and ranges in the
  template example are rows of [ratios](ratios.md).

# Open questions

For the owner; each has a proposal.

1. **Where the general schemas live** (issue 2). _Proposal:_ keep
   `common.schema.json` here until the shared package exists; then replace
   the general types by a reference to the shared schema and keep the
   kitchen fields; the table-agreement test then reads both.
2. **Roles: id space and a role entity.** _Proposal:_ open ids with a
   seed list; no role entity until a screen needs names and descriptions.
   The ratio roles (flour, water, egg) and dish roles share one space, so
   "crunch" can be both.
3. **Preferment as a component, not a flag.** _Proposal:_ as written: a
   preferment is a component; total formula, pre-fermented flour and
   hydration come from expansion. A sourdough starter's own hydration is
   then simply the starter's lines; counting or not counting it in
   overall hydration is a choice of the function (issue 8), because
   sources differ[^busby].
4. **States.** `raw`, `cooked`, `prepared` are a closed enum; peeled,
   trimmed, roasted or frozen are not states. _Proposal:_ keep three; a
   fourth is a format version bump. Trim loss is already inside
   `yields` from raw to the edible state.
5. **Cup, tablespoon, teaspoon.** _Decided (issue 8):_ US customary, in
   the unit table with exact factors (cup = 231 · 2.54³ / 16 ml =
   236.5882365 ml, tbsp = cup / 16, tsp = tbsp / 3); no metric cup. See
   [engine rules](engine-rules.md#units-and-factors).
6. **Allergens before issue 27.** _Proposal:_ keep the reserved field
   (data may be entered, the engine ignores it), and let issue 27 decide
   "may contain" and the Annex II exceptions.
7. **One export file for everything or per kind.** _Proposal:_ one file,
   as written; a single recipe handed to someone else is a file with one
   component and what it references.
8. **Name of the version field**: `formatVersion` instead of the issue's
   `schemaVersion`. _Proposal:_ `formatVersion`, equal to Mixtura, so a
   shared exchange module needs no mapping.
9. **Cross-record validation.** Schemas cannot check references, cycles or
   `min` <= `max`. _Proposal:_ a pure `validateModel` in the engine
   (issues 9 and 10) with named errors; a later issue.
