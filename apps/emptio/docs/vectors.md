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

Entries in vectors carry only the fields the rule reads; an entry is
written as `{ "id": "...", ...fields of the [data model](data-model.md#entry) }`.

Until the functions exist (issue 12), `test/vectors.test.ts` checks
only that every file has a known kind, a title, an input and an
expected value. With issue 12 each kind gets a test that runs the
function on `input` and compares with `expected`.

The vectors today: two per kind, six files.
