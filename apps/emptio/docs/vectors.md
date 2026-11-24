---
type: Specification
title: Test vector format
description: JSON shape of the engine's worked examples, its three kinds (home-order, category-order, suggest) with their input and expected fields, and how the files are checked; the kinds of rules 4 and 5 are in the shared list package since 2026-11-24.
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

| Kind             | Rule | `input`                                      | `expected`                |
| ---------------- | ---- | -------------------------------------------- | ------------------------- |
| `home-order`     | 1    | `entries` (id and entry), `categoryOrder`    | `order`: the entry ids    |
| `category-order` |      | `starting` ids, `changes` (id, name, hidden) | `order`: the category ids |
| `suggest`        |      | `query`, `earlier` entries, optional `limit` | `suggestions`             |

Entries in vectors carry only the fields the rule reads; an entry is
written as `{ "id": "...", ...fields of the [entry](../../../packages/list/docs/entry.md) }`.

`test/vectors.test.ts` runs the function of each kind on `input` and
compares with `expected`, and checks that no function changes its
input.

The vectors today: two per kind, six files. The kinds
`new-entry-category` (rule 4, ten files) and `add-entry` (rule 5, two
files) moved with their rules to the shared list package on 2026-11-24,
in the same format ([its vectors](../../../packages/list/docs/vectors.md)).
