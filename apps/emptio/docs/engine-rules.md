---
type: Specification
title: Engine rules
description: The rules of the shopping list as pure functions - the sort key of a name, order at home, order in a store, what a store hides, the category of a new entry, adding what is already there - stated exactly, and the rules of later goals (route proposal, hand-over, offers) in outline.
tags: [engine, rules, order, priority, categories, stores]
generated: { by: claude-code/2.1.327, at: 2026-11-18 }
---

# Engine rules

Every rule is a pure function of `packages/engine`, reached through
`src/index.ts`, with worked examples in `packages/engine/vectors/`
([vector format](vectors.md)). Time and ids come in as input. The
entities are in the [data model](data-model.md).

Rules 1, 4 and 5 are built in Goal 1 and have vectors today; 2 and 3
are stated exactly and built in Goal 3; 6 to 8 are outlines that are
completed when their goal starts.

# The sort key of a name

Names are compared by a key, so that "Äpfel" stands with "Apfel" and
the result is the same on every device: the name in Unicode form NFD
with combining marks removed, `ß` as `ss`, lower case, spaces at the
ends removed and runs of spaces as one. Keys are compared by code
units. No locale of the device is used.

# 1. Order at home

Input: entries and the order of the categories (the starting order,
own categories after it by the sort key of their name).

1. Open entries come first, sorted by: priority (`now`, `soon`,
   `sometime`); position of the category (a category that is not in the
   order counts as `other`); sort key of the name; id.
2. Bought entries follow, the latest `bought.at` first, then id.

# 2. Order in a store

Input: entries, a store, the order of the categories.

Only open entries that are not [hidden](#3-hidden-in-a-store), sorted
by: position of the category in the store's `route` (categories not in
the route after it, in the home order of categories); priority; sort
key of the name; id.

# 3. Hidden in a store

An open entry is hidden in a store when its category is not in the
store's `carries` and is not `other`, or when the store's id is in the
entry's `notAt`. The result names the hidden entries, so the app can
show their count.

# 4. Category of a new entry

Input: the name, the catalogue's match for it if any (an ingredient id
with a category), and the household's earlier entries.

1. If an earlier entry has the same ingredient id, or no ingredient id
   and the same sort key, the category of the latest such entry (by
   `addedAt`). The household's choice wins over the catalogue.
2. Otherwise the category the catalogue gives the ingredient.
3. Otherwise `other`.

# 5. Twice the same

Adding an entry when an open entry is the same thing does not make a
second one. Two entries are the same thing when both have the same
ingredient id, or neither has one and their names have the same sort
key. A bought entry never counts; adding again makes a new entry.

The open entry is kept with:

- the more pressing of the two priorities;
- the amounts: if only one has an amount, that one; if both have the
  same text, that text; otherwise both joined as `<old> + <new>`
  (amounts are free text, so nothing is added up);
- the notes by the same rule as the amounts;
- the origins of both, each kind and title once, the old ones first;
- its own id, name, category, `addedAt` and `notAt`.

# 6. Route proposal

Outline (Goal 3). From the entries ticked in one store in one visit, in
the order of `bought.at`: where the categories of two entries were
visited in the opposite order to the route, propose to move the later
category. A route with `routeEdited` is only proposed to. To settle:
how many visits must agree, and how single stray ticks are ignored.

# 7. Hand-over

Outline (Goal 4). In: the missing ingredients of a recipe become
entries with a `recipe` origin, each through rules 4 and 5. Out: bought
entries with an ingredient id become proposed stock records of the
place. To settle: the format of the link between the apps.

# 8. Raised by an offer

Outline (Goal 6). Where the household switched this on, an open entry
at `soon` or `sometime` that matches an offer of the store one is in
is treated as `now` in [rule 2](#2-order-in-a-store) and marked with
the offer; the stored priority does not change. To settle: how an offer
is matched to an entry.
