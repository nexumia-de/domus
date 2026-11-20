---
type: Specification
title: Test vector format
description: JSON shape of the engine's worked examples, the three kinds that exist (home-order, new-entry-category, add-entry) with their input and expected fields, and how the files are checked before the functions exist.
tags: [vectors, tests, engine]
generated: { by: claude-code/2.1.327, at: 2026-11-18 }
---

# Test vector format

A vector is one JSON file in `packages/engine/vectors/<kind>/`: a
worked example of one [engine rule](engine-rules.md), computed by hand.
Examples may name foods and shops; rules may not.

```json
{
  "kind": "home-order",
  "title": "What the example shows, in one sentence",
  "input": {},
  "expected": {}
}
```

| Kind                 | Rule | `input`                                         | `expected`                               |
| -------------------- | ---- | ----------------------------------------------- | ---------------------------------------- |
| `home-order`         | 1    | `entries` (id and entry), `categoryOrder`       | `order`: the entry ids                   |
| `new-entry-category` | 4    | `name`, optional `catalogue`, `earlier` entries | `categoryId`                             |
| `add-entry`          | 5    | `entries`, `add` (id and entry)                 | `entries` after adding, and `joinedWith` |
| `category-order`     |      | `starting` ids, `changes` (id, name, hidden)    | `order`: the category ids                |
| `suggest`            |      | `query`, `earlier` entries, optional `limit`    | `suggestions`                            |

Entries in vectors carry only the fields the rule reads; an entry is
written as `{ "id": "...", ...fields of the [data model](data-model.md#entry) }`.

`test/vectors.test.ts` runs the function of each kind on `input` and
compares with `expected`, and checks that no function changes its
input.

The vectors today: two per kind, ten files.
