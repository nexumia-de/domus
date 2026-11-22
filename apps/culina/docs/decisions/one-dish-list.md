---
type: Decision Record
title: One list of dishes, whatever their origin
description: Decided by the owner on 2026-11-21. The shipped dishes and the user's own dishes become one list with one entry, one filter (origin, character, course, cuisine, without meat and fish, only with every amount) and one dish and cook screen; the origin follows from where a dish lives and is not stored; shipped dishes stay in their own file, read-only, and are copied to change; rejected were a stored flag in the user's store and two tabs with the same filters; what stays open for "what do I feel like".
tags: [decision, scope, dishes, classics, finder, characters, filter]
generated: { by: claude-code, at: 2026-11-21 }
sources:
  - id: characters
    title: 'Dish characters computed from the recipe (analysis and what was built)'
    url: ../dish-characters.md
  - id: mentor
    title: 'Decision: a scripted kitchen helper; known dishes ship by country'
    url: mentor.md
  - id: book
    title: 'Decision: your own recipe book and a finder from what is there'
    url: recipe-book.md
  - id: base
    title: 'The base of commit 82f45dc: `packages/app/src/browse/`, `src/screens/dish-filter.ts`'
---

# One list of dishes, whatever their origin

**Status: decided by the owner on 2026-11-21.** The base is built (commit
82f45dc). The screens are being built on 2026-11-21 by several agents in
parallel; this record says what was decided, not what is finished. The
state of each part is in [behaviour](../behaviour.md#one-filter-over-every-dish)
and the [log](../log.md).

## Context

Until 2026-11-21 the app had two worlds of dishes.

- **The shipped dishes**: 48 classics, 12 each from Germany, Italy, France
  and Spain ([selection](../classic-selection.md)), after the
  [helper decision](mentor.md)[^mentor]. They had their own lists by
  country, their own dish screen (`#/classic/<id>`), their own cook screen,
  a start screen that offered "Classics by country", and their own section
  in "What can I cook" with filters of their own (country, meat and fish).
- **The user's own dishes** in the notebook: their own list with a
  character filter, their own dish and cook screens, the swap of a filling
  and the random pick.

Every way of narrowing a list had to be built twice. The character filter
existed on the Dishes list and not for the classics in Cook; "Country" and
"Meat and fish" in Cook applied to the classics only
([behaviour](../behaviour.md#cook)). The [analysis of
characters](../dish-characters.md)[^characters] had left "the filter in Cook
and in the random pick" open for that reason.

Asked on 2026-11-21, the owner said that the classics were only a test.
The question the app must answer is "what do I cook, what do I feel
like?". The origin of a dish is not part of that question; it is at most
one choice among others.

## Decision

1. **One list of dishes, whatever the origin.** The lists show the user's
   own dishes and the shipped dishes together. "Mine" and "shipped" are
   values of a filter, not two parts of the app.
2. **One entry type.** Every dish is a `DishEntry`
   (`packages/app/src/browse/entry.ts`): key, origin, id, name, link,
   course, cuisine, whether it is without meat and fish, its characters,
   and whether every line has an amount.
3. **One filter.** `DishFilter` (`src/browse/filter.ts`) with origin,
   character, course, cuisine, "Without meat and fish" and "Only with
   every amount given". Each choice only drops entries. It is used by the
   lists, the start screen, the finder ("What can I cook") and the random
   pick. It is stored once, in `localStorage` under `culina.dishes`, so a
   choice made on one screen holds on the others. The controls are one
   function, `dishFilterControls` (`src/screens/dish-filter.ts`).
4. **One dish screen and one cook screen** for both origins. Where a
   shipped dish has more to show (the source, the original name, the
   check), the one screen shows it; where it has less (no versions, no
   tasting notes), the one screen leaves that out.
5. **Own dishes get course and cuisine**, the two fields the shipped
   dishes already have. They are set by hand, because neither can be
   computed (the analysis, "Not computable").
6. **The origin is not stored.** It follows from where a dish lives: in
   the shipped file it is `shipped`, in the user's store it is `own`. This
   is the same rule as for characters, which are computed when a dish is
   shown and never stored ([behaviour](../behaviour.md#characters)).

### State on 2026-11-22

| Part                                       | State                                         |
| ------------------------------------------ | --------------------------------------------- |
| Entry, filter, controls, the stored choice | built (commit 82f45dc, `test/browse.test.ts`) |
| The lists and the start screen             | built (pull request 30)                       |
| The finder with the one filter             | built (pull request 30)                       |
| The random pick with the one filter        | built (pull request 30)                       |
| One dish screen and one cook screen        | built (pull request 30)                       |
| Course and cuisine on own dishes           | built (pull request 30)                       |
| The dish lines linked to the catalogue     | built (pull request 30)                       |
| The native Linux app                       | built (pull request 30)                       |

All parts were merged with pull request 30 of suitably/domus on
2026-11-21; the table said "being built" until the triage of 2026-11-22
read the code. An own dish that states no course or cuisine is not kept
by a choice of either.

## Rejected

### The shipped dishes written into the user's store with a stored flag

The obvious way to one list is one store: copy the 48 into the user's
dishes and mark each with `shipped: true`. Rejected for three reasons.

- **Updates would meet the user's data.** Shipped content changes: the
  steps of all 48 were put on the kit on 2026-11-20, French licences were
  corrected on 2026-11-21 ([log](../log.md)). In the store, each such
  change would have to be reconciled with records the user may have
  edited, by a migration that knows which field is whose. In the shipped
  file a new release simply replaces the old.
- **Export and sync would carry dishes that are not the user's.** The
  export file and the planned library sync ([sync](sync.md)) carry the
  user's records. With the classics in the store, every export and every
  shared library would carry 48 dishes the user never wrote, and an import
  on another device would meet its own copy of the same dishes.
- **The source format does not fit the stored shape.** A shipped dish
  keeps its amounts in the units of its source (Pfund, cucchiaiata), its
  names and steps in two languages, the persons the source states, the
  values settled by us and the record of the second check
  ([classic format](../classic-format.md)). A stored dish has one
  language and amounts per portion in the engine's units. Writing a
  classic into the store loses what the format exists to keep; widening
  the stored dish to hold it burdens every own dish.

### Two tabs with the same filters

Keeping "Mine" and "Shipped" as two tabs, each with the same controls,
was rejected. The filter would still be shown twice, the user would ask
the question twice, and a dish that fits would be on the other tab. The
owner's question does not start from the origin.

## What stays

- **The shipped file format** ([classic format](../classic-format.md)):
  source units, two languages, the check record. Nothing in it changes for
  this decision.
- **Shipped dishes are read-only.** The app never writes them to the store.
- **"Keep in my notebook"** stays the way to change a shipped dish: the
  engine copies it as version 1 of an own dish (`copyClassic`,
  `src/classics/keep.ts`), and the copy is then the user's, with its own
  origin `own`.
- **The shipped collection is replaceable content.** The app works with
  zero shipped dishes: a missing or unfitting file leaves the shipped part
  of the list empty (`src/classics/content.ts`). The 48 can be thinned or
  replaced without touching the app. The rules for their sources stay
  ([helper](mentor.md), [licence](sources-licence.md)).
- **Country stays a fact of a shipped dish.** It is shown as its cuisine
  and filtered as one; the lists by country give way to that filter.

## Consequences and open points

- **"Quick" and effort.** Not in the filter. The model has no total time:
  27 of the 447 steps of the shipped dishes carry a time
  ([data model](../data-model.md#steps)), and nothing says how long a dish
  takes in all. What it would need is in the
  [plan for "what do I feel like"](../feel-like-plan.md).
- **Heat, sourness and other taste effects.** No data; not in the filter.
- **Favourites and "not cooked for long".** Both need state the app does
  not keep: which dish the user likes, and when it was last cooked. A date
  of cooking per dish comes close to the rule "no meal plans and no food
  diary" in [AGENTS.md](../../AGENTS.md). Whether such state may be kept,
  and in which form, is the owner's to decide; nothing is built for it.
- **The user's correction of a character.** Built on 2026-11-22
  ([behaviour](../behaviour.md#characters)): the one stored field of
  characters (`characters: { add, remove }` on a dish). A shipped dish
  cannot be corrected without a copy, because it is read-only.
- **The library sync.** Own dishes do not sync yet
  ([roadmap](../roadmap.md), goal 6). The one list does not change that:
  shipped dishes need no sync, since every device has the same file.
- **The decisions before.** The [helper decision](mentor.md) said known
  dishes ship "by country", and its stage "Follow" starts from a classic;
  the [recipe book decision](recipe-book.md) built the finder over own
  dishes. Both keep their content; each has a dated note that points here
  for what this record changes.

[^mentor]: [Decision: the helper](mentor.md), point 5.

[^characters]: [Dish characters computed from the recipe](../dish-characters.md).
