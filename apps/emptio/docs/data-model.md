---
type: Specification
title: Data model
description: Every stored entity of Emptio (entry, category, store) with fields, ids and timestamps, what is derived and never stored, how the entities are records in collections of Emptio's file in the household's place, and the limits of merging.
tags: [data-model, entry, category, store, sync, records]
generated: { by: claude-code/2.1.327, at: 2026-11-18 }
sources:
  - id: materia-sync
    title: materia, docs/sync.md (sync record, merge rules, unit documents)
    url: ../../../packages/model/docs/sync.md
---

# Data model

What is stored is what a person entered. Everything else is derived by
the [engine rules](engine-rules.md). The plan behind it:
[how Emptio is built](architecture.md).

# Records

Every entity is one sync record of materia[^materia-sync]:
`{ key, updatedAt, value }`, or `{ key, updatedAt, deleted: true }` for
a removed one. `updatedAt` and every other time is a UTC timestamp
`YYYY-MM-DDThh:mm:ss[.fff]Z`. Ids are made by the app (the engine gets
them as input) and never reused.

The records live in collections of a **space** (a household, or this
device alone), in the database `domus` that the apps on the address
share, each collection one sealed file in the space's storage
([spaces](../../../packages/host/docs/spaces.md),
[behaviour](behaviour.md#spaces)). Since 2026-11-20; the plan of
2026-11-18 had a file per app in a place.

| Collection        | Key                   | Holds                                                             | Built in   |
| ----------------- | --------------------- | ----------------------------------------------------------------- | ---------- |
| `list`            | the entry id          | [Entry](../../../packages/list/docs/entry.md), shared with Culina | Goal 1     |
| `list-categories` | the category id       | [Category](#category)                                             | Goal 1     |
| `stores`          | the store id          | [Store](#store)                                                   | Goal 3     |
| `kitchenowl`      | `config`, `item:<id>` | [KitchenOwl connection and links](kitchenowl.md#links)            | 2026-11-22 |

A space on this device only holds the same records before sync is set
up, so sharing later needs no conversion. A collection is shared: a
record whose value is not of the shape below is not shown and left
untouched, and a value keeps fields this app does not know.

# Entry

Moved on 2026-11-24 to the shared list package, because Culina writes
entries too: [the entry](../../../packages/list/docs/entry.md) (fields, origins, what counts as
an entry). The fields are unchanged. Emptio's code reads it from
`@nexumia-de/list` (`Entry`, `LIST`, `entriesOf`, `isEntryValue`).

# Category

The starting categories ([categories](categories.md)) are data of the
app with fixed ids and are not stored. A record exists only for what
the household changed:

| Field    | Type           | Meaning                                            |
| -------- | -------------- | -------------------------------------------------- |
| `name`   | text, optional | The household's name; for an own category required |
| `hidden` | true, optional | A starting category the household does not use     |

An own category has an id made by the app. `other` cannot be hidden.

# Store

Built in Goal 3 ([store layouts](store-layouts.md)); the fields are
fixed here so that entries can point at stores.

| Field         | Type                 | Meaning                                                         |
| ------------- | -------------------- | --------------------------------------------------------------- |
| `name`        | text                 | "Rewe Hauptstraße"                                              |
| `chain`       | text, optional       | `rewe`, `aldi`, `rossmann`; absent for any other store          |
| `route`       | list of category ids | The order of the way through the store                          |
| `routeEdited` | boolean              | True once a person moved a category; the app then only proposes |
| `carries`     | list of category ids | What the store sells; `other` always counts as carried          |

# Derived, never stored

The order of the list at home and in a store, what a store hides and
how many entries that are, the category proposed for a new entry, route
proposals, and entries raised by an offer.

# Merging and its limits

Records merge by materia's rules: per key the later `updatedAt` wins.

- Two people adding entries offline keep both; the same thing added
  twice gives two entries until one device sees both. The app may then
  offer to join them ([rule 5](../../../packages/list/docs/rules.md#5-twice-the-same)).
- Two people changing the same entry offline: the later write wins as a
  whole. One ticking while the other edits the note loses one of the
  two. Accepted, because an entry is small and short-lived.
- A ticked entry removed on one device and un-ticked on another: the
  later write wins.

[^materia-sync]: materia, docs/sync.md, ../../../packages/model/docs/sync.md
