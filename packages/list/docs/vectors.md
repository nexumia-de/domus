---
type: Specification
title: Test vector format
description: JSON shape of the worked examples of the list package, its two kinds (new-entry-category, add-entry) with their input and expected fields, and how the files are run. Moved from Emptio with the two rules on 2026-11-24.
tags: [vectors, tests, list]
generated: { by: claude-code, at: 2026-11-24 }
---

# Test vector format

A vector is one JSON file in `vectors/<kind>/`: a worked example of one
[rule](rules.md), computed by hand. Examples may name foods and shops;
rules may not. The format is Emptio's
([vector format](../../../apps/emptio/docs/vectors.md)), where the other
kinds are.

```json
{
  "kind": "add-entry",
  "title": "What the example shows, in one sentence",
  "input": {},
  "expected": {}
}
```

| Kind                 | Rule | `input`                                         | `expected`                               |
| -------------------- | ---- | ----------------------------------------------- | ---------------------------------------- |
| `new-entry-category` | 4    | `name`, optional `catalogue`, `earlier` entries | `categoryId`                             |
| `add-entry`          | 5    | `entries`, `add` (id and entry)                 | `entries` after adding, and `joinedWith` |

Entries in vectors carry only the fields the rule reads; an entry is
written as `{ "id": "...", ...fields of the [entry](entry.md) }`.

`test/vectors.test.ts` runs the function of each kind on `input` and
compares with `expected`, and checks that no function changes its
input. Today: ten files of `new-entry-category`, two of `add-entry`.
`planAdd` and `planAdds` have unit tests (`test/plan-add.test.ts`), not
vectors: they read records and take a clock and ids.
