---
type: Specification
title: The entry of the list
description: The fields of an entry of the household's shopping list, its origins, the record it is in the collection list of a space, and what counts as an entry when another app or device wrote the record. Moved from Emptio's data model on 2026-11-24, unchanged.
tags: [list, entry, record, collection, origins]
generated: { by: claude-code, at: 2026-11-24 }
sources:
  - id: emptio-data-model
    title: 'Emptio: data model (where this section was until 2026-11-24)'
    url: ../../../apps/emptio/docs/data-model.md
  - id: spaces
    title: 'hospes: spaces (records, collections, the shared database domus)'
    url: ../../host/docs/spaces.md
---

# The entry of the list

An entry is one record of the collection `list` (`LIST`) of a space:
`{ key, updatedAt, value }`, the key is the entry's id, the value the
fields below[^spaces]. Every app on the address writes it in the shared
database `domus`: Emptio, and Culina when it hands what a dish lacks to
the list. Emptio's other collections (categories, stores, KitchenOwl)
are Emptio's ([data model](../../../apps/emptio/docs/data-model.md)).
Until 2026-11-24 this section was in Emptio's data model[^emptio-data-model].

| Field          | Type                        | Meaning                                                                       |
| -------------- | --------------------------- | ----------------------------------------------------------------------------- |
| `name`         | text, not empty             | What to buy, as typed or as the catalogue names it                            |
| `ingredientId` | text, optional              | The id of the ingredient in the shared food catalogue; absent for a free name |
| `categoryId`   | text                        | A category of Emptio; `other` when none fits                                  |
| `priority`     | `now`, `soon`, `sometime`   | How pressing; a new entry gets `soon`                                         |
| `amount`       | text, optional              | Free text ("2 packs")                                                         |
| `note`         | text, optional              | Free text                                                                     |
| `addedAt`      | timestamp                   | When it was put on the list                                                   |
| `origins`      | list, at least one          | Why it is on the list, see below                                              |
| `bought`       | optional                    | `{ at, storeId? }`: ticked at that time, in that store; absent while open     |
| `notAt`        | list of store ids, optional | Stores where it was looked for and not found ("not here")                     |

An origin is one of:

- `{ kind: 'typed' }`: a person added it;
- `{ kind: 'recipe', app, title, dish? }`: handed over by a sister app
  (`app` is `culina` or `mixtura`) for the recipe or drink of that
  title; Culina writes it since 2026-11-24 (no screen offers it yet).
  `dish`, optional, since 2026-11-24: what the dish is in that app, the
  same in every language (Culina: `shipped:<id>`, `#<filling>` where one
  was chosen). The title is in the cook's language and two dishes may
  share one, so rule 5 and Culina's hand-over know a dish by `dish`
  where both origins carry one, else by the title;
- `{ kind: 'staple' }`: a staple that returned (later).

The ingredient ids are those of Culina's catalogue (`fdc-<number>`,
from USDA FoodData Central), so an entry Culina hands over and one a
person picked in Emptio from an earlier entry are the same thing when
the ids are equal ([rule 5](rules.md#5-twice-the-same)).

Ticking writes `bought`; ticking again removes it. Clearing the bought
entries removes their records.

## What counts as an entry

The collection is shared, so nothing in it is trusted. `isEntryValue`
takes a value with the fields above in their types (a timestamp is
`YYYY-MM-DDThh:mm:ss[.fff]Z`, at least one origin, a recipe origin with
`app` and `title`); fields it does not know do not matter. `entriesOf`
gives the live records with such a value, the key as id. A record that
is no entry is not shown and is left untouched; a value that is written
again keeps the fields an app does not know (`valueFor`).

[^spaces]: hospes, spaces, ../../host/docs/spaces.md

[^emptio-data-model]: Emptio, data model, ../../../apps/emptio/docs/data-model.md
